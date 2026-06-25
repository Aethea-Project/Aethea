/**
 * Feedback Controller
 *
 * Implements HIPAA-compliant anonymous feedback submission and K-Anonymity insights.
 */

import { Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { getReservationById } from '../repositories/reservationRepository.js';
import { getDoctorProfileByUserId } from '../repositories/doctorRepository.js';
import {
  createFeedback,
  getVisibleFeedbacksForDoctor,
  getAverageRatingForDoctor,
  releaseEligibleFeedbacksForDoctor,
} from '../repositories/feedbackRepository.js';

/**
 * POST /feedbacks/submit — Patient submits feedback for a completed visit
 */
export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { reservationId, rating, comments } = req.body;

  if (!reservationId) {
    throw AppError.badRequest('Missing reservationId');
  }
  if (rating === undefined || rating < 1 || rating > 5) {
    throw AppError.badRequest('Rating must be an integer between 1 and 5');
  }

  // 1. Fetch reservation
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    throw AppError.notFound('Reservation not found');
  }

  // 2. Validate patient authorization
  if (reservation.userId !== user.id) {
    throw AppError.forbidden('You can only submit feedback for your own appointments');
  }

  // 3. Validate reservation status
  if (reservation.status !== 'completed') {
    throw AppError.badRequest('You can only submit feedback for completed appointments');
  }

  // 4. Check if feedback has already been submitted
  if (reservation.feedbackSubmitted) {
    throw AppError.badRequest('Feedback has already been submitted for this appointment');
  }

  const doctorProfileId = reservation.doctorSchedule.doctorProfileId;

  // 5. Submit feedback (decoupled from user identity inside transaction)
  await createFeedback({
    doctorProfileId,
    doctorScheduleId: reservation.doctorScheduleId,
    reservationId: reservation.id,
    rating: Number(rating),
    comments,
  });

  // 6. Proactively trigger K-Anonymity release check for this doctor
  try {
    await releaseEligibleFeedbacksForDoctor(doctorProfileId);
  } catch (err) {
    // Fail-safe: do not block response if release check fails
  }

  // Return generic success to protect anonymity
  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully. Thank you for your review!',
  });
};

/**
 * GET /feedbacks/doctor — Doctor views their own anonymized reviews (K-Anonymity protected)
 */
export const getDoctorReviews = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;

  // 1. Validate doctor account
  const profile = await getDoctorProfileByUserId(user.id);
  if (!profile) {
    throw AppError.forbidden('Only registered doctors can view their reviews');
  }

  // 2. Proactively run K-Anonymity batch release to ensure latest eligible feedbacks are visible
  await releaseEligibleFeedbacksForDoctor(profile.id);

  // 3. Fetch visible feedbacks and statistics
  const feedbacks = await getVisibleFeedbacksForDoctor(profile.id);
  const { averageRating, totalReviews } = await getAverageRatingForDoctor(profile.id);

  res.json({
    averageRating,
    totalReviews,
    feedbacks: feedbacks.map((f) => ({
      id: f.id,
      rating: f.rating,
      comments: f.comments,
      createdAt: f.createdAt,
    })),
  });
};
