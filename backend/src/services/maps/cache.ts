/**
 * Maps Cache — two-tier caching layer (Memory LRU + Redis)
 *
 * Uses a proper LRU eviction strategy for the in-memory cache
 * instead of manual FIFO eviction. Falls back gracefully if Redis
 * is unavailable.
 */

import { createHash } from 'node:crypto';
import logger from '../../lib/logger.js';
import { getRedisClient } from '../../lib/redisClient.js';

const DEFAULT_CACHE_TTL_SECONDS = 10 * 60;
const MEMORY_CACHE_MAX_ITEMS = 300;

interface CacheEntry {
  expiresAt: number;
  value: unknown;
  lastAccessedAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

function hashCacheKey(prefix: string, raw: string): string {
  const hash = createHash('sha1').update(raw).digest('hex');
  return `${prefix}:${hash}`;
}

/**
 * LRU eviction: removes the least-recently-accessed entries
 * when the cache exceeds the maximum size.
 */
function pruneMemoryCache(): void {
  if (memoryCache.size <= MEMORY_CACHE_MAX_ITEMS) {
    return;
  }

  // Sort entries by lastAccessedAt (ascending) and remove oldest
  const entries = Array.from(memoryCache.entries())
    .sort(([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt);

  const toRemove = entries.slice(0, memoryCache.size - MEMORY_CACHE_MAX_ITEMS);
  for (const [key] of toRemove) {
    memoryCache.delete(key);
  }
}

function readMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  // Update access time for LRU tracking
  entry.lastAccessedAt = Date.now();
  return entry.value as T;
}

function writeMemoryCache(key: string, value: unknown, ttlSeconds: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
    lastAccessedAt: Date.now(),
  });
  pruneMemoryCache();
}

async function readRedisCache<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn({ err: error, key }, 'Redis read failed for map cache key');
    return null;
  }
}

async function writeRedisCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    logger.warn({ err: error, key }, 'Redis write failed for map cache key');
  }
}

/**
 * Two-tier cache-aside with request deduplication.
 *
 * Check order: Memory → Redis → Loader
 * Writes back to both tiers on miss.
 * Deduplicates concurrent requests for the same key.
 */
export async function withCache<T>(rawKey: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cacheKey = hashCacheKey('maps', rawKey);

  const memoryHit = readMemoryCache<T>(cacheKey);
  if (memoryHit) {
    return memoryHit;
  }

  const redisHit = await readRedisCache<T>(cacheKey);
  if (redisHit) {
    writeMemoryCache(cacheKey, redisHit, ttlSeconds);
    return redisHit;
  }

  const inFlight = pendingRequests.get(cacheKey) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const value = await loader();
    writeMemoryCache(cacheKey, value, ttlSeconds);
    await writeRedisCache(cacheKey, value, ttlSeconds);
    return value;
  })();

  pendingRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

export { DEFAULT_CACHE_TTL_SECONDS };
