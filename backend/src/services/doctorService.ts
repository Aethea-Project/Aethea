/**
 * Doctor Service — business logic for doctor discovery and profile management
 */

import { AppError } from '../lib/AppError.js';
import prisma from '../lib/prisma.js';
import { CompositeDeliveryStrategy, InAppStrategy, EmailStrategy } from './notifications/DeliveryStrategies.js';
import { NotificationFactory } from './notifications/NotificationFactory.js';
import {
  listDoctors,
  getDoctorProfileById,
  getDoctorProfileByUserId,
  upsertDoctorProfile,
  type DoctorListFilters,
  type UpsertDoctorProfileInput,
} from '../repositories/doctorRepository.js';
import {
  listDoctorSchedules,
  listMarketplaceSchedules,
  getScheduleById,
  createSchedule,
  createManySchedules,
  deleteSchedule,
  type CreateScheduleInput,
  type MarketplaceScheduleFilters,
} from '../repositories/scheduleRepository.js';
import {
  getWeeklyTemplates,
  saveWeeklyTemplates,
  getScheduleExceptions,
  deleteScheduleException,
  getExceptionById,
  type WeeklyTemplateInput,
  type ScheduleExceptionInput,
} from '../repositories/templateRepository.js';
import { isFutureCairoDay } from '../utils/timezoneHelper.js';
import { cancelAndNotifyReservations } from '../utils/notificationHelper.js';

/* ─── Doctor discovery ─── */

export async function getDoctorList(
  filters: DoctorListFilters,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const { rows, total } = await listDoctors(filters, skip, limit);
  return { doctors: rows, total };
}

export async function getDoctorDetail(doctorProfileId: string) {
  const profile = await getDoctorProfileById(doctorProfileId);
  if (!profile) {
    throw AppError.notFound('Doctor not found');
  }
  return profile;
}

export async function getDistinctSpecialties() {
  const records = await prisma.doctorProfile.findMany({
    where: { verified: true },
    distinct: ['specialty'],
    select: { specialty: true },
  });
  return records.map((r) => r.specialty).filter(Boolean).sort();
}

/* ─── Doctor's own profile management ─── */

export async function getMyProfile(userId: string) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Doctor profile not found. Create your profile first.');
  }
  return profile;
}

export async function upsertMyProfile(userId: string, data: UpsertDoctorProfileInput) {
  return upsertDoctorProfile(userId, data);
}

/* ─── Doctor's schedule management ─── */

export async function getPublishedSchedules(
  doctorProfileId: string,
  from: Date | undefined,
  to: Date | undefined,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  return listDoctorSchedules(doctorProfileId, from, to, skip, limit);
}

export async function getMarketplacePosts(
  filters: MarketplaceScheduleFilters,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const { schedules, total } = await listMarketplaceSchedules(filters, skip, limit);
  return { schedules, total };
}

export async function createDoctorSchedule(userId: string, data: CreateScheduleInput) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Create your doctor profile before posting a schedule.');
  }

  const startAt = new Date(data.startAt as unknown as string);
  const endAt   = new Date(data.endAt as unknown as string);
  const scheduleDate = new Date(data.scheduleDate as unknown as string);

  // Enforce that schedule must be for tomorrow or later in Cairo local time
  if (!isFutureCairoDay(startAt)) {
    throw AppError.badRequest('Schedules can only be created for future calendar days (tomorrow or later).');
  }

  if (endAt <= startAt) {
    throw AppError.badRequest('endAt must be after startAt');
  }

  // Check for overlapping schedules
  const overlappingSchedule = await prisma.doctorSchedule.findFirst({
    where: {
      doctorProfileId: profile.id,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  if (overlappingSchedule) {
    throw AppError.badRequest('You have an existing schedule that overlaps with this time range.');
  }

  const durationMs = endAt.getTime() - startAt.getTime();
  const totalSlots = Math.floor(durationMs / (data.slotDurationMins * 60_000));
  if (totalSlots < data.maxPatients) {
    throw AppError.badRequest(
      `Time window only fits ${totalSlots} slots but maxPatients is ${data.maxPatients}`,
    );
  }

  return createSchedule(profile.id, {
    scheduleDate,
    startAt,
    endAt,
    slotDurationMins: data.slotDurationMins,
    maxPatients: data.maxPatients,
    isPublished: data.isPublished ?? false,
    bookingMode: data.bookingMode ?? 'slot',
    clinicInfo: data.clinicInfo ?? null,
  });
}

export async function getScheduleDetail(scheduleId: string) {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) {
    throw AppError.notFound('Schedule not found');
  }
  return schedule;
}

export async function removeDoctorSchedule(userId: string, scheduleId: string, reason: string) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Profile not found');
  }

  const schedule = await getScheduleById(scheduleId);
  if (!schedule) {
    throw AppError.notFound('Schedule not found');
  }

  if (schedule.doctorProfileId !== profile.id) {
    throw AppError.forbidden("Cannot delete another doctor's schedule");
  }

  if (schedule.isPublished) {
    throw AppError.badRequest('Published live schedules cannot be cancelled via the app. Please contact support.');
  }

  await cancelAndNotifyReservations(
    scheduleId,
    profile.firstName,
    profile.lastName,
    schedule.scheduleDate,
    reason,
    { scheduleId }
  );

  await deleteSchedule(scheduleId);
  
  // Notify the doctor that their schedule has been successfully cancelled
  const doctorStrategy = new InAppStrategy();
  await doctorStrategy.deliver(
    NotificationFactory.buildGeneric(
      userId,
      'reservation_cancelled',
      'Schedule Cancelled Successfully',
      `You have successfully cancelled your schedule on ${new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'Africa/Cairo' }).format(new Date(schedule.scheduleDate))}. All booked patients have been notified.`,
    )
  );
}

