import { logger } from '../../lib/logger.js';
import { sendEmail } from '../emailService.js';
import { eventBus } from './EventBus.js';
import prisma from '../../lib/prisma.js';
import { NotificationType } from '../../generated/prisma/client.js';

export interface INotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  emailTemplate?: {
    subject: string;
    text: string;
  };
}

export interface INotificationDeliveryStrategy {
  deliver(payload: INotificationPayload): Promise<void>;
}

/**
 * Strategy Pattern: In-App Delivery
 * Saves the notification to the database and emits an SSE event for real-time delivery.
 */
export class InAppStrategy implements INotificationDeliveryStrategy {
  async deliver(payload: INotificationPayload): Promise<void> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          ...(payload.metadata ? { metadata: payload.metadata as any } : {}),
        },
      });

      // Emit SSE event
      eventBus.publish('SSE_EMIT', {
        userId: payload.userId,
        notification,
      });
    } catch (error) {
      logger.error({ err: error, payload }, 'Failed to deliver InApp notification');
    }
  }
}

/**
 * Strategy Pattern: Email Delivery
 * Sends an email via the emailService if an emailTemplate is provided.
 */
export class EmailStrategy implements INotificationDeliveryStrategy {
  async deliver(payload: INotificationPayload): Promise<void> {
    if (!payload.emailTemplate) {
      return; // No email template provided, skip delivery
    }

    try {
      // Look up user's email first
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true }
      });

      if (!user?.email) {
        return;
      }

      await sendEmail(
        user.email,
        payload.emailTemplate.subject,
        payload.emailTemplate.text,
      );
    } catch (error) {
      logger.error({ err: error, payload }, 'Failed to deliver Email notification');
    }
  }
}

/**
 * Composite Strategy that can execute multiple delivery strategies in parallel.
 */
export class CompositeDeliveryStrategy implements INotificationDeliveryStrategy {
  constructor(private strategies: INotificationDeliveryStrategy[]) {}

  async deliver(payload: INotificationPayload): Promise<void> {
    await Promise.all(this.strategies.map(s => s.deliver(payload)));
  }
}
