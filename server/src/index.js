import app from './app.js';
import { env } from './config/env.js';
import { logger } from './middlewares/logger.js';
import { prisma } from './config/prisma.js';
import { warmupOrderCaches } from './routes/orders.js';

const server = app.listen(env.PORT, async () => {
  try {
    await prisma.$connect();
    logger.info(`Server running on http://localhost:${env.PORT}`);
    logger.info(`Database connected successfully at ${env.DATABASE_URL}`);
    await warmupOrderCaches();
    logger.info('Order counter and product cache pre-warmed for instant response times');
  } catch (err) {
    logger.error('Database connection failed on startup:', err);
  }
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('HTTP server closed and Prisma disconnected');
  });
});

