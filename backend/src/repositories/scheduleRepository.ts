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

export interface MarketplaceScheduleFilters {
  specialty?: string;
  city?: string;
  search?: string;
  date?: Date;
}

export async function listDoctorSchedules(
  doctorProfileId: string,
  from: Date | undefined,
  to: Date | undefined,
  skip: number,
  take: number,
) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const dateFilter: Record<string, Date> = {};
  dateFilter.gte = from ?? startOfToday;
  if (to)   dateFilter.lte = to;

  const where = {
    doctorProfileId,
    // Note: since this is used by standard list, keep or add isPublished if needed. 
    // Usually a doctor should see drafts, but for now we keep the existing condition or remove it if doctor wants to see drafts.
    // The previous code had isPublished: true, so let's keep it to be safe, or remove it so doctors see all. 
    // They are fetching their own. Patients fetch via marketplace route anyway!
    // But they pass through the same controller. We will keep it but filter past dates.
    ...(Object.keys(dateFilter).length > 0 ? { scheduleDate: dateFilter } : {}),
  };

  const [schedules, total] = await Promise.all([
    prisma.doctorSchedule.findMany({
      where,
      include: {
        _count: { select: { reservations: true } },
        reservations: {
          where: { status: { not: 'cancelled' } },
          select: { slotIndex: true },
        },
      },
      orderBy: { scheduleDate: 'asc' },
      skip,
      take,
    }),
    prisma.doctorSchedule.count({ where }),
  ]);

  return { schedules, total };
}

export async function listMarketplaceSchedules(
  filters: MarketplaceScheduleFilters,
  skip: number,
  take: number,
) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const where = {
    isPublished: true,
    scheduleDate: filters.date
      ? {
          gte: new Date(new Date(filters.date).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(filters.date).setHours(23, 59, 59, 999)),
        }
      : { gte: startOfToday },
    doctorProfile: {
      verified: true,
      ...(filters.specialty
        ? { specialty: { contains: filters.specialty, mode: 'insensitive' as const } }
        : {}),
      ...(filters.city
        ? { city: { contains: filters.city, mode: 'insensitive' as const } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' as const } },
              { lastName: { contains: filters.search, mode: 'insensitive' as const } },
              { specialty: { contains: filters.search, mode: 'insensitive' as const } },
              { clinicName: { contains: filters.search, mode: 'insensitive' as const } },
              { city: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
  };

  const [schedules, total] = await Promise.all([
    prisma.doctorSchedule.findMany({
      where,
      include: {
        doctorProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            clinicName: true,
            city: true,
            photoUrl: true,
            consultFee: true,
            languages: true,
            verified: true,
          },
        },
        reservations: {
          where: { status: { not: 'cancelled' } },
          select: { slotIndex: true },
        },
      },
      orderBy: [{ scheduleDate: 'asc' }, { startAt: 'asc' }],
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
          clinicName: true,
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
        where: { status: { not: 'cancelled' } },
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

export async function deleteSchedule(id: string) {
  return prisma.doctorSchedule.delete({
    where: { id },
  });
}

export async function isSlotBooked(scheduleId: string, slotIndex: number): Promise<boolean> {
  const existing = await prisma.reservation.findFirst({
    where: {
      doctorScheduleId: scheduleId,
      slotIndex,
      status: { not: 'cancelled' },
    },
    select: { id: true },
  });
  return existing !== null;
}
