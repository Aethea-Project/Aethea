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
  return prisma.reservation.create({
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
            select: { firstName: true, lastName: true, specialty: true, clinicName: true },
          },
        },
      },
    },
  });
}

export async function listPatientReservations(userId: string, skip: number, take: number) {
  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId },
      include: {
        doctorSchedule: {
          include: {
            doctorProfile: {
              select: { firstName: true, lastName: true, specialty: true, clinicName: true, city: true, photoUrl: true },
            },
          },
        },
      },
      orderBy: { startAt: 'asc' },
      skip,
      take,
    }),
    prisma.reservation.count({ where: { userId } }),
  ]);
  return { reservations, total };
}

export async function getReservationById(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      doctorSchedule: {
        include: {
          doctorProfile: {
            select: { firstName: true, lastName: true, specialty: true, clinicName: true, city: true, photoUrl: true, userId: true },
          },
        },
      },
    },
  });
}

export async function cancelReservation(id: string) {
  return prisma.reservation.delete({
    where: { id },
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
