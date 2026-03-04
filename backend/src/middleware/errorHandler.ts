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
import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the full error server-side (never sent to client)
  logger.error({
    err,
    message: err.message,
    stack: err.stack,
  }, 'Unhandled error');

  // Known operational errors (AppError) — safe to expose message
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // HTTP errors from body-parser / middleware (e.g. PayloadTooLargeError)
  // These have a `status` or `statusCode` property set by the middleware itself.
  const httpErr = err as Error & { status?: number; statusCode?: number; expose?: boolean };
  if (httpErr.status && httpErr.status >= 400 && httpErr.status < 500) {
    res.status(httpErr.status).json({
      error: err.message,
      code: 'REQUEST_ERROR',
    });
    return;
  }

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
