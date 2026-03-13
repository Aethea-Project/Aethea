/**
 * Doctors Controller — doctor discovery and self-management endpoints
 */

import { Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { parsePagination, paginatedResult } from '../lib/pagination.js';
import {
  getDoctorList,
  getDoctorDetail,
  getMyProfile,
  upsertMyProfile,
  getPublishedSchedules,
  getMarketplacePosts,
  createDoctorSchedule,
} from '../services/doctorService.js';
import type { CreateScheduleInput } from '../repositories/scheduleRepository.js';

/** GET /doctors — list verified doctors (any authenticated user) */
export const listDoctors = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = parsePagination(req);
  const { specialty, city, search } = req.query as Record<string, string | undefined>;
  const { doctors, total } = await getDoctorList({ specialty, city, search }, page, limit);
  res.json(paginatedResult(doctors, total, page, limit));
};

/** GET /doctors/:id — get a single doctor's public profile */
export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  if (!id) throw AppError.badRequest('Missing doctor id');
  const doctor = await getDoctorDetail(id);
  res.json({ doctor });
};

/** GET /doctors/:id/schedules — list a doctor's published schedules with slot occupancy */
export const getDoctorSchedules = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  if (!id) throw AppError.badRequest('Missing doctor id');
  const { page, limit } = parsePagination(req);
  const { from: fromStr, to: toStr } = req.query as Record<string, string | undefined>;
  const from = fromStr ? new Date(fromStr) : undefined;
  const to   = toStr   ? new Date(toStr)   : undefined;

  const { schedules, total } = await getPublishedSchedules(id, from, to, page, limit);
  res.json(paginatedResult(schedules, total, page, limit));
};

/** GET /doctors/marketplace/posts — list published schedule posts globally */
export const listMarketplaceSchedulePosts = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = parsePagination(req);
  const {
    specialty,
    city,
    search,
    date: dateStr,
  } = req.query as Record<string, string | undefined>;

  const date = dateStr ? new Date(dateStr) : undefined;
  const { schedules, total } = await getMarketplacePosts(
    { specialty, city, search, date },
    page,
    limit,
  );
  res.json(paginatedResult(schedules, total, page, limit));
};

/** GET /doctors/me/profile — doctor reads their own profile */
export const getMyDoctorProfile = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const profile = await getMyProfile(user.id);
  res.json({ profile });
};

/** PUT /doctors/me/profile — doctor creates or updates their own profile */
export const upsertDoctorProfile = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const profile = await upsertMyProfile(user.id, req.body);
  res.json({ profile });
};

/** POST /doctors/me/schedules — doctor posts a new schedule */
export const createMySchedule = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const schedule = await createDoctorSchedule(user.id, req.body as CreateScheduleInput);
  res.status(201).json({ schedule });
};
