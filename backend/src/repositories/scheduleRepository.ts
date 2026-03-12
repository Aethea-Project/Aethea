/**
 * Schedule Repository — typed queries for doctor_schedules
 */

import prisma from '../lib/prisma.js';

export interface CreateScheduleInput {
  scheduleDate: Date;
  startAt: Date;
  endAt: Date;
  slotDurationMins: number;
  maxPatients: number;
  isPublished?: boolean;
}

export async function listDoctorSchedules(
  doctorProfileId: string,
  from: Date | undefined,
  to: Date | undefined,
  skip: number,
  take: number,
) {
  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = from;
  if (to)   dateFilter.lte = to;

  const where = {
    doctorProfileId,
    isPublished: true,
    ...(Object.keys(dateFilter).length > 0 ? { scheduleDate: dateFilter } : {}),
  };

  const [schedules, total] = await Promise.all([
    prisma.doctorSchedule.findMany({
      where,
      include: {
        _count: { select: { reservations: true } },
      },
      orderBy: { scheduleDate: 'asc' },
      skip,
      take,
    }),
    prisma.doctorSchedule.count({ where }),
  ]);

  return { schedules, total };
}

export async function getScheduleById(id: string) {
  return prisma.doctorSchedule.findUnique({
    where: { id },
    include: {
      doctorProfile: {
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          specialty: true,
        },
      },
      _count: { select: { reservations: true } },
    },
  });
}

export async function getScheduleWithReservations(scheduleId: string) {
  return prisma.doctorSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      reservations: {
        select: {
          id: true,
          slotIndex: true,
          startAt: true,
          endAt: true,
          status: true,
          reason: true,
          shareHealthData: true,
          // userId intentionally excluded — doctor must not see patient identity
        },
        orderBy: { slotIndex: 'asc' },
      },
    },
  });
}

export async function createSchedule(doctorProfileId: string, data: CreateScheduleInput) {
  return prisma.doctorSchedule.create({
    data: {
      doctorProfileId,
      scheduleDate: data.scheduleDate,
      startAt: data.startAt,
      endAt: data.endAt,
      slotDurationMins: data.slotDurationMins,
      maxPatients: data.maxPatients,
      isPublished: data.isPublished ?? true,
    },
  });
}

export async function isSlotBooked(scheduleId: string, slotIndex: number): Promise<boolean> {
  const existing = await prisma.reservation.findUnique({
    where: { doctorScheduleId_slotIndex: { doctorScheduleId: scheduleId, slotIndex } },
    select: { id: true },
  });
  return existing !== null;
}
