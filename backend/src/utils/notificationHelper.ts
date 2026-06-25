import { CompositeDeliveryStrategy, InAppStrategy, EmailStrategy } from '../services/notifications/DeliveryStrategies.js';
import { NotificationFactory } from '../services/notifications/NotificationFactory.js';
import prisma from '../lib/prisma.js';

export async function cancelAndNotifyReservations(
  scheduleId: string,
  doctorFirstName: string,
  doctorLastName: string,
  scheduleDate: Date,
  reasonStr: string,
  payloadData: Record<string, unknown>
) {
  const reservations = await prisma.reservation.findMany({
    where: {
      doctorScheduleId: scheduleId,
      status: { not: 'cancelled' },
    },
    select: {
      userId: true,
      startAt: true,
      endAt: true,
      user: { select: { email: true } },
    },
  });

  if (reservations.length > 0) {
    const dateStr = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeZone: 'Africa/Cairo',
    }).format(scheduleDate);

    const strategy = new CompositeDeliveryStrategy([new InAppStrategy(), new EmailStrategy()]);

    await Promise.all(
      reservations.map((r) => {
        const payload = NotificationFactory.buildGeneric(
          r.userId,
          'reservation_cancelled',
          'Reservation Cancelled by Doctor',
          `Your appointment on ${dateStr} was cancelled by Dr. ${doctorFirstName} ${doctorLastName}. Reason: ${reasonStr}. We apologize for the inconvenience.`,
          payloadData,
        );
        payload.emailTemplate = {
          subject: 'Aethea - Appointment Cancelled',
          text: payload.body,
        };
        return strategy.deliver(payload);
      }),
    );
  }
}
