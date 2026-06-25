import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUser, ensureLocalUser } from './authUser.js';
import { AppError } from './AppError.js';
import { getClientIp, validateAndUpsertUserSession } from './sessionRegistry.js';

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

    // Batch user upsert and session validation to reduce first-request latency
    const sessionId = req.user?.sessionId;
    let user;

    if (sessionId) {
      const rememberMeHeader = req.headers['x-remember-me'];
      const rememberMeValue = Array.isArray(rememberMeHeader) ? rememberMeHeader[0] : rememberMeHeader;
      const rememberMe = typeof rememberMeValue === 'string' && ['1', 'true', 'yes', 'on'].includes(rememberMeValue.toLowerCase());

      const rawUserAgent = req.headers['user-agent'];
      
      const ensureResult = await ensureLocalUser(authUser, req.user?.email);
      const sessionResult = await validateAndUpsertUserSession({
        userId: authUser.id,
        sessionId,
        userAgent: Array.isArray(rawUserAgent) ? rawUserAgent[0] : rawUserAgent,
        ipAddress: getClientIp(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress),
        rememberMe,
      }).catch(_err => {
        // Explicitly map timeout/network errors from the session registry to 503
        throw new AppError('Session registry unavailable', 503);
      });

      user = ensureResult;

      // Fail-closed: If session result is null (e.g. schema error fail-open earlier), force fail-closed
      if (!sessionResult) {
        throw new AppError('Session registry unavailable', 503);
      }

      if (sessionResult.revoked) {
        throw AppError.unauthorized('Session revoked. Please sign in again');
      }
    } else {
      user = await ensureLocalUser(authUser, req.user?.email);
    }
    
    // Attach to request for controllers
    req.localUser = user;

    // Self-healing: If JWT is missing claims but we have them locally, enrich req.user
    // so that downstream middleware (requireTrustedClaims) doesn't reject a valid user.
    if (req.user) {
      if (!req.user.account_type && user.accountType) {
        req.user.account_type = user.accountType as any;
      }
      if (!req.user.account_status && user.accountStatus) {
        req.user.account_status = user.accountStatus as any;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
