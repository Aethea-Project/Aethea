import { eventBus } from './EventBus.js';
import { NotificationFactory } from './NotificationFactory.js';
import { CompositeDeliveryStrategy, EmailStrategy, InAppStrategy } from './DeliveryStrategies.js';
import { logger } from '../../lib/logger.js';
import prisma from '../../lib/prisma.js';
import { sendPatientVisitCompletedEmail } from '../emailService.js';

const deliveryStrategy = new CompositeDeliveryStrategy([
  new InAppStrategy(),
  new EmailStrategy()
]);

let workerStarted = false;

export function startNotificationWorker() {
  if (workerStarted) {
    return;
  }
  workerStarted = true;

  logger.info('Notification Worker started listening to EventBus...');

  // --- RESERVATION_CREATED ---
  eventBus.subscribe('RESERVATION_CREATED', async (data) => {
    let patientName = 'Patient';
    let doctorName = 'Doctor';

    try {
      const [patientUser, doctorUser] = await Promise.all([
        prisma.user.findUnique({
          where: { id: data.patientId },
          select: { firstName: true, lastName: true }
        }),
        prisma.user.findUnique({
          where: { id: data.doctorId },
          select: { firstName: true, lastName: true }
        })
      ]);

      if (patientUser) {
        patientName = `${patientUser.firstName ?? ''} ${patientUser.lastName ?? ''}`.trim() || 'Patient';
      }
      if (doctorUser) {
        doctorName = `${doctorUser.firstName ?? ''} ${doctorUser.lastName ?? ''}`.trim() || 'Doctor';
      }
    } catch (err) {
      logger.error({ err }, 'Failed to resolve user names for RESERVATION_CREATED');
    }

    const factoryMetadata = {
      ...data,
      patientName,
      doctorName
    };

    // Notify Patient
    await deliveryStrategy.deliver(
      NotificationFactory.buildReservationConfirmed(data.patientId, 'patient', factoryMetadata)
    );

    // Notify Doctor
    await deliveryStrategy.deliver(
      NotificationFactory.buildReservationConfirmed(data.doctorId, 'doctor', factoryMetadata)
    );

    // Check if doctor's schedule is now full
    try {
      const schedule = await prisma.doctorSchedule.findUnique({
        where: { id: data.scheduleId },
        select: {
          maxPatients: true,
          _count: {
            select: {
              reservations: {
                where: { status: { not: 'cancelled' } }
              }
            }
          }
        }
      });
      if (schedule && schedule._count.reservations >= schedule.maxPatients) {
        eventBus.publish('SCHEDULE_FULL', {
          doctorId: data.doctorId,
          scheduleId: data.scheduleId,
          scheduleDate: data.scheduleDate
        });
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to check if schedule is full');
    }
  });

  // --- RESERVATION_CANCELLED ---
  eventBus.subscribe('RESERVATION_CANCELLED', async (data) => {
    let patientName = 'Patient';
    let doctorName = 'Doctor';
    let startAt: Date | undefined;

    try {
      const [patientUser, doctorUser, reservation] = await Promise.all([
        prisma.user.findUnique({
          where: { id: data.patientId },
          select: { firstName: true, lastName: true }
        }),
        prisma.user.findUnique({
          where: { id: data.doctorId },
          select: { firstName: true, lastName: true }
        }),
        prisma.reservation.findUnique({
          where: { id: data.reservationId },
          select: { startAt: true }
        })
      ]);

      if (patientUser) {
        patientName = `${patientUser.firstName ?? ''} ${patientUser.lastName ?? ''}`.trim() || 'Patient';
      }
      if (doctorUser) {
        doctorName = `${doctorUser.firstName ?? ''} ${doctorUser.lastName ?? ''}`.trim() || 'Doctor';
      }
      if (reservation) {
        startAt = reservation.startAt;
      }
    } catch (err) {
      logger.error({ err }, 'Failed to resolve details for RESERVATION_CANCELLED');
    }

    const factoryMetadata = {
      ...data,
      patientName,
      doctorName,
      startAt
    };

    // Notify Patient
    await deliveryStrategy.deliver(
      NotificationFactory.buildReservationCancelled(data.patientId, 'patient', factoryMetadata)
    );

    // Notify Doctor
    await deliveryStrategy.deliver(
      NotificationFactory.buildReservationCancelled(data.doctorId, 'doctor', factoryMetadata)
    );
  });

  // --- SLOT_AVAILABLE ---
  eventBus.subscribe('SLOT_AVAILABLE', async (data) => {
    try {
      const { listActiveReservationAlertSubscribers, deactivateReservationAlertSubscriptions } = await import('../../repositories/reservationAlertRepository.js');
      
      const alertSubscribers = await listActiveReservationAlertSubscribers(
        data.doctorScheduleId,
        data.excludedUserId,
      );

      if (alertSubscribers.length > 0) {
        // Fetch doctor info and schedule info for the email body
        const schedule = await prisma.doctorSchedule.findUnique({
          where: { id: data.doctorScheduleId },
          include: { doctorProfile: { include: { user: true } } }
        });

        if (!schedule) return;
        const doctorName = `Dr. ${schedule.doctorProfile.firstName} ${schedule.doctorProfile.lastName}`;
        const title = 'Slot Available';
        const body = `A slot is now available with ${doctorName} on ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(schedule.startAt)}.`;

        for (const subscriber of alertSubscribers) {
          const payload = NotificationFactory.buildGeneric(
            subscriber.userId,
            'slot_available',
            title,
            body,
            {
              doctorScheduleId: data.doctorScheduleId,
              releasedReservationId: data.releasedReservationId,
            },
          );

          if (subscriber.email) {
            payload.emailTemplate = {
              subject: 'Aethea - A Slot Is Now Available',
              text: body,
            };
          }

          // Deliver each notification
          await deliveryStrategy.deliver(payload);
        }

        // Deactivate the alerts so we don't spam them again
        await deactivateReservationAlertSubscriptions(
          data.doctorScheduleId,
          alertSubscribers.map((s) => s.userId),
        );
      }
    } catch (err) {
      logger.error({ err, event: 'SLOT_AVAILABLE' }, 'Failed to process SLOT_AVAILABLE event');
    }
  });

  // --- SCHEDULE_FULL ---
  eventBus.subscribe('SCHEDULE_FULL', async (data) => {
    await deliveryStrategy.deliver(
      NotificationFactory.buildScheduleFull(data.doctorId, data.scheduleDate)
    );
  });

  // --- SYSTEM_BROADCAST ---
  eventBus.subscribe('SYSTEM_BROADCAST', async (data) => {
    // Save to SystemAnnouncements instead of individual notifications
    try {
      const announcement = await prisma.systemAnnouncement.create({
        data: {
          title: data.title,
          body: data.body,
          targetRoles: data.targetRoles,
          expiresAt: data.expiresAt
        }
      });
      
      // We don't emit SSE to everyone instantly from the backend to avoid 
      // flooding thousands of connections at exactly the same ms.
      // Instead, we can emit a gentle ping or just let users fetch it on next load.
      logger.info({ announcementId: announcement.id }, 'System Broadcast created');
    } catch (error) {
      logger.error({ err: error }, 'Failed to save System Broadcast');
    }
  });

  // --- PATIENT_VISIT_COMPLETED ---
  eventBus.subscribe('PATIENT_VISIT_COMPLETED', async (data) => {
    // 1. Send Email
    try {
      const user = await prisma.user.findUnique({
        where: { id: data.patientId },
        select: { email: true }
      });
      if (user?.email) {
        await sendPatientVisitCompletedEmail({
          to: user.email,
          patientName: data.patientName,
          doctorName: data.doctorName
        });
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to send visit completion email');
    }

    // 2. Send In-App Notification (using system_broadcast)
    try {
      await deliveryStrategy.deliver({
        userId: data.patientId,
        type: 'system_broadcast',
        title: 'Review Your Appointment',
        body: `How was your visit with Dr. ${data.doctorName}? Please take a moment to share your feedback.`,
        metadata: { reservationId: data.reservationId }
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to send visit completion in-app notification');
    }
  });
}
