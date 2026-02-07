/**
 * JWT Verification for Backend
 * Verifies Supabase JWT tokens
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface JWTPayload {
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
   * Verify JWT token and get user
   */
  async verifyToken(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      // Verify token with Supabase
      const { data, error } = await this.supabase.auth.getUser(token);

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
   * Middleware function for Express
   */
  authMiddleware() {
    return async (req: any, res: any, next: any) => {
      const token = this.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        return res.status(401).json({
          error: 'No authorization token provided',
        });
      }

      const verification = await this.verifyToken(token);

      if (!verification.valid) {
        return res.status(401).json({
          error: verification.error || 'Invalid token',
        });
      }

      // Attach user to request
      req.user = verification.user;
      next();
    };
  }
}

/**
 * Initialize JWT Verifier
 */
export const initializeJWTVerifier = (supabaseUrl: string, supabaseServiceKey: string) => {
  return new JWTVerifier(supabaseUrl, supabaseServiceKey);
};
