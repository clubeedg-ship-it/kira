import dotenv from 'dotenv';
import http from 'http';
import { Worker } from 'bullmq';

import { processAgentWorkJob } from './jobs/agent-work';
import { processHeartbeatJob } from './jobs/heartbeat';
import {
  AGENT_WORK_QUEUE_NAME,
  HEARTBEAT_QUEUE_NAME,
  createRedisConnection,
} from './jobs/queue';
import { scheduleAllUserHeartbeats } from './jobs/scheduler';
import { ensureS3Bucket } from './lib/s3';
import { executeAgent } from './agent-executor';
import { AGENT_RUNS_QUEUE, initializeAgentSchedules } from './agent-scheduler';

dotenv.config();

const WORKER_CONCURRENCY = Number(process.env.AGENT_WORKER_CONCURRENCY ?? 1);
const HEARTBEAT_WORKER_CONCURRENCY = Number(process.env.HEARTBEAT_WORKER_CONCURRENCY ?? 2);
const WORKER_HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 3009);

function normalizeConcurrency(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function registerWorkerEvents(worker: Worker, queueName: string): void {
  worker.on('ready', () => {
    console.log(`[worker] ${queueName} processor ready`);
  });

  worker.on('completed', (job) => {
    console.log(`[worker] completed job ${job.id ?? 'unknown'} (${job.name})`);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `[worker] failed job ${job?.id ?? 'unknown'} (${job?.name ?? queueName}):`,
      error.message,
    );
  });

  worker.on('error', (err) => {
    console.error(`[worker:${queueName}] Worker error:`, err.message);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[worker:${queueName}] Job ${jobId} stalled — will be retried`);
  });
}

async function startWorker() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[worker] ANTHROPIC_API_KEY not set. Agent work will use fallback mode (dev only).');
  }

  await ensureS3Bucket();

  const scheduledUserCount = await scheduleAllUserHeartbeats();
  console.log(`[worker] heartbeat schedules ensured for ${scheduledUserCount} user(s)`);

  const scheduledAgentCount = await initializeAgentSchedules();
  console.log(`[worker] user-agent cron schedules: ${scheduledAgentCount}`);

  const connection = createRedisConnection();
  const agentWorkWorker = new Worker(AGENT_WORK_QUEUE_NAME, processAgentWorkJob, {
    connection,
    concurrency: normalizeConcurrency(WORKER_CONCURRENCY, 1),
  });
  const heartbeatWorker = new Worker(HEARTBEAT_QUEUE_NAME, processHeartbeatJob, {
    connection,
    concurrency: normalizeConcurrency(HEARTBEAT_WORKER_CONCURRENCY, 2),
  });

  const userAgentWorker = new Worker(AGENT_RUNS_QUEUE, async (job) => {
    const { agentId, userId } = job.data as { agentId: string; userId: string };
    await executeAgent(agentId, userId);
  }, {
    connection,
    concurrency: normalizeConcurrency(WORKER_CONCURRENCY, 1),
  });

  registerWorkerEvents(agentWorkWorker, AGENT_WORK_QUEUE_NAME);
  registerWorkerEvents(heartbeatWorker, HEARTBEAT_QUEUE_NAME);
  registerWorkerEvents(userAgentWorker, AGENT_RUNS_QUEUE);

  const shutdown = async () => {
    console.log('[worker] Shutting down workers...');
    await Promise.all([agentWorkWorker.close(), heartbeatWorker.close(), userAgentWorker.close()]);
  };

  // --- Process-level error handlers ---
  process.on('unhandledRejection', (reason) => {
    console.error('[worker] Unhandled rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[worker] Uncaught exception:', err);
    void shutdown().finally(() => process.exit(1));
  });

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0));
  });

  // --- Worker health check endpoint ---
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          workers: {
            agentWork: agentWorkWorker.isRunning(),
            heartbeat: heartbeatWorker.isRunning(),
          },
        }),
      );
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  healthServer.listen(WORKER_HEALTH_PORT, () => {
    console.log(`[worker] Health check listening on port ${WORKER_HEALTH_PORT}`);
  });
}

void startWorker().catch((error) => {
  console.error('Worker startup failed.', error);
  process.exit(1);
});
