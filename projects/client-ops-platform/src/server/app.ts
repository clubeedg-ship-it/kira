import express from 'express';
import cors from 'cors';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { organizationsRouter } from './routes/organizations';
import { brandingRouter } from './routes/branding';
import { servicesRouter } from './routes/services';
import { activityRouter } from './routes/activity';
import { supportRouter } from './routes/support';
import { deploymentsRouter } from './routes/deployments';
import { integrationsRouter } from './routes/integrations';
import { backupsRouter } from './routes/backups';
import { auditRouter } from './routes/audit';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth required for all /orgs routes
  app.use('/orgs', authMiddleware);

  // Mount org-scoped routes
  app.use('/orgs', organizationsRouter);
  app.use('/orgs', brandingRouter);
  app.use('/orgs', servicesRouter);
  app.use('/orgs', activityRouter);
  app.use('/orgs', supportRouter);
  app.use('/orgs', deploymentsRouter);
  app.use('/orgs', integrationsRouter);
  app.use('/orgs', backupsRouter);
  app.use('/orgs', auditRouter);

  // Serve frontend in production
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const clientDir = resolve(currentDir, '../../dist/client');
  if (existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(join(clientDir, 'index.html'));
    });
  }

  // Global error handler
  app.use(errorHandler);

  return app;
}
