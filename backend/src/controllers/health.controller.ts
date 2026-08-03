import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import prisma from '../config/db';
import redis from '../config/redis';

export const healthCheck = catchAsync(async (_req: Request, res: Response) => {
  const checks: Record<string, string> = { server: 'ok' };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'down';
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'down';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? 'Service is healthy' : 'Service degraded',
    data: { checks, timestamp: new Date().toISOString(), uptime: process.uptime() },
  });
});
