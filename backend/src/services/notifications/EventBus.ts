import { EventEmitter } from 'events';
import { logger } from '../../lib/logger.js';

/**
 * Pub/Sub Pattern: EventBus
 * Decouples event publishers (e.g. ReservationService) from subscribers (NotificationService)
 */
class NotificationEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow more listeners if necessary without warning
    this.setMaxListeners(20);
  }

  /**
   * Type-safe wrapper for emitting events to prevent typos and ensure correct payload.
   */
  public publish<T extends keyof NotificationEvents>(event: T, payload: NotificationEvents[T]): void {
    logger.debug({ event, payload }, 'Publishing notification event');
    this.emit(event, payload);
  }

  /**
   * Type-safe wrapper for subscribing to events.
   */
  public subscribe<T extends keyof NotificationEvents>(event: T, listener: (payload: NotificationEvents[T]) => void | Promise<void>): void {
    // We wrap the listener in an async handler to catch errors without crashing the process
    const asyncListener = async (payload: NotificationEvents[T]) => {
      try {
        await listener(payload);
      } catch (error) {
        logger.error({ err: error, event, payload }, 'Error processing notification event');
      }
    };
    this.on(event, asyncListener);
  }
}

export const eventBus = new NotificationEventBus();

// --- Event Typings ---

export interface NotificationEvents {
  'RESERVATION_CREATED': {
    reservationId: string;
    patientId: string;
    doctorId: string;
    scheduleId: string;
    scheduleDate: Date;
    startAt: Date;
  };
  'RESERVATION_CANCELLED': {
    reservationId: string;
    patientId: string;
    doctorId: string;
    cancelledByRole: 'patient' | 'doctor' | 'admin';
  };
  'SCHEDULE_FULL': {
    doctorId: string;
    scheduleId: string;
    scheduleDate: Date;
  };
  'SLOT_AVAILABLE': {
    doctorScheduleId: string;
    releasedReservationId: string;
    excludedUserId?: string;
  };
  'SYSTEM_BROADCAST': {
    title: string;
    body: string;
    targetRoles: string[];
    expiresAt?: Date;
  };
  'SSE_EMIT': {
    userId: string;
    notification: any;
  };
  'PATIENT_VISIT_COMPLETED': {
    reservationId: string;
    patientId: string;
    doctorId: string;
    patientName: string;
    doctorName: string;
  };
  'QUEUE_UPDATED': {
    scheduleId: string;
  };
}
