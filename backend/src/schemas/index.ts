/**
 * Zod Request Schemas
 *
 * Source: OWASP REST Security — Input Validation
 *   "Validate input: length / range / format and type."
 *   "Define an appropriate request size limit and reject requests exceeding the limit."
 * Source: OWASP API3:2023 — Broken Object Property Level Authorization
 *   Explicit schemas prevent mass-assignment by only accepting declared fields.
 */

import { z } from 'zod';

/**
 * POST /api/auth/verify — no body needed, token comes from Authorization header.
 * We define an empty schema to reject any unexpected body payload.
 */
export const verifyTokenSchema = z.object({}).strict();

/**
 * PATCH /api/users/profile — update user profile
 * Only allows explicitly declared fields (prevents mass-assignment).
 */
export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  gender: z.enum(['male', 'female']).optional(),
  phone: z.string().max(20).optional(),
  dateOfBirth: z.string().optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().max(500).optional(),
  chronicConditions: z.string().max(500).optional(),
  heightCm: z.number().min(30).max(300).optional(),
  weightKg: z.number().min(1).max(500).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
}).strict(); // .strict() rejects any extra keys — prevents mass-assignment

/**
 * Pagination query params (reusable)
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
}).strict();

/**
 * Lab tests
 */
const labStatusEnum = z.enum(['normal', 'borderline', 'abnormal', 'critical']);

export const createLabTestSchema = z.object({
  testName: z.string().min(2).max(120),
  category: z.string().min(2).max(80),
  value: z.union([z.string(), z.number()]).transform((v) => v.toString()),
  unit: z.string().min(1).max(40),
  refMin: z.number().min(0).max(1_000_000).optional(),
  refMax: z.number().min(0).max(1_000_000).optional(),
  refText: z.string().max(120).optional(),
  status: labStatusEnum.default('normal').optional(),
  orderedBy: z.string().min(2).max(120),
  notes: z.string().max(500).optional(),
  measuredAt: z.string().datetime(),
}).strict();

export const updateLabTestSchema = createLabTestSchema.partial();

/**
 * Scans
 */
const scanPriorityEnum = z.enum(['routine', 'urgent', 'emergency']);
const scanStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'reviewed']);

export const createScanSchema = z.object({
  type: z.string().min(2).max(80),
  bodyPart: z.string().min(2).max(80),
  description: z.string().min(2),
  findings: z.string().optional(),
  radiologist: z.string().min(2).max(120),
  priority: scanPriorityEnum.default('routine').optional(),
  status: scanStatusEnum.default('pending').optional(),
  reportUrl: z.string().url().optional(),
  scanDate: z.string().datetime(),
}).strict();

export const updateScanSchema = createScanSchema.partial();

/**
 * Reservations / Appointments
 */
const reservationStatusEnum = z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']);

export const createReservationSchema = z.object({
  doctorName: z.string().min(2).max(120),
  specialty: z.string().min(2).max(120),
  reason: z.string().min(2),
  location: z.string().min(2).max(180),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  status: reservationStatusEnum.default('scheduled').optional(),
  notes: z.string().max(500).optional(),
}).strict();

export const updateReservationSchema = createReservationSchema.partial();
