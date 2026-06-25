/**
 * Extend Express Request to include custom properties
 * attached by our middleware chain.
 */

import type { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Supabase user from JWT verification (set by authMiddleware) */
      user?: {
        id: string;
        email?: string;
        sessionId?: string;
        account_type?: 'patient' | 'doctor' | 'pharmacist' | 'admin';
        account_status?: 'pending' | 'active' | 'suspended' | 'rejected';
        must_change_password?: boolean;
        aal?: 'aal1' | 'aal2';
      };
      /** Local Prisma user record (set by requireLocalUser middleware) */
      localUser?: User;
    }
  }
}

export {};
