import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

import { pool } from '../db/index';
import { runMigrations } from '../db/migrate';
import { requireAuth } from './middleware/auth';
import { apiLimiter } from './middleware/rate-limit';
import { apiV1Router } from './routes';
import { registerSseRoute } from './events/sse';
import { seedSkills } from './seed-skills';

const isSingleTenant = process.env.SINGLE_TENANT === 'true';

const app = express();
const port = Number(process.env.PORT || 3847);

const coreTableNames = [
  'users',
  'vision',
  'areas',
  'objectives',
  'key_results',
  'projects',
  'milestones',
  'tasks',
  'dependencies',
  'agents',
  'agent_work_log',
  'input_queue',
  'time_blocks',
  'reviews',
  'principles',
  'decisions',
] as const;

app.set('trust proxy', 1);
app.use(cors());

if (!isSingleTenant) {
  // Auth routes only in multi-tenant mode
  const { toNodeHandler } = await import('better-auth/node');
  const { auth } = await import('./auth');
  const { loginLimiter, signupLimiter } = await import('./middleware/rate-limit');
  const authHandler = toNodeHandler(auth);

  app.use('/api/v1/auth/sign-in', loginLimiter);
  app.use('/api/v1/auth/sign-up', signupLimiter);
  app.all('/api/v1/auth', (req, res, next) => {
    void authHandler(req, res).catch(next);
  });
  app.all('/api/v1/auth/*', (req, res, next) => {
    void authHandler(req, res).catch(next);
  });
}

app.use(express.json());

// Config endpoint for client to detect single-tenant mode
app.get('/api/v1/config', (_req, res) => {
  res.json({ singleTenant: isSingleTenant });
});

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query<{ count: string }>(
      `
        SELECT count(*)::int AS count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
      `,
      [coreTableNames],
    );

    res.json({
      status: 'ok',
      tables: Number(result.rows[0]?.count ?? 0),
      singleTenant: isSingleTenant,
    });
  } catch (error) {
    console.error('Health check failed.', error);
    res.status(500).json({ status: 'error', tables: 0 });
  }
});

app.use('/api/v1', requireAuth);
registerSseRoute(app);
app.use('/api/v1', apiLimiter);
app.use('/api/v1', apiV1Router);

async function startServer() {
  await runMigrations();

  // S3 is optional in single-tenant mode
  try {
    const { ensureS3Bucket } = await import('./lib/s3');
    await ensureS3Bucket();
  } catch (e) {
    console.warn('S3 setup skipped (not configured or unavailable):', (e as Error).message);
  }

  await seedSkills();

  app.listen(port, () => {
    console.log(`Server listening on port ${port} (single-tenant: ${isSingleTenant})`);
  });
}

void startServer().catch((error) => {
  console.error('Server startup failed.', error);
  process.exit(1);
});
