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
  removeDoctorSchedule,
  getMyWeeklyTemplate as getMyWeeklyTemplateService,
  saveMyWeeklyTemplate as saveMyWeeklyTemplateService,
  generateSchedulesFromTemplate as generateSchedulesFromTemplateService,
  getMyScheduleExceptions as getMyScheduleExceptionsService,
  createMyScheduleException as createMyScheduleExceptionService,
  deleteMyScheduleException as deleteMyScheduleExceptionService,
  getDoctorSharedRecords,
  publishSchedules,
  getDistinctSpecialties,
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

/** DELETE /doctors/me/schedules/:scheduleId — doctor deletes a schedule */
export const deleteMySchedule = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const reason = req.body?.reason || 'No reason provided';
  await removeDoctorSchedule(user.id, req.params.scheduleId as string, reason);
  res.status(204).send();
};

/** GET /doctors/me/weekly-template — doctor reads their weekly availability pattern */
export const getMyWeeklyTemplate = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const templates = await getMyWeeklyTemplateService(user.id);
  res.json({ templates });
};

/** PUT /doctors/me/weekly-template — doctor saves their weekly availability pattern */
export const saveMyWeeklyTemplateCtrl = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const templates = await saveMyWeeklyTemplateService(user.id, req.body.templates);
  res.json({ templates });
};

export const generateSchedules = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const result = await generateSchedulesFromTemplateService(user.id, req.body.weeksAhead, req.body.timezoneOffset);
  res.json(result);
};

/** GET /doctors/me/exceptions — list doctor's schedule exceptions */
export const getMyExceptions = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { from, to } = req.query as Record<string, string | undefined>;
  const exceptions = await getMyScheduleExceptionsService(
    user.id,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined,
  );
  res.json({ exceptions });
};

/** POST /doctors/me/exceptions — create a schedule exception (day off / modified hours) */
export const createMyException = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const exception = await createMyScheduleExceptionService(user.id, {
    exceptionDate: new Date(req.body.exceptionDate),
    type: req.body.type,
    reason: req.body.reason,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
  });
  res.status(201).json({ exception });
};

/** DELETE /doctors/me/exceptions/:exceptionId — remove a schedule exception */
export const deleteMyException = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  await deleteMyScheduleExceptionService(user.id, req.params.exceptionId as string);
  res.status(204).send();
};

/** GET /doctors/me/shared-records — list health records shared with this doctor */
export const listDoctorSharedRecords = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { page, limit } = parsePagination(req);
  const { reservations, total } = await getDoctorSharedRecords(user.id, page, limit);
  res.json(paginatedResult(reservations, total, page, limit));
};

/** PATCH /doctors/me/schedules/publish — publish draft schedules */
export const publishMySchedules = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { publishedCount } = await publishSchedules(user.id, req.body.scheduleIds as string[]);
  res.json({ publishedCount });
};

/** GET /doctors/specialties — list all distinct specialties with active doctors */
export const listSpecialties = async (req: Request, res: Response): Promise<void> => {
  const specialties = await getDistinctSpecialties();
  res.json({ specialties });
};

