import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';
import prisma from '../config/db';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        email: string;
      };
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.substring(7);
  }
  return null;
}

/** Requires a valid access token. Rejects the request if absent/invalid. */
export const authenticate = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw ApiError.unauthorized('Invalid session');

    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
});

/** Attaches req.user if a valid token is present, but never rejects. Used for guest-compatible routes (e.g. cart). */
export const optionalAuth = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && user.isActive) {
      req.user = { id: user.id, role: user.role, email: user.email };
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

/** Role-based access control. Usage: authorize('ADMIN', 'SUPER_ADMIN') */
export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
};

export const isAdminRole = (role: Role) =>
  role === Role.ADMIN || role === Role.SUPER_ADMIN;
