import prisma from '../lib/prisma.js';

export interface ReservationAlertSubscriber {
  userId: string;
  email: string | null;
}

interface ReservationAlertSubscriptionDelegate {
  upsert(args: {
    where: {
      userId_doctorScheduleId: {
        userId: string;
        doctorScheduleId: string;
      };
    };
    create: {
      userId: string;
      doctorScheduleId: string;
      email: string | null;
      isActive: boolean;
    };
    update: {
      email: string | null;
      isActive: boolean;
    };
  }): Promise<unknown>;
  findMany(args: {
    where: {
      doctorScheduleId: string;
      isActive: boolean;
      userId?: { not: string };
    };
    select: {
      userId: true;
      email: true;
    };
  }): Promise<ReservationAlertSubscriber[]>;
  updateMany(args: {
    where: {
      doctorScheduleId: string;
      userId: { in: string[] };
    };
    data: {
      isActive: boolean;
    };
  }): Promise<unknown>;
}

const reservationAlertSubscription = (prisma as unknown as {
  reservationAlertSubscription: ReservationAlertSubscriptionDelegate;
}).reservationAlertSubscription;

export async function upsertReservationAlertSubscription(
  userId: string,
  doctorScheduleId: string,
  email?: string,
): Promise<void> {
  await reservationAlertSubscription.upsert({
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
  const rows = await reservationAlertSubscription.findMany({
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

  await reservationAlertSubscription.updateMany({
    where: {
      doctorScheduleId,
      userId: { in: userIds },
    },
    data: {
      isActive: false,
    },
  });
}
