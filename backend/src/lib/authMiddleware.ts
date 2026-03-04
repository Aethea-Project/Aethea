import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUser, ensureLocalUser } from './authUser.js';
import { AppError } from './AppError.js';
import { getClientIp, isSessionRevoked, upsertUserSession } from './sessionRegistry.js';

/**
 * Middleware that ensures a user is authenticated via Supabase/JWT
 * and has a local record in the Prisma database.
 * 
 * Attaches the validated user object to the request.
 */
export const requireLocalUser = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthenticatedUser(req);
    
    if (!authUser) {
      throw new AppError('Unauthorized - No valid session found', 401);
    }

    // Ensure the Supabase user exists in our local Postgres DB
    const user = await ensureLocalUser(authUser);

    const sessionId = req.user?.sessionId;
    if (sessionId) {
      const rememberMeHeader = req.headers['x-remember-me'];
      const rememberMeValue = Array.isArray(rememberMeHeader) ? rememberMeHeader[0] : rememberMeHeader;
      const rememberMe = typeof rememberMeValue === 'string' && ['1', 'true', 'yes', 'on'].includes(rememberMeValue.toLowerCase());

      const revoked = await isSessionRevoked(user.id, sessionId);
      if (revoked) {
        throw AppError.unauthorized('Session revoked. Please sign in again');
      }

      await upsertUserSession({
        userId: user.id,
        sessionId,
        userAgent: req.headers['user-agent'],
        ipAddress: getClientIp(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress),
        rememberMe,
      });
    }
    
    // Attach to request for controllers
    req.localUser = user;
    
    next();
  } catch (error) {
    next(error);
  }
};
