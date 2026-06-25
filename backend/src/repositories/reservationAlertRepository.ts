import prisma from '../lib/prisma.js';

export interface ReservationAlertSubscriber {
  userId: string;
  email: string | null;
}

export async function upsertReservationAlertSubscription(
  userId: string,
  doctorScheduleId: string,
  email?: string,
): Promise<void> {
  await prisma.reservation_alert_subscriptions.upsert({
    where: {
      user_id_doctor_schedule_id: {
        user_id: userId,
        doctor_schedule_id: doctorScheduleId,
      },
    },
    create: {
      user_id: userId,
      doctor_schedule_id: doctorScheduleId,
      email: email ?? null,
      is_active: true,
    },
    update: {
      email: email ?? null,
      is_active: true,
    },
  });
}

export async function listActiveReservationAlertSubscribers(
  doctorScheduleId: string,
  excludeUserId?: string,
): Promise<ReservationAlertSubscriber[]> {
  const rows = await prisma.reservation_alert_subscriptions.findMany({
    where: {
      doctor_schedule_id: doctorScheduleId,
      is_active: true,
      ...(excludeUserId ? { user_id: { not: excludeUserId } } : {}),
    },
    select: {
      user_id: true,
      email: true,
    },
  });

  return rows.map((r) => ({
    userId: r.user_id,
    email: r.email,
  }));
}

export async function deactivateReservationAlertSubscriptions(
  doctorScheduleId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  await prisma.reservation_alert_subscriptions.updateMany({
    where: {
      doctor_schedule_id: doctorScheduleId,
      user_id: { in: userIds },
    },
    data: {
      is_active: false,
    },
  });
}