/* ─── Weekly template management ─── */

export async function getMyWeeklyTemplate(userId: string) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Create your doctor profile before managing templates.');
  }
  return getWeeklyTemplates(profile.id);
}

export async function saveMyWeeklyTemplate(userId: string, templates: WeeklyTemplateInput[]) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Create your doctor profile before managing templates.');
  }

  // Validate: no duplicate days
  const days = templates.map((t) => t.dayOfWeek);
  if (new Set(days).size !== days.length) {
    throw AppError.badRequest('Duplicate day of week entries are not allowed.');
  }

  // Validate: end time must be after start time
  for (const t of templates) {
    if (t.endTime <= t.startTime) {
      throw AppError.badRequest(`End time must be after start time for day ${t.dayOfWeek}.`);
    }
  }

  return saveWeeklyTemplates(profile.id, templates);
}

/* ─── Schedule exception management ─── */

export async function getMyScheduleExceptions(userId: string, from?: Date, to?: Date) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Create your doctor profile first.');
  }
  return getScheduleExceptions(profile.id, from, to);
}

export async function createMyScheduleException(userId: string, data: ScheduleExceptionInput) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Create your doctor profile first.');
  }

  // If a DoctorSchedule exists for this date, cancel it and notify patients
  const existingSchedules = await prisma.doctorSchedule.findMany({
    where: {
      doctorProfileId: profile.id,
      scheduleDate: data.exceptionDate,
    },
  });

  for (const schedule of existingSchedules) {
    await cancelAndNotifyReservations(
      schedule.id,
      profile.firstName,
      profile.lastName,
      data.exceptionDate,
      data.reason || 'Day off',
      { reason: data.reason }
    );
  }

  // Atomically delete schedules and create the schedule exception in a transaction
  return prisma.$transaction(async (tx) => {
    if (existingSchedules.length > 0) {
      await tx.doctorSchedule.deleteMany({
        where: {
          id: { in: existingSchedules.map((s) => s.id) },
        },
      });
    }

    return tx.doctorScheduleException.create({
      data: {
        doctorProfileId: profile.id,
        exceptionDate: data.exceptionDate,
        type: data.type,
        reason: data.reason ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
      },
    });
  });
}

export async function deleteMyScheduleException(userId: string, exceptionId: string) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Profile not found');
  }

  const exception = await getExceptionById(exceptionId);
  if (!exception) {
    throw AppError.notFound('Exception not found');
  }

  if (exception.doctorProfileId !== profile.id) {
    throw AppError.forbidden("Cannot delete another doctor's exception");
  }

  return deleteScheduleException(exceptionId);
}

/* ─── Schedule generation from template ─── */

