import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../lib/redisClient.js';
import logger from '../lib/logger.js';

interface CachedResponse {
  status: 'processing' | 'resolved';
  statusCode?: number;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
}

/**
 * Idempotency middleware using Redis.
 * Enforces the presence of the Idempotency-Key header on state-changing requests,
 * preventing double-submissions and caching successful results.
 */
export const enforceIdempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Only apply to state-changing operations
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing Idempotency-Key header.',
    });
    return;
  }

  // Get Redis client
  const redis = await getRedisClient();
  if (!redis) {
    logger.warn('Redis is unavailable. Proceeding without idempotency guarantees.');
    return next();
  }

  // Isolate keys per user to prevent collision / cross-user DOS attacks
  const userId = req.localUser?.id || req.user?.id || 'anonymous';
  const redisKey = `idempotency:${userId}:${idempotencyKey}`;

  try {
    // Try to set the key as "processing" atomically.
    // Expire after 24 hours to prevent Redis from growing infinitely.
    const setOk = await redis.set(redisKey, JSON.stringify({ status: 'processing' } as CachedResponse), {
      NX: true,
      EX: 86400,
    });

    if (setOk) {
      // Key was set successfully. This is the first time we see this request.
      // Intercept the response to store the result on success or delete the key on failure.
      const originalSend = res.send;

      res.send = function (body?: any): Response {
        // Cache successful responses (2xx).
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responsePayload: CachedResponse = {
            status: 'resolved',
            statusCode: res.statusCode,
            headers: res.getHeaders() as Record<string, string | string[] | undefined>,
            body: typeof body === 'string' ? body : JSON.stringify(body),
          };

          redis.set(redisKey, JSON.stringify(responsePayload), { EX: 86400 }).catch((err: any) => {
            logger.error({ err, redisKey }, 'Failed to cache idempotency resolved response');
          });
        } else {
          // If the request fails (e.g. 4xx, 5xx), remove the lock so the client can retry.
          redis.del(redisKey).catch((err: any) => {
            logger.error({ err, redisKey }, 'Failed to delete idempotency key after request failure');
          });
        }

        return originalSend.apply(res, arguments as any);
      };

      return next();
    }

    // If setOk is null, the key already exists. Read the current status.
    const cachedDataRaw = await redis.get(redisKey);
    if (!cachedDataRaw) {
      // Race condition fallback: if key expired or was deleted in the split-second between SET NX and GET
      return next();
    }

    const cachedData = JSON.parse(cachedDataRaw) as CachedResponse;

    if (cachedData.status === 'processing') {
      // Request is already being handled. Return 409 Conflict.
      res.setHeader('Retry-After', '2');
      res.status(409).json({
        error: 'Conflict',
        message: 'A duplicate request is already in progress. Please retry shortly.',
      });
      return;
    }

    if (cachedData.status === 'resolved' && cachedData.statusCode) {
      // Return the cached response
      if (cachedData.headers) {
        Object.entries(cachedData.headers).forEach(([name, val]) => {
          if (val !== undefined) {
            res.setHeader(name, val);
          }
        });
      }
      res.setHeader('X-Cache-Idempotency', 'HIT');
      res.status(cachedData.statusCode).send(cachedData.body);
      return;
    }

    // Fallback if data is corrupted or invalid
    return next();
  } catch (error) {
    logger.error({ error, redisKey }, 'Error inside idempotency middleware');
    // Graceful fallback to avoid taking down the service
    return next();
  }
};
