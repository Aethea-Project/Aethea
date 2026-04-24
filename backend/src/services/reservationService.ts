/**
 * Reservation Service — business logic for booking and managing reservations
 *
 * Enforces:
 *  - slot availability (unique constraint guard)
 *  - 6-hour cancellation deadline
 *  - server-side anonymization (doctor view never exposes patient identity)
 */

import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';
import prisma from '../lib/prisma.js';
import {
  createReservation,
  getActiveReservationCountForSchedule,
  listPatientReservations,
  getReservationById,
  cancelReservation as repoCancelReservation,
  updateReservationStatus as repoUpdateStatus,
  hasPatientBookedSchedule,
} from '../repositories/reservationRepository.js';
import {
  getScheduleById,
  getScheduleWithReservations,
  isSlotBooked,
} from '../repositories/scheduleRepository.js';
import { getDoctorProfileByUserId } from '../repositories/doctorRepository.js';
import { createNotification } from '../repositories/notificationRepository.js';
import {
  deactivateReservationAlertSubscriptions,
  listActiveReservationAlertSubscribers,
  upsertReservationAlertSubscription,
} from '../repositories/reservationAlertRepository.js';
import {
  sendReservationBookedEmail,
  sendReservationCancelledEmail,
  sendSlotAvailableEmail,
} from './emailService.js';

const CANCEL_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface BookReservationInput {
  patientEmail?: string;
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

  if (schedule.doctorProfile.userId === patientUserId) {
    throw AppError.badRequest('Doctors cannot book reservations with themselves');
  }

  if (input.slotIndex < 0 || input.slotIndex >= schedule.maxPatients) {
    throw AppError.badRequest(
      `slotIndex must be between 0 and ${schedule.maxPatients - 1}`,
    );
  }

  const hasBooked = await hasPatientBookedSchedule(patientUserId, schedule.id);
  if (hasBooked) {
    throw AppError.conflict('You have already booked a slot on this schedule.');
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
  const dateStr = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(slotStartAt);
  const timeStr = new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(slotStartAt);
  const customDateStr = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'Africa/Cairo' }).format(new Date(schedule.scheduleDate));

  await createNotification(
    doctorUserId,
    'reservation_confirmed',
    'New Booking',
    `A patient has booked slot ${input.slotIndex + 1} on your schedule for ${dateStr} at ${timeStr}.`,
    { reservationId: reservation.id },
  );

  // Check capacity for doctor alerts
  const newActiveCount = await getActiveReservationCountForSchedule(input.doctorScheduleId);
  const ratio = newActiveCount / schedule.maxPatients;
  const previousRatio = (newActiveCount - 1) / schedule.maxPatients;

  if (ratio === 1) {
    await createNotification(
      doctorUserId,
      'reservation_confirmed',
      'Schedule Fully Booked',
      `Your schedule for ${customDateStr} is now 100% full.`,
      { scheduleId: schedule.id }
    );
  } else if (ratio >= 0.7 && previousRatio < 0.7) {
    await createNotification(
      doctorUserId,
      'reservation_confirmed',
      'Schedule 70% Booked',
      `Your schedule for ${customDateStr} is now 70% full.`,
      { scheduleId: schedule.id }
    );
  }

  if (input.patientEmail) {
    const doctorName = `Dr. ${schedule.doctorProfile.firstName} ${schedule.doctorProfile.lastName}`;
    await sendReservationBookedEmail({
      to: input.patientEmail,
      doctorName,
      specialty: schedule.doctorProfile.specialty,
      startAt: slotStartAt,
      endAt: slotEndAt,
      clinic: schedule.doctorProfile.clinicName ?? undefined,
    });
  }

  return reservation;
}

