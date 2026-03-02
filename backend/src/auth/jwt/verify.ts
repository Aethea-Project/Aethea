/**
 * JWT Verification for Backend
 * Verifies Supabase JWT tokens with timeout protection.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/AppError.js';

/** Maximum time (ms) to wait for Supabase to verify a token */
const VERIFY_TIMEOUT_MS = 8_000;

export interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
}

export class JWTVerifier {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Verify JWT token and get user (with timeout)
   */
  async verifyToken(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const result = await Promise.race([
        this.supabase.auth.getUser(token),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase auth verification timed out')), VERIFY_TIMEOUT_MS)
        ),
      ]);

      const { data, error } = result;

      if (error || !data.user) {
        return {
          valid: false,
          error: error?.message || 'Invalid token',
        };
      }

      return {
        valid: true,
        user: data.user,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Token verification failed',
      };
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Express middleware — verifies JWT and attaches user to `req.user`.
   * Throws `AppError.unauthorized()` on failure; the centralised
   * error handler will format the response.
   */
  authMiddleware() {
    return async (req: Request, _res: Response, next: NextFunction) => {
      try {
        const token = this.extractTokenFromHeader(req.headers.authorization);

        if (!token) {
          throw AppError.unauthorized('No authorization token provided');
        }

        const verification = await this.verifyToken(token);

        if (!verification.valid) {
          throw AppError.unauthorized(verification.error || 'Invalid token');
        }

        // Attach user to request
        req.user = verification.user;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

/**
 * Initialize JWT Verifier
 */
export const initializeJWTVerifier = (supabaseUrl: string, supabaseServiceKey: string) => {
  return new JWTVerifier(supabaseUrl, supabaseServiceKey);
};
