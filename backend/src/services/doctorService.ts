/**
 * Doctor Service — business logic for doctor discovery and profile management
 */

import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';
import prisma from '../lib/prisma.js';
import { sendReservationCancelledEmail } from './emailService.js';
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
  deleteSchedule,
  type CreateScheduleInput,
  type MarketplaceScheduleFilters,
} from '../repositories/scheduleRepository.js';

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

  if (endAt <= startAt) {
    throw AppError.badRequest('endAt must be after startAt');
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
    isPublished: data.isPublished ?? true,
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

  const reservations = await prisma.reservation.findMany({
    where: {
      doctorScheduleId: scheduleId,
      status: { not: 'cancelled' },
    },
    select: { 
      userId: true, 
      startAt: true, 
      endAt: true,
      user: { select: { email: true } },
    },
  });

  if (reservations.length > 0) {
    const defaultDateStr = new Intl.DateTimeFormat('en-US', { 
      dateStyle: 'full', 
      timeZone: 'Africa/Cairo' 
    }).format(new Date(schedule.scheduleDate));

    await prisma.notification.createMany({
      data: reservations.map(r => ({
        userId: r.userId,
        type: 'reservation_cancelled',
        title: 'Reservation Cancelled by Doctor',
        body: `Your appointment on ${defaultDateStr} was cancelled by Dr. ${profile.firstName} ${profile.lastName}. Reason given: ${reason}. We apologize for the inconvenience and the situation will be reviewed to ensure accountability.`,
      })),
    });

    // Send emails in parallel
    await Promise.all(
      reservations.map(r => 
        sendReservationCancelledEmail({
          to: r.user.email,
          doctorName: `${profile.firstName} ${profile.lastName}`,
          specialty: profile.specialty,
          clinic: profile.clinicName ?? undefined,
          startAt: r.startAt,
          endAt: r.endAt,
          reason,
        }).catch(err => {
          // just log email errors, don't fail the deletion
          logger.warn({ err, email: r.user.email }, 'Failed to send cancellation email');
        })
      )
    );
  }

  await deleteSchedule(scheduleId);
  
  // Create a notification for the doctor as well
  await prisma.notification.create({
    data: {
      userId,
      type: 'reservation_cancelled',
      title: 'Schedule Cancelled Successfully',
      body: `You have successfully cancelled your schedule on ${new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'Africa/Cairo' }).format(new Date(schedule.scheduleDate))}. All booked patients have been notified.`,
    }
  });
}
