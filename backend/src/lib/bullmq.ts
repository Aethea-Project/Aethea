/**
 * BullMQ Infrastructure — shared IORedis connection and queue factories.
 *
 * CRITICAL: BullMQ requires IORedis with maxRetriesPerRequest: null.
 * Without this, BullMQ throws uncaught errors and workers die silently.
 *
 * This module is separate from redisClient.ts (which uses node-redis v4
 * for caching, idempotency, and rate-limiting).
 */

import IORedis from 'ioredis';
import { Queue, Worker, QueueEvents } from 'bullmq';
import type { WorkerOptions, QueueOptions, Processor } from 'bullmq';
import logger from './logger.js';

// ─── Shared IORedis Connection ───
// Lazy singleton — created on first use

let _connection: IORedis | null = null;

export function getIORedisConnection(): IORedis {
  if (_connection) return _connection;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is not configured. BullMQ requires Redis.');
  }

  _connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,  // REQUIRED by BullMQ — crashes without this
    enableReadyCheck: false,     // Prevents blocking on Redis LOADING state
  });

  _connection.on('error', (err) => {
    logger.error({ err }, 'BullMQ IORedis connection error');
  });

  _connection.on('connect', () => {
    logger.info('BullMQ IORedis connected');
  });

  return _connection;
}

// ─── Queue Factory ───

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 10_000 },
  removeOnComplete: { count: 100, age: 3600 },
  removeOnFail: { count: 500, age: 86_400 },
};

export function createQueue(name: string, opts?: Partial<QueueOptions>): Queue {
  return new Queue(name, {
    connection: getIORedisConnection() as any,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
    ...opts,
  });
}

// ─── Worker Factory ───

export function createWorker<T = any>(
  queueName: string,
  processor: Processor<T>,
  opts?: Partial<WorkerOptions>,
): Worker<T> {
  const worker = new Worker<T>(queueName, processor, {
    connection: getIORedisConnection() as any,
    concurrency: 2,
    ...opts,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, `[${queueName}] Job failed`);
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, `[${queueName}] Job completed`);
  });

  return worker;
}

// ─── QueueEvents Factory ───

export function createQueueEvents(queueName: string): QueueEvents {
  return new QueueEvents(queueName, {
    connection: getIORedisConnection() as any,
  });
}

// ─── Graceful Shutdown ───

export async function closeBullMQ(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = null;
    logger.info('BullMQ IORedis connection closed');
  }
}
