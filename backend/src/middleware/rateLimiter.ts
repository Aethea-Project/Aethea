/**
 * Server-Side Rate Limiting Middleware
 *
 * Source: OWASP API4:2023 — Unrestricted Resource Consumption
 *   "Implement a limit on how often a client can interact with the API within a defined timeframe."
 * Source: Express.js Security Best Practices
 *   "Block authorization attempts using two metrics — consecutive fails by same user+IP,
 *    and total fails from an IP."
 *
 * Uses Redis-backed store when REDIS_URL is available (Docker/production),
 * falls back to in-memory store for simple local development.
 */

import rateLimit, { type Store } from 'express-rate-limit';
import { createClient } from 'redis';
import { RedisStore } from 'rate-limit-redis';
import logger from '../lib/logger.js';

/* ---------- Redis store (optional) ---------- */
let getRedisStore: ((prefix: string) => Store) | undefined;

if (process.env.REDIS_URL) {
  try {
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', () => {
      logger.warn('Redis unavailable for rate limiter — falling back to in-memory behavior');
    });

    void redisClient.connect()
      .then(() => {
        logger.info('Rate limiter using Redis store');
      })
      .catch(() => {
        logger.warn('Redis unavailable for rate limiter — falling back to in-memory behavior');
      });

    getRedisStore = (prefix: string) => new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix,
    });
  } catch {
    logger.warn('Redis unavailable for rate limiter — falling back to in-memory store');
  }
}

/**
 * General API rate limiter — 500 requests per 15 minutes per user/IP.
 * Raised from 100 because React Strict Mode doubles effect invocations, and
 * a normal page load triggers 8-12 parallel API calls simultaneously.
 * We key by userId (when authenticated) so Cloudflare proxy IPs don't pool users together.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as any).localUser?.id ?? (req as any).user?.sub;
    return userId ? `user:${userId}` : (req.ip ?? 'unknown');
  },
  skip: (req) => req.path === '/health',
  ...(getRedisStore && { store: getRedisStore('rl:api:') }),
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    code: 'RATE_LIMITED',
  },
});

/**
 * Strict auth rate limiter — 10 requests per 15 minutes per IP
 * Applied to login, verify, password reset endpoints.
 *
 * Source: OWASP API2:2023 — Broken Authentication
 *   "Implement anti-brute force mechanisms stricter than regular rate limiting."
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // only 10 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  ...(getRedisStore && { store: getRedisStore('rl:auth:') }),
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMITED',
  },
});

/**
 * Maps proxy limiter — protects external API quota and abuse.
 */
export const mapsProxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  ...(getRedisStore && { store: getRedisStore('rl:maps:') }),
  message: {
    error: 'Too many map requests',
    message: 'Map usage limit reached for now. Please try again shortly.',
    code: 'MAPS_RATE_LIMITED',
  },
});
