/**
 * Lab Results Service — business logic for AI-powered lab analysis
 *
 * Handles:
 *  - Streaming AI response parsing (NDJSON)
 *  - Risk level computation from extracted tests
 *  - Database persistence (Feedback + LabTest records)
 *
 * Controllers should delegate here instead of embedding this logic.
 */

import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { GeminiLabResult, GeminiLabTest } from './geminiService.js';

/* ─── Risk Level Computation ─── */

function computeRiskLevel(aiResult: GeminiLabResult, tests: GeminiLabTest[]): string {
  if (aiResult.risk_level) return aiResult.risk_level;
  if (!Array.isArray(tests) || tests.length === 0) return 'medium';

  if (tests.some((t) => t.status === 'high' || t.status === 'low')) return 'high';
  if (tests.some((t) => t.status === 'borderline')) return 'medium';

  return 'low';
}

/* ─── Database Persistence ─── */

export async function storeFeedback(userId: string, aiResult: GeminiLabResult, existingFeedbackId?: string): Promise<{ feedbackId: string; extractedTests: GeminiLabTest[] }> {
  const warnings = aiResult.medications || [];
  const findings = aiResult.findings || [];
  const extractedTests = aiResult.lab_results || [];
  
  const condition = aiResult.condition || (findings.length > 0 ? findings[0] : 'Unknown condition');
  const riskLevel = computeRiskLevel(aiResult, extractedTests);

  const data = {
    userId,
    condition,
    riskLevel,
    relatedMedicines: warnings,
    doctorAnalysis: aiResult.doctor_analysis || 'No detailed analysis provided.',
    patientSummary: aiResult.summary || 'No summary provided.',
  };

  const feedback = existingFeedbackId
    ? await prisma.feedback.update({ where: { id: existingFeedbackId }, data })
    : await prisma.feedback.create({ data });

  return { feedbackId: feedback.id, extractedTests };
}

export async function storeLabTests(userId: string, feedbackId: string, tests: GeminiLabTest[]): Promise<number> {
  if (!Array.isArray(tests) || tests.length === 0) return 0;

  logger.info(`Storing ${tests.length} extracted tests for user ${userId}`);
  
  // Idempotency: clear any existing tests for this feedback (e.g. from BullMQ retries)
  await prisma.labTest.deleteMany({
    where: { feedbackId }
  });

  let storedCount = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    try {
      await prisma.labTest.create({
        data: {
          userId,
          feedbackId,
          testName: test.test_name || 'Unknown Test',
          category: test.category || 'General',
          value: String(test.value),
          unit: test.unit || '',
          refMin: test.ref_min,
          refMax: test.ref_max,
          refText: test.ref_text,
          status: test.status || 'normal',
          orderedBy: 'AI Analysis',
          measuredAt: new Date(),
          orderIndex: i, // Ensure extraction order is preserved
        },
      });
      storedCount++;
    } catch (err) {
      logger.error({ err, test }, 'Failed to store individual extracted test');
    }
  }

  return storedCount;
}

/* ─── Public API ─── */


/**
 * Fetches all feedbacks (with lab tests) for a user.
 */
export async function getUserFeedbacks(userId: string) {
  return prisma.feedback.findMany({
    where: { userId },
    include: { 
      labTests: {
        orderBy: { orderIndex: 'asc' }
      } 
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Updates a feedback condition (ownership-verified).
 */
export async function updateFeedbackCondition(feedbackId: string, userId: string, condition: string) {
  const feedback = await prisma.feedback.findFirst({
    where: { id: feedbackId, userId },
  });

  if (!feedback) return null;

  return prisma.feedback.update({
    where: { id: feedbackId },
    data: { condition },
  });
}

/**
 * Deletes a feedback and its associated lab tests (ownership-verified).
 */
export async function deleteFeedback(feedbackId: string, userId: string): Promise<boolean> {
  const feedback = await prisma.feedback.findFirst({
    where: { id: feedbackId, userId },
  });

  if (!feedback) return false;

  // Delete associated lab tests first to prevent orphans
  await prisma.labTest.deleteMany({
    where: { feedbackId },
  });

  await prisma.feedback.delete({
    where: { id: feedbackId },
  });

  return true;
}
