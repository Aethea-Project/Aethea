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
