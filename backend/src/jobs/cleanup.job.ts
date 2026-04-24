import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

/**
 * Starts a background interval job to automatically clean up
 * expired reservations and schedules.
 */
export function startCleanupJob() {
  const ONE_HOUR_MS = 60 * 60 * 1000;

  setInterval(async () => {
    try {
      logger.info('Running background cleanup job for expired reservations...');
      const now = new Date();
      
      // Automatically mark reservations as completed if their end time has passed
      // and they are still in 'scheduled' status.
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
        logger.info(`Cleanup job finished. Marked ${result.count} expired reservations as completed.`);
      }
    } catch (err) {
      logger.error({ err }, 'Error running cleanup job');
    }
  }, ONE_HOUR_MS);

  logger.info('Background cleanup job registered. Runs every hour.');
}
