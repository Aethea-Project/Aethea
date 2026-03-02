import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUser, ensureLocalUser } from './authUser.js';
import { AppError } from './AppError.js';

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
    
    // Attach to request for controllers
    req.localUser = user;
    
    next();
  } catch (error) {
    next(error);
  }
};
