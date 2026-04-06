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
  await prisma.reservationAlertSubscription.upsert({
    where: {
      userId_doctorScheduleId: {
        userId,
        doctorScheduleId,
      },
    },
    create: {
      userId,
      doctorScheduleId,
      email: email ?? null,
      isActive: true,
    },
    update: {
      email: email ?? null,
      isActive: true,
    },
  });
}

export async function listActiveReservationAlertSubscribers(
  doctorScheduleId: string,
  excludeUserId?: string,
): Promise<ReservationAlertSubscriber[]> {
  const rows = await prisma.reservationAlertSubscription.findMany({
    where: {
      doctorScheduleId,
      isActive: true,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: {
      userId: true,
      email: true,
    },
  });

  return rows;
}

export async function deactivateReservationAlertSubscriptions(
  doctorScheduleId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  await prisma.reservationAlertSubscription.updateMany({
    where: {
      doctorScheduleId,
      userId: { in: userIds },
    },
    data: {
      isActive: false,
    },
  });
}
