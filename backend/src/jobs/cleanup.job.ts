import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

/**
 * Reservation Cleanup Logic
 *
 * Marks expired reservations as completed.
 * Called by BullMQ cron scheduler (see cron.registry.ts).
 */

/**
 * Marks all reservations past their endAt time and still 'scheduled' as 'completed'.
 */
export async function runReservationCleanup(): Promise<void> {
  logger.info('Running reservation cleanup...');
  const now = new Date();

  const result = await prisma.reservation.updateMany({
    where: {
      endAt: { lt: now },
      status: 'scheduled',
    },
    data: {
      status: 'completed',
    },
  });

  if (result.count > 0) {
    logger.info(`Cleanup: marked ${result.count} expired reservations as completed.`);
  }
}
