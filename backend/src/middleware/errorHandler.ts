/**
 * Centralized Error Handling Middleware
 *
 * Source: OWASP REST Security — Error Handling
 *   "Respond with generic error messages — avoid revealing details of the failure unnecessarily.
 *    Do not pass technical details (e.g. call stacks or other internal hints) to the client."
 * Source: Express.js Security Best Practices
 *   "Write your own error handler."
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';
import { sendErrorAlert } from '../services/emailService.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const httpErr = err as Error & { status?: number; statusCode?: number; expose?: boolean };
  const httpStatus = httpErr.status ?? httpErr.statusCode;
  const isExpectedClientError =
    (err instanceof AppError && err.isOperational && err.statusCode < 500) ||
    Boolean(httpStatus && httpStatus >= 400 && httpStatus < 500);
  const isOperationalServerError = err instanceof AppError && err.isOperational;

  // Log the full error server-side (never sent to client)
  const logPayload = {
    err,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  };
  if (isExpectedClientError || isOperationalServerError) {
    logger.debug(logPayload, 'Handled operational error');
  } else {
    logger.error(logPayload, 'Unhandled error');
  }

  // Known operational errors (AppError) — safe to expose message
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Intercept Prisma database errors. The guard keeps Jest's lightweight Prisma
  // mock from turning unrelated errors into 500s during tests.
  const KnownPrismaRequestError = Prisma.PrismaClientKnownRequestError;
  if (typeof KnownPrismaRequestError === 'function' && err instanceof KnownPrismaRequestError) {
    if (err.code === 'P2002') {
      const targetStr = Array.isArray(err.meta?.target) 
        ? err.meta.target.join(',') 
        : String(err.meta?.target || '');

      if (targetStr.includes('slotIndex') || targetStr.includes('doctorScheduleId') || targetStr.includes('startAt')) {
        res.status(409).json({
          error: 'This slot was just booked by another patient. Please select another time.',
          code: 'SLOT_COLLISION',
        });
        return;
      }

      res.status(409).json({
        error: 'A resource with this identifier already exists.',
        code: 'UNIQUE_CONSTRAINT_FAILED',
      });
      return;
    }
    if (err.code === 'P2024') {
      res.status(503).json({
        error: 'Database connection pool busy. Please try again.',
        code: 'DATABASE_POOL_TIMEOUT',
      });
      return;
    }
    if (err.code === 'P2028') {
      res.status(504).json({
        error: 'Database transaction timed out.',
        code: 'DATABASE_TRANSACTION_TIMEOUT',
      });
      return;
    }
    if (err.code === 'P2010' && err.message?.includes('57014')) {
      res.status(504).json({
        error: 'Database query execution timed out.',
        code: 'DATABASE_QUERY_TIMEOUT',
      });
      return;
    }
  }

  // HTTP errors from body-parser / middleware (e.g. PayloadTooLargeError)
  // These have a `status` or `statusCode` property set by the middleware itself.
  if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
    res.status(httpStatus).json({
      error: err.message,
      code: 'REQUEST_ERROR',
    });
    return;
  }

  // Notify admin via email for unexpected 500 errors only.
  void sendErrorAlert(err, `${req.method} ${req.url}`).catch(e => {
    logger.error({ e }, 'Failed to send error email alert');
  });

  // Unknown errors — NEVER leak details to client (OWASP)
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

/**
 * 404 handler — must be registered AFTER all routes
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
  });
};
