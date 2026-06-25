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
import { getPatientHealthSnapshot } from '../repositories/patientDataRepository.js';
import { createAuditLog } from '../repositories/auditRepository.js';
import {
  createReservation,
  getActiveReservationCountForSchedule,
  listPatientReservations,
  getReservationById,
  cancelReservation as repoCancelReservation,
  updateReservationStatus as repoUpdateStatus,
  hasPatientBookedSchedule,
  getPendingFeedbackReservation,
} from '../repositories/reservationRepository.js';
import {
  getScheduleById,
  getScheduleWithReservations,
  isSlotBooked,
} from '../repositories/scheduleRepository.js';
import { getDoctorProfileByUserId } from '../repositories/doctorRepository.js';
import { eventBus } from './notifications/EventBus.js';
import {
  upsertReservationAlertSubscription,
} from '../repositories/reservationAlertRepository.js';
import {
  sendReservationCancelledEmail,
} from './emailService.js';
import prisma from '../lib/prisma.js';
import { isDayBeforeOrEarlierCairo, getCairoDateParts } from '../utils/timezoneHelper.js';


export interface BookReservationInput {
  patientEmail?: string;
  doctorScheduleId: string;
  slotIndex: number;
  reason: string;
  notes?: string;
  shareHealthData: boolean;
  notifyOnCancel: boolean;
  patientLat?: number;
  patientLng?: number;
}

/* ─── Patient: book a slot ─── */

