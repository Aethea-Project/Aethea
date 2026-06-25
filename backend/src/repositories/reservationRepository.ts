/**
 * Reservation Repository — typed queries for reservations
 */

import prisma from '../lib/prisma.js';

export interface CreateReservationInput {
  doctorScheduleId: string;
  slotIndex: number;
  startAt: Date;
  endAt: Date;
  cancelDeadlineAt: Date;
  reason: string;
  notes?: string;
  shareHealthData: boolean;
  notifyOnCancel: boolean;
}

export async function createReservation(userId: string, data: CreateReservationInput) {
  const existing = await prisma.reservation.findFirst({
    where: {
      doctorScheduleId: data.doctorScheduleId,
      slotIndex: data.slotIndex,
    }
  });

  if (existing) {
    const result = await prisma.reservation.updateMany({
      where: { id: existing.id, status: 'cancelled' },
      data: {
        userId,
        startAt: data.startAt,
        endAt: data.endAt,
        cancelDeadlineAt: data.cancelDeadlineAt,
        reason: data.reason,
        notes: data.notes,
        shareHealthData: data.shareHealthData,
        notifyOnCancel: data.notifyOnCancel,
        status: 'scheduled',
      },
    });

    if (result.count === 0) {
      const { AppError } = await import('../lib/AppError.js');
      throw AppError.conflict('This slot was just booked by someone else.');
    }

    return prisma.reservation.findUnique({
      where: { id: existing.id },
      include: {
        doctorSchedule: {
          include: {
            doctorProfile: {
              select: { firstName: true, lastName: true, specialty: true, clinicName: true, address: true, locationUrl: true, city: true },
            },
          },
        },
      },
    }) as any;
  }

  try {
    return await prisma.reservation.create({
      data: {
        userId,
        doctorScheduleId: data.doctorScheduleId,
        slotIndex: data.slotIndex,
        startAt: data.startAt,
        endAt: data.endAt,
        cancelDeadlineAt: data.cancelDeadlineAt,
        reason: data.reason,
        notes: data.notes,
        shareHealthData: data.shareHealthData,
        notifyOnCancel: data.notifyOnCancel,
        status: 'scheduled',
      },
      include: {
        doctorSchedule: {
          include: {
            doctorProfile: {
              select: { firstName: true, lastName: true, specialty: true, clinicName: true, address: true, locationUrl: true, city: true },
            },
          },
        },
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const { AppError } = await import('../lib/AppError.js');
      throw AppError.conflict('This slot was just booked by someone else.');
    }
    throw error;
  }
}

export async function listPatientReservations(userId: string, skip: number, take: number, tab: 'upcoming' | 'past' | 'cancelled' = 'upcoming') {
  const now = new Date();
  
  let where: any = { userId };
  
  if (tab === 'upcoming') {
    where.status = { notIn: ['cancelled', 'completed', 'no_show'] };
    where.endAt = { gt: now };
  } else if (tab === 'past') {
    where.status = { notIn: ['cancelled'] };
    where.OR = [
      { status: { in: ['completed', 'no_show'] } },
      { endAt: { lte: now } }
    ];
  } else if (tab === 'cancelled') {
    where.status = 'cancelled';
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        doctorSchedule: {
          include: {
            doctorProfile: {
              select: { firstName: true, lastName: true, specialty: true, clinicName: true, address: true, locationUrl: true, city: true, photoUrl: true, consultFee: true },
            },
          },
        },
      },
      orderBy: tab === 'upcoming' ? { startAt: 'asc' } : { startAt: 'desc' },
      skip,
      take,
    }),
    prisma.reservation.count({ where }),
  ]);
  return { reservations, total };
}

export async function getReservationById(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      user: {
        select: { email: true, firstName: true, lastName: true },
      },
      doctorSchedule: {
        include: {
          doctorProfile: {
            select: { firstName: true, lastName: true, specialty: true, clinicName: true, address: true, locationUrl: true, city: true, photoUrl: true, userId: true },
          },
        },
      },
    },
  });
}

export async function cancelReservation(id: string) {
  return prisma.reservation.update({
    where: { id },
    data: {
      status: 'cancelled',
    },
  });
}

export async function getActiveReservationCountForSchedule(doctorScheduleId: string): Promise<number> {
  return prisma.reservation.count({
    where: {
      doctorScheduleId,
      status: { not: 'cancelled' },
    },
  });
}

export async function updateReservationStatus(id: string, status: string, notes?: string) {
  return prisma.reservation.update({
    where: { id },
    data: { status: status as never, ...(notes !== undefined ? { notes } : {}) },
  });
}

export async function hasPatientBookedSchedule(userId: string, doctorScheduleId: string): Promise<boolean> {
  const existing = await prisma.reservation.findFirst({
    where: {
      userId,
      doctorScheduleId,
      status: { not: 'cancelled' },
    },
  });
  return !!existing;
}

export async function getPendingFeedbackReservation(userId: string) {
  return prisma.reservation.findFirst({
    where: {
      userId,
      status: 'completed',
      feedbackSubmitted: false,
    },
    include: {
      doctorSchedule: {
        include: {
          doctorProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialty: true,
            },
          },
        },
      },
    },
    orderBy: {
      endAt: 'desc',
    },
  });
}

