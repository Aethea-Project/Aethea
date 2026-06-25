import { z } from 'zod';

export const DoctorProfileResponseSchema = z.object({
  id: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  specialty: z.string(),
  clinicName: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  locationUrl: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

export const DoctorScheduleResponseSchema = z.object({
  id: z.string().optional(),
  scheduleDate: z.union([z.string(), z.date()]).optional(),
  startAt: z.union([z.string(), z.date(), z.unknown()]).optional(),
  endAt: z.union([z.string(), z.date(), z.unknown()]).optional(),
  doctorProfile: DoctorProfileResponseSchema.optional(),
});

export const ReservationResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  doctorScheduleId: z.string(),
  slotIndex: z.number(),
  status: z.string(),
  startAt: z.union([z.string(), z.date()]),
  endAt: z.union([z.string(), z.date()]),
  cancelDeadlineAt: z.union([z.string(), z.date()]),
  reason: z.string(),
  notes: z.string().nullable().optional(),
  shareHealthData: z.boolean(),
  notifyOnCancel: z.boolean(),
  feedbackSubmitted: z.boolean().optional(),
  doctorSchedule: DoctorScheduleResponseSchema.optional(),
});

export type ReservationResponse = z.infer<typeof ReservationResponseSchema>;

/**
 * Helper to serialize a reservation or array of reservations using Zod output DTO schemas.
 * This guarantees no raw internal database properties (such as updatedAt, deletedAt, raw DB passwords, or other metadata) are leaked.
 */
export const serializeReservation = (data: unknown): ReservationResponse => {
  return ReservationResponseSchema.parse(data);
};

export const serializeReservationList = (data: unknown[]): ReservationResponse[] => {
  return z.array(ReservationResponseSchema).parse(data);
};
