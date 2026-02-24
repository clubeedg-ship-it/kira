import { db } from '../../db/index';
import { users } from '../../db/schema';
import {
  heartbeatQueue,
  type HeartbeatCheckType,
  type HeartbeatJobData,
} from './queue';

type SchedulerSlot = 'quick-day' | 'quick-night' | 'full-morning' | 'full-evening';

interface SchedulerDefinition {
  slot: SchedulerSlot;
  pattern: string;
  checkType: HeartbeatCheckType;
}

const HEARTBEAT_SCHEDULES: SchedulerDefinition[] = [
  {
    slot: 'quick-day',
    pattern: '*/15 6-21 * * *',
    checkType: 'quick',
  },
  {
    slot: 'quick-night',
    pattern: '0 0-5,22-23 * * *',
    checkType: 'quick',
  },
  {
    slot: 'full-morning',
    pattern: '30 6 * * *',
    checkType: 'full',
  },
  {
    slot: 'full-evening',
    pattern: '30 20 * * *',
    checkType: 'full',
  },
];

function buildSchedulerId(userId: string, slot: SchedulerSlot): string {
  return `heartbeat:${userId}:${slot}`;
}

function buildHeartbeatPayload(userId: string, checkType: HeartbeatCheckType): HeartbeatJobData {
  return {
    userId,
    checkType,
  };
}

export async function scheduleUserHeartbeat(userId: string): Promise<void> {
  await Promise.all(
    HEARTBEAT_SCHEDULES.map((schedule) =>
      heartbeatQueue.upsertJobScheduler(
        buildSchedulerId(userId, schedule.slot),
        {
          pattern: schedule.pattern,
        },
        {
          name: 'heartbeat',
          data: buildHeartbeatPayload(userId, schedule.checkType),
          opts: {
            attempts: 1,
            removeOnComplete: 1_000,
            removeOnFail: 1_000,
          },
        },
      ),
    ),
  );
}

export async function removeUserHeartbeat(userId: string): Promise<void> {
  await Promise.all(
    HEARTBEAT_SCHEDULES.map((schedule) =>
      heartbeatQueue.removeJobScheduler(buildSchedulerId(userId, schedule.slot)),
    ),
  );
}

export async function scheduleAllUserHeartbeats(): Promise<number> {
  const userRows = await db.select({ id: users.id }).from(users);

  await Promise.all(userRows.map((row) => scheduleUserHeartbeat(row.id)));
  return userRows.length;
}
