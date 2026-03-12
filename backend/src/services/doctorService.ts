/**
 * Doctor Service — business logic for doctor discovery and profile management
 */

import { AppError } from '../lib/AppError.js';
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
  getScheduleById,
  createSchedule,
  type CreateScheduleInput,
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
