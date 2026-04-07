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
 * POST /api/auth/step-up/verify
 */
export const stepUpVerifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits'),
}).strict();

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

export const requestProfileUpdateSchema = z.object({
  password: z.string().min(6),
}).strict();

export const verifyProfileUpdateSchema = z.object({
  code: z.string().length(6),
  updates: updateProfileSchema,
}).strict();

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
  doctorScheduleId: z.string().uuid(),
  slotIndex: z.number().int().min(0),
  reason: z.string().min(2).max(500),
  notes: z.string().max(500).optional(),
  shareHealthData: z.boolean().default(false),
  notifyOnCancel: z.boolean().default(false),
}).strict();

export const updateReservationStatusSchema = z.object({
  status: reservationStatusEnum,
  notes: z.string().max(500).optional(),
}).strict();

export const reservationAvailabilityAlertSchema = z.object({
  doctorScheduleId: z.string().uuid(),
}).strict();

/**
 * Doctor discovery query
 */
export const doctorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  specialty: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(120).optional(),
}).strict();

/**
 * Doctor schedule query (list open slots for a doctor)
 */
export const scheduleQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
}).strict();

/**
 * Marketplace schedule posts query
 */
export const marketplaceScheduleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  specialty: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  date: z.string().date().optional(),
}).strict();

/**
 * Doctor profile — create / update (doctor-side)
 */
export const upsertDoctorProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  specialty: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(1000).optional(),
  clinicName: z.string().trim().max(200).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  consultFee: z.number().int().min(0).max(100_000).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
}).strict();

/**
 * Doctor schedule — create
 */
export const createDoctorScheduleSchema = z.object({
  scheduleDate: z.string().date(),  // 'YYYY-MM-DD'
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  slotDurationMins: z.number().int().min(10).max(120),
  maxPatients: z.number().int().min(1).max(50),
  isPublished: z.boolean().default(true).optional(),
}).strict();

/**
 * Notifications — mark as read
 */
export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
}).strict();

/**
 * Admin user management
 */
const accountTypeEnum = z.enum(['patient', 'doctor', 'pharmacist', 'admin']);
const accountStatusEnum = z.enum(['pending', 'active', 'suspended', 'rejected']);

export const adminListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  accountType: accountTypeEnum.optional(),
  accountStatus: accountStatusEnum.optional(),
  search: z.string().trim().min(1).max(120).optional(),
}).strict();

export const adminCreateUserSchema = z.object({
  email: z.string().trim().email().max(254),
  temporaryPassword: z.string().min(12).max(128),
  accountType: accountTypeEnum,
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
}).strict();

export const adminUpdateUserStatusSchema = z.object({
  accountStatus: accountStatusEnum,
  reason: z.string().trim().min(3).max(500).optional(),
}).strict().superRefine((value, ctx) => {
  const reasonRequired = value.accountStatus === 'rejected' || value.accountStatus === 'suspended';
  if (reasonRequired && !value.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'reason is required when status is rejected or suspended',
    });
  }
});

export const adminUpdateUserAccountTypeSchema = z.object({
  accountType: accountTypeEnum,
}).strict();

export const adminUpdateUserProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  gender: z.enum(['male', 'female']).optional(),
  phone: z.string().trim().max(20).optional(),
  dateOfBirth: z.string().date().optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().trim().max(500).optional(),
  chronicConditions: z.string().trim().max(500).optional(),
  heightCm: z.number().min(30).max(300).optional(),
  weightKg: z.number().min(1).max(500).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
}).strict();

const auditActionEnum = z.enum([
  'user.approve',
  'user.suspend',
  'user.reject',
  'user.create',
  'staff.review_approve',
  'staff.review_reject',
]);

export const adminAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  actorId: z.string().uuid().optional(),
  action: auditActionEnum.optional(),
  targetId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
}).strict();

/**
 * Staff verification flow
 */
const storageBucketEnum = z.enum(['staff-documents', 'staff-selfies']);
const verificationStatusEnum = z.enum(['unverified', 'under_review', 'verified', 'rejected']);

export const staffVerificationUploadUrlSchema = z.object({
  bucket: storageBucketEnum,
  fileName: z.string().trim().min(3).max(140),
}).strict();

export const staffVerificationSubmitSchema = z.object({
  governmentIdPath: z.string().trim().min(3).max(255),
  certificateFilePath: z.string().trim().min(3).max(255),
  selfieFilePath: z.string().trim().min(3).max(255),
  specialty: z.string().trim().min(2).max(120),
  affiliationName: z.string().trim().min(2).max(180),
  affiliationType: z.enum(['hospital', 'clinic', 'pharmacy', 'other']),
}).strict();

export const adminVerificationQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  status: verificationStatusEnum.default('under_review').optional(),
}).strict();

export const adminReviewVerificationSchema = z.object({
  verificationStatus: z.enum(['verified', 'rejected']),
  notes: z.string().trim().min(3).max(500).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.verificationStatus === 'rejected' && !value.notes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'notes is required when rejecting verification',
    });
  }
});
