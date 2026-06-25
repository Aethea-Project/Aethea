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
  bookingMode?: string;
  clinicInfo?: any;
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

  const now = new Date();

  const where = {
    doctorProfileId,
    endAt: { gt: now }, // Hide from doctor if the schedule has completely ended
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

  const now = new Date();
  
  const where = {
    isPublished: true,
    endAt: { gt: now }, // Hide schedules that have completely ended
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
            address: true,
            locationUrl: true,
            city: true,
            photoUrl: true,
            consultFee: true,
            languages: true,
            verified: true,
            feedbacks: {
              select: { rating: true }
            },
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

  // Filter out fully booked or completely expired schedules in memory, and calculate ratings
  const availableSchedules = schedules.reduce((acc, schedule) => {
    let bookableSlots = 0;
    const bookedIndexes = new Set(schedule.reservations.map(r => r.slotIndex));
    const nowMs = Date.now();
    const startMs = schedule.startAt.getTime();
    
    for (let i = 0; i < schedule.maxPatients; i++) {
      if (bookedIndexes.has(i)) continue;
      const slotStart = startMs + i * schedule.slotDurationMins * 60_000;
      if (slotStart > nowMs) {
        bookableSlots++;
      }
    }
    
    if (bookableSlots > 0) {
      const feedbacks = (schedule.doctorProfile as any).feedbacks || [];
      const reviewCount = feedbacks.length;
      const avgRating = reviewCount > 0 ? feedbacks.reduce((sum: number, f: any) => sum + f.rating, 0) / reviewCount : null;
      
      const { feedbacks: _, ...cleanProfile } = schedule.doctorProfile as any;
      
      acc.push({
        ...schedule,
        doctorProfile: {
          ...cleanProfile,
          avgRating,
          reviewCount,
        }
      });
    }
    return acc;
  }, [] as any[]);

  // Re-adjust total for filtered schedules
  const adjustedTotal = total - (schedules.length - availableSchedules.length);

  return { schedules: availableSchedules, total: adjustedTotal };
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
          address: true,
          locationUrl: true,
          city: true,
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
          userId: true, // Needed by getPatientLiveQueue to identify patient's own slot
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
      bookingMode: data.bookingMode ?? 'slot',
      clinicInfo: data.clinicInfo ?? null,
    },
  });
}

export async function createManySchedules(doctorProfileId: string, schedules: CreateScheduleInput[]) {
  return prisma.doctorSchedule.createMany({
    data: schedules.map((data) => ({
      doctorProfileId,
      scheduleDate: data.scheduleDate,
      startAt: data.startAt,
      endAt: data.endAt,
      slotDurationMins: data.slotDurationMins,
      maxPatients: data.maxPatients,
      isPublished: data.isPublished ?? true,
      bookingMode: data.bookingMode ?? 'slot',
      clinicInfo: data.clinicInfo ?? null,
    })),
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
