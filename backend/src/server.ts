import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import prisma from './config/db';
import redis from './config/redis';

const server = app.listen(env.PORT, () => {
  logger.info(`Guchhi API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`Swagger docs available at http://localhost:${env.PORT}/api-docs`);
});

// Guards against slow-client / slowloris-style connections tying up server
// resources indefinitely. headersTimeout must exceed requestTimeout per
// Node's docs, or legitimate slow-but-valid requests get cut off first.
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 65_000;

async function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    logger.info('Shutdown complete.');
    process.exit(0);
  });
  // Force exit if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack || err.message}`);
  process.exit(1);
});
