import { Queue, type ConnectionOptions } from 'bullmq';

export interface AgentWorkJobData {
  userId: string;
  agentId: string;
  taskId: string;
}

export type HeartbeatCheckType = 'full' | 'quick';

export interface HeartbeatJobData {
  userId: string;
  checkType: HeartbeatCheckType;
}

export const AGENT_WORK_QUEUE_NAME = 'agent-work';
export const HEARTBEAT_QUEUE_NAME = 'heartbeat';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

function parseRedisConnectionOptions(connectionUrl: string): ConnectionOptions {
  try {
    const parsed = new URL(connectionUrl);
    const db = Number(parsed.pathname.replace('/', '') || 0);

    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: Number.isFinite(db) ? db : 0,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times: number) => Math.min(times * 500, 30_000),
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 6379,
      db: 0,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times: number) => Math.min(times * 500, 30_000),
    };
  }
}

const queueConnection = parseRedisConnectionOptions(REDIS_URL);

export const agentWorkQueue = new Queue<AgentWorkJobData, unknown, string>(AGENT_WORK_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 1_000,
    removeOnFail: 1_000,
  },
});

export const heartbeatQueue = new Queue<HeartbeatJobData, unknown, string>(HEARTBEAT_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 1_000,
    removeOnFail: 1_000,
  },
});

export function createRedisConnection(): ConnectionOptions {
  return parseRedisConnectionOptions(REDIS_URL);
}

export function buildAgentWorkJobId(userId: string, taskId: string): string {
  return `${userId}__${taskId}`;
}
