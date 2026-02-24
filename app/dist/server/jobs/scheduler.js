import { db } from '../../db/index';
import { users } from '../../db/schema';
import { heartbeatQueue, } from './queue';
const HEARTBEAT_SCHEDULES = [
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
function buildSchedulerId(userId, slot) {
    return `heartbeat:${userId}:${slot}`;
}
function buildHeartbeatPayload(userId, checkType) {
    return {
        userId,
        checkType,
    };
}
export async function scheduleUserHeartbeat(userId) {
    await Promise.all(HEARTBEAT_SCHEDULES.map((schedule) => heartbeatQueue.upsertJobScheduler(buildSchedulerId(userId, schedule.slot), {
        pattern: schedule.pattern,
    }, {
        name: 'heartbeat',
        data: buildHeartbeatPayload(userId, schedule.checkType),
        opts: {
            attempts: 1,
            removeOnComplete: 1_000,
            removeOnFail: 1_000,
        },
    })));
}
export async function removeUserHeartbeat(userId) {
    await Promise.all(HEARTBEAT_SCHEDULES.map((schedule) => heartbeatQueue.removeJobScheduler(buildSchedulerId(userId, schedule.slot))));
}
export async function scheduleAllUserHeartbeats() {
    const userRows = await db.select({ id: users.id }).from(users);
    await Promise.all(userRows.map((row) => scheduleUserHeartbeat(row.id)));
    return userRows.length;
}
//# sourceMappingURL=scheduler.js.map