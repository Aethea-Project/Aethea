import { RequestHandler, Request, Response, NextFunction } from 'express';
import { requireLocalUser } from '../lib/authMiddleware.js';

/**
 * Optional Auth Middleware
 * 
 * If a token is provided in the Authorization header, it attempts to authenticate
 * the user and attach `req.localUser`. If the token is invalid or missing, it 
 * simply proceeds without throwing an error, allowing guest access.
 */
export const createOptionalAuth = (baseAuth: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    // If no authorization header is present, proceed as guest
    if (!req.headers.authorization) {
      return next();
    }

    // Try to run base auth (JWT validation)
    baseAuth(req, res, (err) => {
      // If JWT fails, just proceed as guest (do not throw 401)
      if (err) return next();

      // If JWT succeeds, fetch the local user and attach to req.localUser
      requireLocalUser(req, res, (err2) => {
        // If requireLocalUser fails (e.g. user deleted), proceed as guest
        if (err2) return next();
        
        next();
      });
    });
  };
};
