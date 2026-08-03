import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { isProd } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Prisma known errors -> friendly messages
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = `Duplicate value for field(s): ${(err.meta?.target as string[])?.join(', ') || 'unique field'}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested record was not found';
    } else if (err.code === 'P2003') {
      statusCode = 400;
      message = 'Invalid reference to a related record';
    } else {
      statusCode = 400;
      message = 'Database request error';
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  if (!err.isOperational && statusCode === 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${err.stack || err.message}`);
    // The stack is already hidden below in prod, but the raw `message` on an
    // unexpected error (a DB connection string, a third-party SDK error,
    // etc.) can itself leak internals. Generalize it once it's logged.
    if (isProd) {
      message = 'Something went wrong. Please try again later.';
    }
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(isProd ? {} : { stack: err.stack }),
  });
}