export async function subscribeAvailabilityAlert(input: {
  patientUserId: string;
  patientEmail?: string;
  doctorScheduleId: string;
}) {
  const schedule = await getScheduleById(input.doctorScheduleId);
  if (!schedule || !schedule.isPublished) {
    throw AppError.notFound('Schedule not found or not available');
  }

  const activeCount = await getActiveReservationCountForSchedule(input.doctorScheduleId);
  if (activeCount < schedule.maxPatients) {
    throw AppError.badRequest('This schedule currently has available slots. You can book immediately.');
  }

  await upsertReservationAlertSubscription(
    input.patientUserId,
    input.doctorScheduleId,
    input.patientEmail,
  );
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

  const doctorName = `Dr. ${reservation.doctorSchedule.doctorProfile.firstName} ${reservation.doctorSchedule.doctorProfile.lastName}`;

  // Send patient confirmation email for successful cancellation (best-effort)
  if (reservation.user?.email) {
    await sendReservationCancelledEmail({
      to: reservation.user.email,
      doctorName,
      specialty: reservation.doctorSchedule.doctorProfile.specialty,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      clinic: reservation.doctorSchedule.doctorProfile.clinicName ?? undefined,
    });
  }

  // Best-effort side effects only. Cancellation has already succeeded above.
  try {
    // Notify the doctor if the patient opted in
    if (reservation.notifyOnCancel) {
      const doctorUserId = reservation.doctorSchedule.doctorProfile.userId;
      const dateStr = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(reservation.startAt);
      await createNotification(
        doctorUserId,
        'reservation_cancelled',
        'Booking Cancelled',
        `A patient cancelled their appointment on ${dateStr} (slot ${reservation.slotIndex + 1}).`,
        { reservationId },
      );
    }

    const alertSubscribers = await listActiveReservationAlertSubscribers(
      reservation.doctorScheduleId,
      userId,
    );

    if (alertSubscribers.length > 0) {
      const title = 'Slot Available';
      const body = `A slot is now available with ${doctorName} on ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(reservation.startAt)}.`;

      for (const subscriber of alertSubscribers) {
        await createNotification(
          subscriber.userId,
          'slot_available',
          title,
          body,
          {
            doctorScheduleId: reservation.doctorScheduleId,
            releasedReservationId: reservationId,
          },
        );

        if (subscriber.email) {
          await sendSlotAvailableEmail({
            to: subscriber.email,
            doctorName,
            specialty: reservation.doctorSchedule.doctorProfile.specialty,
            scheduleDate: reservation.startAt,
            startAt: reservation.doctorSchedule.startAt,
            endAt: reservation.doctorSchedule.endAt,
          });
        }
      }

      await deactivateReservationAlertSubscriptions(
        reservation.doctorScheduleId,
        alertSubscribers.map((subscriber) => subscriber.userId),
      );
    }
  } catch (error) {
    logger.warn({ err: error, reservationId }, 'Reservation cancelled but post-cancel notifications failed');
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

/* ─── Doctor: view patient health data ─── */

export async function getPatientHealthData(reservationId: string, doctorUserId: string) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    throw AppError.notFound('Reservation not found');
  }

  // Authorization: verify this slot belongs to the doctor
  const profile = await getDoctorProfileByUserId(doctorUserId);
  if (!profile || profile.id !== reservation.doctorSchedule.doctorProfileId) {
    throw AppError.forbidden('Not authorized to access this patient data');
  }

  if (!reservation.shareHealthData) {
    throw AppError.forbidden('Patient has not shared their health data for this reservation');
  }

  // Check timeframe: doctor can view data if today is >= start of reservation day AND <= end of reservation day
  const now = new Date();
  
  const startOfDayStartAt = new Date(reservation.startAt);
  startOfDayStartAt.setHours(0, 0, 0, 0);
  
  const endOfDayEndAt = new Date(reservation.endAt);
  endOfDayEndAt.setHours(23, 59, 59, 999);

  if (now < startOfDayStartAt || now > endOfDayEndAt) {
    throw AppError.forbidden('Patient data can only be accessed on the day(s) of the reservation');
  }

  // Fetch patient data securely
  const [labTests, scans, conditions] = await Promise.all([
    prisma.labTest.findMany({
      where: { userId: reservation.userId },
      orderBy: { measuredAt: 'desc' },
    }),
    prisma.scan.findMany({
      where: { userId: reservation.userId },
      orderBy: { scanDate: 'desc' },
    }),
    prisma.patientCondition.findMany({
      where: { patientId: reservation.userId },
      orderBy: { detectedAt: 'desc' },
    }),
  ]);

  return {
    labTests,
    scans,
    conditions,
  };
}
