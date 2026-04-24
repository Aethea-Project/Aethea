/**
 * JWT Verification for Backend
 * Verifies Supabase JWT tokens with timeout protection.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import { AppError } from '../../lib/AppError.js';

/** Maximum time (ms) to wait for Supabase to verify a token */
const VERIFY_TIMEOUT_MS = 8_000;

/** Cache Supabase getUser() lookups to reduce network latency. */
const USER_LOOKUP_CACHE_TTL_MS = 60_000;
const USER_LOOKUP_CACHE_MAX_ENTRIES = 5_000;

export interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
  session_id?: string;
  account_type?: 'patient' | 'doctor' | 'pharmacist' | 'admin';
  account_status?: 'pending' | 'active' | 'suspended' | 'rejected';
  must_change_password?: boolean;
}

interface VerifiedAuthUser {
  id: string;
  email?: string | null;
}

type CachedUserLookup = {
  expiresAt: number;
  user: VerifiedAuthUser;
};

const userLookupCache = new Map<string, CachedUserLookup>();
const inFlightUserLookups = new Map<string, Promise<VerifiedAuthUser>>();

const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('base64url');
};

const computeLookupTtlMs = (payload: JWTPayload | null, nowMs: number): number => {
  const defaultTtl = USER_LOOKUP_CACHE_TTL_MS;
  if (!payload?.exp) {
    return defaultTtl;
  }

  const remainingMs = payload.exp * 1000 - nowMs;
  if (remainingMs <= 0) {
    return 0;
  }

  return Math.min(defaultTtl, remainingMs);
};

const cacheUserLookup = (cacheKey: string, user: VerifiedAuthUser, ttlMs: number): void => {
  if (ttlMs <= 0) {
    return;
  }

  const now = Date.now();
  userLookupCache.set(cacheKey, { user, expiresAt: now + ttlMs });

  // Best-effort bounded cache: evict oldest entries.
  while (userLookupCache.size > USER_LOOKUP_CACHE_MAX_ENTRIES) {
    const oldestKey = userLookupCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    userLookupCache.delete(oldestKey);
  }
};

type TokenVerificationResult =
  | {
      valid: true;
      user: VerifiedAuthUser;
      payload: JWTPayload | null;
    }
  | {
      valid: false;
      error: string;
    };

const decodePayload = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const payloadBuffer = Buffer.from(parts[1], 'base64url');
    return JSON.parse(payloadBuffer.toString('utf-8')) as JWTPayload;
  } catch {
    return null;
  }
};

export class JWTVerifier {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Verify JWT token and get user (with timeout)
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    const payload = decodePayload(token);
    const nowMs = Date.now();

    // Safe fast-fail: if the token *claims* it's expired, it's definitely not usable.
    if (payload?.exp && payload.exp * 1000 <= nowMs) {
      return {
        valid: false,
        error: 'Token expired',
      };
    }

    const cacheKey = hashToken(token);
    const cached = userLookupCache.get(cacheKey);
    if (cached) {
      if (cached.expiresAt > nowMs) {
        return {
          valid: true,
          user: cached.user,
          payload,
        };
      }
      userLookupCache.delete(cacheKey);
    }

    try {
      const ttlMs = computeLookupTtlMs(payload, nowMs);

      const existing = inFlightUserLookups.get(cacheKey);
      if (existing) {
        const user = await existing;
        return { valid: true, user, payload };
      }

      const lookupPromise = (async (): Promise<VerifiedAuthUser> => {
        const result = await Promise.race([
          this.supabase.auth.getUser(token),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase auth verification timed out')), VERIFY_TIMEOUT_MS)
          ),
        ]);

        const { data, error } = result;
        if (error || !data.user) {
          throw new Error(error?.message || 'Invalid token');
        }

        return {
          id: data.user.id,
          email: data.user.email ?? null,
        };
      })();

      inFlightUserLookups.set(cacheKey, lookupPromise);

      try {
        const user = await lookupPromise;
        cacheUserLookup(cacheKey, user, ttlMs);
        return { valid: true, user, payload };
      } finally {
        inFlightUserLookups.delete(cacheKey);
      }
    } catch (error: unknown) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token verification failed',
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
        let token = this.extractTokenFromHeader(req.headers.authorization);

        // Fallback to query parameter for EventSource (SSE) which cannot send headers
        if (!token && req.query.token && typeof req.query.token === 'string') {
          token = req.query.token;
        }

        if (!token) {
          throw AppError.unauthorized('No authorization token provided');
        }

        const verification = await this.verifyToken(token);

        if (!verification.valid) {
          if (verification.error?.includes('timed out') || verification.error?.includes('fetch')) {
            throw new AppError(verification.error, 503);
          }
          throw AppError.unauthorized(verification.error || 'Invalid token');
        }

        // Attach user to request
        req.user = {
          id: verification.user.id,
          email: verification.user.email ?? undefined,
          sessionId: verification.payload?.session_id,
          account_type: verification.payload?.account_type,
          account_status: verification.payload?.account_status,
          must_change_password: verification.payload?.must_change_password,
        };
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
