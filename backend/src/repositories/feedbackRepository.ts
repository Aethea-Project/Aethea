/**
 * Feedback Repository — typed data access for DoctorFeedback
 *
 * Implements K-Anonymity validation and feedback release logic.
 */

import prisma from '../lib/prisma.js';

export interface CreateFeedbackInput {
  doctorProfileId: string;
  doctorScheduleId: string;
  reservationId: string;
  rating: number;
  comments?: string;
}

/**
 * Creates a new DoctorFeedback record and marks the associated reservation as feedbackSubmitted.
 * Automatically runs inside a transaction for atomic safety.
 */
export async function createFeedback(input: CreateFeedbackInput) {
  const { doctorProfileId, doctorScheduleId, reservationId, rating, comments } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Create the feedback (defaults to visibleToDoctor = false)
    const feedback = await tx.doctorFeedback.create({
      data: {
        doctorProfileId,
        doctorScheduleId,
        rating,
        comments,
        visibleToDoctor: false,
      },
    });

    // 2. Mark the reservation as submitted
    await tx.reservation.update({
      where: { id: reservationId },
      data: { feedbackSubmitted: true },
    });

    return feedback;
  });
}

/**
 * Returns all feedbacks visible to the doctor.
 */
export async function getVisibleFeedbacksForDoctor(doctorProfileId: string) {
  return prisma.doctorFeedback.findMany({
    where: {
      doctorProfileId,
      visibleToDoctor: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Returns the average rating for a doctor based on visible feedbacks.
 */
export async function getAverageRatingForDoctor(doctorProfileId: string) {
  const aggregate = await prisma.doctorFeedback.aggregate({
    where: {
      doctorProfileId,
      visibleToDoctor: true,
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    averageRating: aggregate._avg.rating || 0,
    totalReviews: aggregate._count.id || 0,
  };
}

/**
 * K-Anonymity Engine: Checks and releases feedbacks for a doctor
 * Release condition:
 * - Feedbacks must belong to a "closed" schedule (endAt is in the past)
 * - The count of unreleased feedbacks across all closed schedules is >= 3 (k >= 3)
 */
export async function releaseEligibleFeedbacksForDoctor(doctorProfileId: string): Promise<number> {
  const now = new Date();

  // 1. Find all invisible feedbacks for this doctor that belong to closed schedules
  const eligibleFeedbacks = await prisma.doctorFeedback.findMany({
    where: {
      doctorProfileId,
      visibleToDoctor: false,
      doctorSchedule: {
        endAt: {
          lt: now,
        },
      },
    },
    select: {
      id: true,
    },
  });

  const count = eligibleFeedbacks.length;

  // 2. If k >= 3, release them!
  if (count >= 3) {
    const ids = eligibleFeedbacks.map((f) => f.id);
    const updateResult = await prisma.doctorFeedback.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        visibleToDoctor: true,
      },
    });
    return updateResult.count;
  }

  return 0;
}
