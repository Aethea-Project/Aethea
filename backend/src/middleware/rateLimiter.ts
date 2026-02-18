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
import logger from '../lib/logger.js';

/* ---------- Redis store (optional) ---------- */
let redisStore: Store | undefined;

if (process.env.REDIS_URL) {
  try {
    const { RedisStore } = await import('rate-limit-redis');
    const redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
    redisStore = new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:',
    });
    logger.info('Rate limiter using Redis store');
  } catch {
    logger.warn('Redis unavailable for rate limiter — falling back to in-memory store');
  }
}

/**
 * General API rate limiter — 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // limit each IP to 100 requests per window
  standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,      // Disable `X-RateLimit-*` headers
  ...(redisStore && { store: redisStore }),
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
  ...(redisStore && { store: redisStore }),
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMITED',
  },
});
