/**
 * Patient Data Repository — data access for patient health records
 *
 * Provides read-only queries for lab tests, scans, and conditions.
 * Used by services that need to fetch patient health snapshots
 * without directly accessing Prisma.
 */

import prisma from '../lib/prisma.js';

export async function getPatientHealthSnapshot(userId: string) {
  const [labTests, scans, conditions, feedbacks] = await Promise.all([
    prisma.labTest.findMany({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    }),
    prisma.scan.findMany({
      where: { userId },
      orderBy: { scanDate: 'desc' },
    }),
    prisma.patientCondition.findMany({
      where: { patientId: userId },
      orderBy: { detectedAt: 'desc' },
    }),
    prisma.feedback.findMany({
      where: { userId },
      include: {
        labTests: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { labTests, scans, conditions, feedbacks };
}
