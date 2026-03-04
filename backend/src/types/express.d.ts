/**
 * Extend Express Request to include custom properties
 * attached by our middleware chain.
 */

import type { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Supabase user from JWT verification (set by authMiddleware) */
      user?: { id: string; email?: string; sessionId?: string };
      /** Local Prisma user record (set by requireLocalUser middleware) */
      localUser?: User;
    }
  }
}

export {};
