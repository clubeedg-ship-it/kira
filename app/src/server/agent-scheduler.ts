import { Queue } from 'bullmq';
import { eq, and, isNotNull } from 'drizzle-orm';

import { db } from '../db/index';
import { userAgents } from '../db/schema';
import { createRedisConnection } from './jobs/queue';

const AGENT_RUNS_QUEUE = 'user-agent-runs';

let agentQueue: Queue | null = null;

function getQueue(): Queue {
  if (!agentQueue) {
    agentQueue = new Queue(AGENT_RUNS_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });
  }
  return agentQueue;
}

export { AGENT_RUNS_QUEUE };

export async function scheduleAgent(agent: {
  id: string;
  userId: string;
  schedule: string | null;
  enabled: boolean;
}): Promise<void> {
  const queue = getQueue();

  // Remove existing repeatable first
  await unscheduleAgent(agent.id);

  if (!agent.enabled || !agent.schedule || agent.schedule === 'on-message') {
    return;
  }

  // Validate it looks like a cron expression (has spaces, not 'on-message')
  if (!agent.schedule.includes(' ')) {
    return;
  }

  await queue.add(
    'run-agent',
    { agentId: agent.id, userId: agent.userId },
    {
      repeat: { pattern: agent.schedule },
      jobId: `user-agent-${agent.id}`,
    },
  );

  console.log(`[agent-scheduler] Scheduled agent ${agent.id} with cron: ${agent.schedule}`);
}

export async function unscheduleAgent(agentId: string): Promise<void> {
  const queue = getQueue();

  try {
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.id === `user-agent-${agentId}` || job.key.includes(`user-agent-${agentId}`)) {
        await queue.removeRepeatableByKey(job.key);
        console.log(`[agent-scheduler] Unscheduled agent ${agentId}`);
      }
    }
  } catch (err: any) {
    console.warn(`[agent-scheduler] Failed to unschedule ${agentId}:`, err.message);
  }
}

export async function runAgentNow(agentId: string, userId: string): Promise<string> {
  const queue = getQueue();
  const job = await queue.add('run-agent', { agentId, userId }, {
    jobId: `user-agent-manual-${agentId}-${Date.now()}`,
  });
  return job.id ?? 'unknown';
}

export async function initializeAgentSchedules(): Promise<number> {
  const agents = await db
    .select({
      id: userAgents.id,
      userId: userAgents.userId,
      schedule: userAgents.schedule,
      enabled: userAgents.enabled,
    })
    .from(userAgents)
    .where(and(eq(userAgents.enabled, true), isNotNull(userAgents.schedule)));

  let count = 0;
  for (const agent of agents) {
    if (agent.schedule && agent.schedule !== 'on-message' && agent.schedule.includes(' ')) {
      await scheduleAgent(agent);
      count++;
    }
  }

  console.log(`[agent-scheduler] Initialized ${count} cron schedule(s)`);
  return count;
}
