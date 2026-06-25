/**
 * BullMQ Cron Job Registry
 *
 * Registers distributed cron jobs that run exactly once across
 * all server instances (no more setInterval race conditions).
 */

import { createQueue, createWorker } from '../lib/bullmq.js';
import { runReservationCleanup } from './cleanup.job.js';
import logger from '../lib/logger.js';

const CRON_QUEUE_NAME = 'distributed-crons';

export async function registerCronJobs(): Promise<void> {
  const cronQueue = createQueue(CRON_QUEUE_NAME);

  // Register the reservation cleanup cron (every 15 minutes)
  await cronQueue.upsertJobScheduler(
    'mark-expired-reservations',
    { pattern: '*/15 * * * *' },
    { name: 'mark-expired-reservations', data: {} },
  );

  logger.info('BullMQ cron jobs registered (mark-expired-reservations: */15 * * * *)');

  // Start the cron worker
  createWorker(CRON_QUEUE_NAME, async (job) => {
    switch (job.name) {
      case 'mark-expired-reservations':
        await runReservationCleanup();
        break;
      default:
        logger.warn({ jobName: job.name }, 'Unknown cron job');
    }
  });
}
