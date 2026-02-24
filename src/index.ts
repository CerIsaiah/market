import express from 'express';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { sheetsClient } from './sheets/sheetsClient.js';
import webhookRoutes from './routes/webhooks.js';
import reviewRoutes from './routes/review.js';
import jobsRoutes from './routes/jobs.js';
import { startSchedulers } from './services/schedulerService.js';

async function main(): Promise<void> {
  await sheetsClient.ensureWorkbookStructure();

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'smoothrizz-marketing-automation' });
  });

  app.use('/webhooks', webhookRoutes);
  app.use('/review', reviewRoutes);
  app.use('/jobs', jobsRoutes);

  app.listen(config.port, () => {
    logger.info('Server started', { port: config.port });
  });

  startSchedulers();
}

main().catch((error) => {
  logger.error('Fatal startup error', { error });
  process.exit(1);
});
