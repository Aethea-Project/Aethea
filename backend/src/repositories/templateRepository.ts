/**
 * Template Repository — typed queries for doctor_weekly_templates and doctor_schedule_exceptions
 */

import prisma from '../lib/prisma.js';

export interface WeeklyTemplateInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  maxCases: number;
  bookingMode: string;
  isActive: boolean;
  clinicInfo?: any;
}

export interface ScheduleExceptionInput {
  exceptionDate: Date;
  type: 'unavailable' | 'modified_hours';
  reason?: string;
  startTime?: string;
  endTime?: string;
}

/** Get all weekly templates for a doctor, ordered by dayOfWeek */
export async function getWeeklyTemplates(doctorProfileId: string) {
  return prisma.doctorWeeklyTemplate.findMany({
    where: { doctorProfileId },
    orderBy: { dayOfWeek: 'asc' },
  });
}

/** Replace all weekly templates for a doctor (delete + create in a transaction) */
export async function saveWeeklyTemplates(
  doctorProfileId: string,
  templates: WeeklyTemplateInput[],
) {
  return prisma.$transaction(async (tx) => {
    // Delete all existing templates for this doctor
    await tx.doctorWeeklyTemplate.deleteMany({
      where: { doctorProfileId },
    });

    // Create the new templates
    if (templates.length === 0) return [];

    await tx.doctorWeeklyTemplate.createMany({
      data: templates.map((t) => ({
        doctorProfileId,
        dayOfWeek: t.dayOfWeek,
        startTime: t.startTime,
        endTime: t.endTime,
        slotDurationMins: t.slotDurationMins,
        maxCases: t.maxCases,
        bookingMode: t.bookingMode,
        isActive: t.isActive,
        clinicInfo: t.clinicInfo ?? null,
      })),
    });

    // Return the newly created templates
    return tx.doctorWeeklyTemplate.findMany({
      where: { doctorProfileId },
      orderBy: { dayOfWeek: 'asc' },
    });
  });
}

/** Get schedule exceptions for a doctor, optionally filtered by date range */
export async function getScheduleExceptions(
  doctorProfileId: string,
  from?: Date,
  to?: Date,
) {
  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = from;
  if (to) dateFilter.lte = to;

  return prisma.doctorScheduleException.findMany({
    where: {
      doctorProfileId,
      ...(Object.keys(dateFilter).length > 0 ? { exceptionDate: dateFilter } : {}),
    },
    orderBy: { exceptionDate: 'asc' },
  });
}

/** Create a schedule exception */
export async function createScheduleException(
  doctorProfileId: string,
  data: ScheduleExceptionInput,
) {
  return prisma.doctorScheduleException.create({
    data: {
      doctorProfileId,
      exceptionDate: data.exceptionDate,
      type: data.type,
      reason: data.reason ?? null,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
    },
  });
}

/** Delete a schedule exception by id */
export async function deleteScheduleException(id: string) {
  return prisma.doctorScheduleException.delete({
    where: { id },
  });
}

/** Find an exception by doctor + specific date */
export async function getExceptionByDate(doctorProfileId: string, date: Date) {
  return prisma.doctorScheduleException.findUnique({
    where: {
      doctorProfileId_exceptionDate: {
        doctorProfileId,
        exceptionDate: date,
      },
    },
  });
}

/** Find exception by id */
export async function getExceptionById(id: string) {
  return prisma.doctorScheduleException.findUnique({
    where: { id },
  });
}
