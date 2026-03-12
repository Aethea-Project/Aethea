/**
 * Reservation Service — business logic for booking and managing reservations
 *
 * Enforces:
 *  - slot availability (unique constraint guard)
 *  - 6-hour cancellation deadline
 *  - server-side anonymization (doctor view never exposes patient identity)
 */

import { AppError } from '../lib/AppError.js';
import {
  createReservation,
  listPatientReservations,
  getReservationById,
  cancelReservation as repoCancelReservation,
  updateReservationStatus as repoUpdateStatus,
} from '../repositories/reservationRepository.js';
import {
  getScheduleById,
  getScheduleWithReservations,
  isSlotBooked,
} from '../repositories/scheduleRepository.js';
import { getDoctorProfileByUserId } from '../repositories/doctorRepository.js';
import { createNotification } from '../repositories/notificationRepository.js';

const CANCEL_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface BookReservationInput {
  doctorScheduleId: string;
  slotIndex: number;
  reason: string;
  notes?: string;
  shareHealthData: boolean;
  notifyOnCancel: boolean;
}

/* ─── Patient: book a slot ─── */

export async function bookReservation(patientUserId: string, input: BookReservationInput) {
  const schedule = await getScheduleById(input.doctorScheduleId);
  if (!schedule || !schedule.isPublished) {
    throw AppError.notFound('Schedule not found or not available');
  }

  if (input.slotIndex < 0 || input.slotIndex >= schedule.maxPatients) {
    throw AppError.badRequest(
      `slotIndex must be between 0 and ${schedule.maxPatients - 1}`,
    );
  }

  const alreadyBooked = await isSlotBooked(schedule.id, input.slotIndex);
  if (alreadyBooked) {
    throw AppError.conflict('This slot is already booked');
  }

  const slotStartAt = new Date(
    schedule.startAt.getTime() + input.slotIndex * schedule.slotDurationMins * 60_000,
  );
  const slotEndAt = new Date(slotStartAt.getTime() + schedule.slotDurationMins * 60_000);
  const cancelDeadlineAt = new Date(slotStartAt.getTime() - CANCEL_WINDOW_MS);

  const reservation = await createReservation(patientUserId, {
    doctorScheduleId: input.doctorScheduleId,
    slotIndex: input.slotIndex,
    startAt: slotStartAt,
    endAt: slotEndAt,
    cancelDeadlineAt,
    reason: input.reason,
    notes: input.notes,
    shareHealthData: input.shareHealthData,
    notifyOnCancel: input.notifyOnCancel,
  });

  // Notify the doctor
  const doctorUserId = schedule.doctorProfile.userId;
  const dateStr = slotStartAt.toLocaleDateString('en-US', { dateStyle: 'medium' });
  const timeStr = slotStartAt.toLocaleTimeString('en-US', { timeStyle: 'short' });
  await createNotification(
    doctorUserId,
    'reservation_confirmed',
    'New Booking',
    `A patient has booked slot ${input.slotIndex + 1} on your schedule for ${dateStr} at ${timeStr}.`,
    { reservationId: reservation.id },
  );

  return reservation;
}

/* ─── Patient: list own reservations ─── */

export async function getMyReservations(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  return listPatientReservations(userId, skip, limit);
}

/* ─── Patient: cancel a reservation ─── */

export async function cancelMyReservation(reservationId: string, userId: string) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    throw AppError.notFound('Reservation not found');
  }
  if (reservation.userId !== userId) {
    throw AppError.forbidden('Not your reservation');
  }
  if (['cancelled', 'completed', 'no_show'].includes(reservation.status)) {
    throw AppError.badRequest('Reservation cannot be cancelled in its current state');
  }
  if (new Date() > reservation.cancelDeadlineAt) {
    throw AppError.badRequest('Cancellation deadline has passed (6-hour window)');
  }

  const cancelled = await repoCancelReservation(reservationId);

  // Notify the doctor if the patient opted in
  if (reservation.notifyOnCancel) {
    const doctorUserId = reservation.doctorSchedule.doctorProfile.userId;
    const dateStr = reservation.startAt.toLocaleDateString('en-US', { dateStyle: 'medium' });
    await createNotification(
      doctorUserId,
      'reservation_cancelled',
      'Booking Cancelled',
      `A patient cancelled their appointment on ${dateStr} (slot ${reservation.slotIndex + 1}).`,
      { reservationId },
    );
  }

  return cancelled;
}

/* ─── Doctor: view schedule slots (anonymized) ─── */

export async function getDoctorScheduleSlots(scheduleId: string, doctorUserId: string) {
  const schedule = await getScheduleWithReservations(scheduleId);
  if (!schedule) {
    throw AppError.notFound('Schedule not found');
  }

  // Authorization: only the owning doctor
  const profile = await getDoctorProfileByUserId(doctorUserId);
  if (!profile || profile.id !== schedule.doctorProfileId) {
    throw AppError.forbidden('Not your schedule');
  }

  // Build anonymized slot list: Patient 1, Patient 2, etc.
  const bookedMap = new Map(schedule.reservations.map((r) => [r.slotIndex, r]));

  const totalSlots = schedule.maxPatients;
  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const booking = bookedMap.get(i);
    const slotStart = new Date(
      schedule.startAt.getTime() + i * schedule.slotDurationMins * 60_000,
    );
    const slotEnd = new Date(slotStart.getTime() + schedule.slotDurationMins * 60_000);

    if (!booking) {
      return { slotIndex: i, startAt: slotStart, endAt: slotEnd, status: 'available' };
    }

    return {
      slotIndex: i,
      startAt: slotStart,
      endAt: slotEnd,
      status: booking.status,
      reservationId: booking.id,
      // Anonymized label — patient identity never exposed to doctor
      patientLabel: `Patient ${i + 1}`,
      reason: booking.reason,
      shareHealthData: booking.shareHealthData,
    };
  });

  return {
    scheduleId: schedule.id,
    scheduleDate: schedule.scheduleDate,
    startAt: schedule.startAt,
    endAt: schedule.endAt,
    slotDurationMins: schedule.slotDurationMins,
    slots,
  };
}

/* ─── Doctor: update a slot's status ─── */

export async function updateSlotStatus(
  reservationId: string,
  doctorUserId: string,
  status: string,
  notes?: string,
) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    throw AppError.notFound('Reservation not found');
  }

  // Authorization: verify this slot belongs to the doctor
  const profile = await getDoctorProfileByUserId(doctorUserId);
  if (!profile || profile.id !== reservation.doctorSchedule.doctorProfileId) {
    throw AppError.forbidden('Not authorized to update this reservation');
  }

  return repoUpdateStatus(reservationId, status, notes);
}