export async function bookReservation(patientUserId: string, input: BookReservationInput) {
  const schedule = await getScheduleById(input.doctorScheduleId);
  const now = new Date();
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

  // 1. Enforce "Book the Day Before" in Cairo timezone context
  if (!isDayBeforeOrEarlierCairo(slotStartAt, now)) {
    throw AppError.badRequest('Booking window is closed. You can only book appointments up to the day before the schedule starts.');
  }

  const { year: slotY, month: slotM, day: slotD } = getCairoDateParts(slotStartAt);

  // 2. Enforce Patient 2-Week Frequency limit per doctor
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const startRange = new Date(slotStartAt.getTime() - twoWeeksMs);
  const endRange = new Date(slotStartAt.getTime() + twoWeeksMs);

  const existingDoctorReservation = await prisma.reservation.findFirst({
    where: {
      userId: patientUserId,
      status: { notIn: ['cancelled', 'no_show'] },
      doctorSchedule: {
        doctorProfileId: schedule.doctorProfileId,
      },
      startAt: {
        gte: startRange,
        lte: endRange,
      },
    },
  });

  if (existingDoctorReservation) {
    throw AppError.badRequest('To ensure fair patient access, you can only book with the same doctor once every 2 weeks.');
  }

  const slotEndAt = new Date(slotStartAt.getTime() + schedule.slotDurationMins * 60_000);

  // 3. Keep the Patient Concurrency / Overlap check
  const overlappingReservation = await prisma.reservation.findFirst({
    where: {
      userId: patientUserId,
      status: { notIn: ['cancelled', 'no_show'] },
      startAt: { lt: slotEndAt },
      endAt: { gt: slotStartAt },
    },
  });

  if (overlappingReservation) {
    throw AppError.badRequest('You have an existing active reservation that overlaps with this slot.');
  }

  // 4. Set cancel deadline exactly 24 hours before the schedule's calendar day starts
  // Calculate cairoMidnight safely without system-local timezone parsing issues
  const midnightUtc = new Date(Date.UTC(slotY, slotM - 1, slotD, 0, 0, 0));
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const offsetHours = Number(hourFormatter.format(midnightUtc));
  const cairoMidnight = new Date(midnightUtc.getTime() - offsetHours * 60 * 60 * 1000);
  const cancelDeadlineAt = new Date(cairoMidnight.getTime() - 24 * 60 * 60 * 1000);

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

  // Resolve doctor user ID for the event
  const doctorUserId = schedule.doctorProfile.userId;

  eventBus.publish('RESERVATION_CREATED', {
    reservationId: reservation.id,
    patientId: patientUserId,
    doctorId: doctorUserId,
    scheduleId: input.doctorScheduleId,
    scheduleDate: schedule.scheduleDate,
    startAt: slotStartAt
  });

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

export async function getMyReservations(userId: string, page: number, limit: number, tab: 'upcoming' | 'past' | 'cancelled' = 'upcoming') {
  const skip = (page - 1) * limit;
  return listPatientReservations(userId, skip, limit, tab);
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
    throw AppError.badRequest('Cancellation deadline has passed (24-hour notice before the appointment day is required)');
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
      eventBus.publish('RESERVATION_CANCELLED', {
        reservationId: reservation.id,
        patientId: reservation.userId,
        doctorId: doctorUserId,
        cancelledByRole: 'patient'
      });
    }

    eventBus.publish('SLOT_AVAILABLE', {
      doctorScheduleId: reservation.doctorScheduleId,
      releasedReservationId: reservationId,
      excludedUserId: userId
    });
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

/* ─── Patient: view live queue (anonymized) ─── */

export async function getPatientLiveQueue(scheduleId: string, patientUserId: string) {
  const schedule = await getScheduleWithReservations(scheduleId);
  if (!schedule) {
    throw AppError.notFound('Schedule not found');
  }

  // Authorization: patient must have a non-cancelled reservation in this schedule
  const hasReservation = schedule.reservations.some(
    r => r.userId === patientUserId && !['cancelled', 'no_show'].includes(r.status)
  );

  if (!hasReservation) {
    throw AppError.forbidden('You do not have an active reservation for this schedule');
  }

  // Build highly anonymized slot list for patients
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
      isYou: booking.userId === patientUserId,
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

  // 1. Validate status value
  const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
  if (!validStatuses.includes(status)) {
    throw AppError.badRequest(`Invalid reservation status: ${status}`);
  }

  // 2. Validate state transitions (Queue Flow)
  const currentStatus = reservation.status;
  if (currentStatus !== status) {
    const terminalStates = ['completed', 'cancelled', 'no_show'];
    if (terminalStates.includes(currentStatus)) {
      throw AppError.badRequest(`Cannot transition from concluded state: ${currentStatus}`);
    }

    let allowedTargets: string[] = [];
    if (currentStatus === 'scheduled') {
      allowedTargets = ['confirmed', 'cancelled', 'no_show'];
    } else if (currentStatus === 'confirmed') {
      allowedTargets = ['in_progress', 'cancelled', 'no_show'];
    } else if (currentStatus === 'in_progress') {
      allowedTargets = ['completed'];
    }

    if (!allowedTargets.includes(status)) {
      throw AppError.badRequest(
        `Invalid queue transition: ${currentStatus} cannot transition to ${status}. Expected flow: scheduled -> confirmed -> in_progress -> completed.`
      );
    }
  }

  const updatedReservation = await repoUpdateStatus(reservationId, status, notes);

  // Trigger real-time queue update
  eventBus.publish('QUEUE_UPDATED', { scheduleId: updatedReservation.doctorScheduleId });

  // 3. Trigger email & feedback prompts if transitioned to "completed"
  if (currentStatus !== 'completed' && status === 'completed') {
    const patientName = [reservation.user.firstName, reservation.user.lastName].filter(Boolean).join(' ') || 'Patient';
    const doctorName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Doctor';

    eventBus.publish('PATIENT_VISIT_COMPLETED', {
      reservationId: reservation.id,
      patientId: reservation.userId,
      doctorId: profile.userId,
      patientName,
      doctorName,
    });
  } else if (currentStatus !== 'cancelled' && status === 'cancelled') {
    eventBus.publish('RESERVATION_CANCELLED', {
      reservationId: reservation.id,
      patientId: reservation.userId,
      doctorId: profile.userId,
      cancelledByRole: 'doctor'
    });
    eventBus.publish('SLOT_AVAILABLE', {
      doctorScheduleId: reservation.doctorScheduleId,
      releasedReservationId: reservation.id,
      excludedUserId: reservation.userId
    });
  }

  return updatedReservation;
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

  // HIPAA Access Log: Write immutable log of doctor viewing patient records
  await createAuditLog({
    userId: doctorUserId,
    targetPatientId: reservation.userId,
    reservationId: reservation.id,
    action: 'VIEW_RECORDS',
  });

  // Fetch patient data securely via repository
  return getPatientHealthSnapshot(reservation.userId);
}

export async function getPatientPendingFeedback(userId: string) {
  return getPendingFeedbackReservation(userId);
}