export async function generateSchedulesFromTemplate(userId: string, weeksAhead: number, timezoneOffset?: number) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Create your doctor profile before generating schedules.');
  }

  // Get active weekly templates
  const templates = (await getWeeklyTemplates(profile.id)).filter((t) => t.isActive);
  if (templates.length === 0) {
    throw AppError.badRequest('No active weekly templates found. Set your weekly hours first.');
  }

  // Build a map of dayOfWeek -> template for O(1) lookup
  const templateByDay = new Map(templates.map((t) => [t.dayOfWeek, t]));

  // Calculate local today and construct UTC start date
  const doctorNow = new Date();
  if (timezoneOffset !== undefined) {
    doctorNow.setMinutes(doctorNow.getMinutes() - timezoneOffset);
  }
  const doctorYear = doctorNow.getUTCFullYear();
  const doctorMonth = doctorNow.getUTCMonth();
  const doctorDay = doctorNow.getUTCDate();

  const startDate = new Date(Date.UTC(doctorYear, doctorMonth, doctorDay, 0, 0, 0, 0));
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + weeksAhead * 7);

  const exceptions = await getScheduleExceptions(profile.id, startDate, endDate);
  const exceptionByDate = new Map(
    exceptions.map((e) => [new Date(e.exceptionDate).toISOString().split('T')[0], e]),
  );

  // Get existing schedules for the date range to avoid duplicates
  const existingSchedules = await prisma.doctorSchedule.findMany({
    where: {
      doctorProfileId: profile.id,
      scheduleDate: { gte: startDate, lte: endDate },
    },
    select: { scheduleDate: true },
  });
  const existingDates = new Set(
    existingSchedules.map((s) => new Date(s.scheduleDate).toISOString().split('T')[0]),
  );

  const schedulesToCreate: CreateScheduleInput[] = [];
  let skipped = 0;

  // Loop through each day in the range
  const currentDate = new Date(startDate);
  const now = new Date();
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dateKey = currentDate.toISOString().split('T')[0];

    const template = templateByDay.get(dayOfWeek);
    if (!template) {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      continue;
    }

    // Check if an exception exists for this date
    const exception = exceptionByDate.get(dateKey);
    if (exception?.type === 'unavailable') {
      skipped++;
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      continue;
    }

    // Check if a schedule already exists
    if (existingDates.has(dateKey)) {
      skipped++;
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      continue;
    }

    // Use exception's hours if modified_hours, otherwise use template
    const startTime = exception?.type === 'modified_hours' && exception.startTime
      ? exception.startTime
      : template.startTime;
    const endTime = exception?.type === 'modified_hours' && exception.endTime
      ? exception.endTime
      : template.endTime;

    // Parse times and build full datetime
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const scheduleDate = new Date(currentDate);
    
    // Construct UTC startAt and endAt based on template/exception local time and timezoneOffset
    const startAt = new Date(currentDate);
    const startLocalMins = startHour * 60 + startMin;
    const startUtcMins = startLocalMins + (timezoneOffset ?? 0);
    startAt.setMinutes(startAt.getMinutes() + startUtcMins);

    const endAt = new Date(currentDate);
    const endLocalMins = endHour * 60 + endMin;
    const endUtcMins = endLocalMins + (timezoneOffset ?? 0);
    endAt.setMinutes(endAt.getMinutes() + endUtcMins);

    if (!isFutureCairoDay(startAt, now)) {
      skipped++;
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      continue;
    }

    // Calculate maxPatients from time range and slot duration
    const durationMs = endAt.getTime() - startAt.getTime();
    const slotDurationMins = exception?.type === 'modified_hours'
      ? template.slotDurationMins // keep the same slot duration even on modified hours
      : template.slotDurationMins;
    const maxPatients = template.bookingMode === 'token' ? template.maxCases : Math.floor(durationMs / (slotDurationMins * 60_000));

    if (maxPatients <= 0) {
      skipped++;
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      continue;
    }

    schedulesToCreate.push({
      scheduleDate,
      startAt,
      endAt,
      slotDurationMins,
      maxPatients,
      isPublished: false, // Default to Draft for Wizard/Template generation
      bookingMode: template.bookingMode,
      clinicInfo: template.clinicInfo ?? null,
    });

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  if (schedulesToCreate.length > 0) {
    await createManySchedules(profile.id, schedulesToCreate);
  }

  return { created: schedulesToCreate.length, skipped };
}

export async function getDoctorSharedRecords(userId: string, page: number, limit: number) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Doctor profile not found. Create your profile first.');
  }

  const skip = (page - 1) * limit;
  const where = {
    doctorSchedule: {
      doctorProfileId: profile.id,
    },
    shareHealthData: true,
  };

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        doctorSchedule: true,
      },
      orderBy: {
        startAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return { reservations, total };
}

export async function publishSchedules(userId: string, scheduleIds: string[]) {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw AppError.notFound('Doctor profile not found.');
  }

  const result = await prisma.doctorSchedule.updateMany({
    where: {
      id: { in: scheduleIds },
      doctorProfileId: profile.id,
      isPublished: false,
    },
    data: {
      isPublished: true,
    },
  });

  return { publishedCount: result.count };
}

