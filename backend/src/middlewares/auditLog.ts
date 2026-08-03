import { NextFunction, Request, Response } from 'express';
import prisma from '../config/db';
import { logger } from '../utils/logger';

/**
 * Records an admin/user action to the audit_logs table. Fire-and-forget:
 * failures here must never block the actual request.
 */
export function recordAudit(action: string, entityType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        prisma.auditLog
          .create({
            data: {
              actorId: req.user?.id,
              action,
              entityType,
              entityId: req.params.id,
              metadata: { body: req.body, query: req.query },
              ipAddress: req.ip,
            },
          })
          .catch((err: Error) => logger.error(`Audit log failed: ${err.message}`));
      }
    });
    next();
  };
}
