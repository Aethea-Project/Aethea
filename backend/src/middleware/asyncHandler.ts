/**
 * Async Handler Wrapper
 * Catches promise rejections in async route handlers and forwards them
 * to Express error-handling middleware.
 *
 * Source: Express.js Production Best Practices — Handle Exceptions Properly
 *   "Use promises … errors will be passed to the error handler as if calling next(err)."
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */

import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
