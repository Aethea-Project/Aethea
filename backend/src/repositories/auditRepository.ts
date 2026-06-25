/**
 * Audit Repository — immutable logs of all clinical record accesses
 *
 * Enforces strict logging of HIPAA audit records whenever sensitive patient health
 * information is fetched or viewed.
 */

import prisma from '../lib/prisma.js';

export interface CreateAuditLogInput {
  userId: string;
  targetPatientId: string;
  reservationId?: string;
  action: string;
}

/**
 * Creates an immutable AccessAuditLog record.
 */
export async function createAuditLog(input: CreateAuditLogInput) {
  return prisma.accessAuditLog.create({
    data: {
      userId: input.userId,
      targetPatientId: input.targetPatientId,
      reservationId: input.reservationId || null,
      action: input.action,
    },
  });
}

/**
 * Retrieves audit logs where the user is either the actor or the subject.
 */
export async function getAuditLogsForUser(userId: string) {
  return prisma.accessAuditLog.findMany({
    where: {
      OR: [
        { userId },
        { targetPatientId: userId },
      ],
    },
    orderBy: {
      timestamp: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      targetPatient: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}
