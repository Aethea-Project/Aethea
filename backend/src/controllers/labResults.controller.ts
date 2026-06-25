/**
 * Lab Results Controller — thin HTTP layer
 *
 * All business logic, stream parsing, and database writes
 * are delegated to labResultsService.
 */

import { Request, Response } from 'express';
import logger from '../lib/logger.js';
import { sendErrorAlert } from '../services/emailService.js';
import {
  getUserFeedbacks,
  updateFeedbackCondition,
  deleteFeedback,
} from '../services/labResultsService.js';
import prisma from '../lib/prisma.js';
import { getSupabaseAdminClient } from '../lib/supabaseAdmin.js';

const SAFE_UPLOAD_FILE_REGEX = /^[a-zA-Z0-9._-]+$/;
const SAFE_STORAGE_SEGMENT_REGEX = /^[a-zA-Z0-9._-]+$/;

const isUserOwnedClinicalStoragePath = (storagePath: string, userId: string): boolean => {
  const normalized = storagePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return normalized.length <= 255 &&
    normalized.startsWith(`${userId}/`) &&
    parts.length >= 2 &&
    parts.every((part) => SAFE_STORAGE_SEGMENT_REGEX.test(part));
};

export const uploadLabResult = async (req: Request, res: Response) => {
  try {
    const { storagePath } = req.body;
    if (!storagePath || typeof storagePath !== 'string') {
      return res.status(400).json({ error: 'Missing storagePath in request body.' });
    }

    const userId = req.localUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. User ID missing.' });
    }

    if (!isUserOwnedClinicalStoragePath(storagePath, userId)) {
      return res.status(403).json({ error: 'Storage path is not owned by the authenticated user.' });
    }

    logger.info(`Queueing lab extraction for user ${userId}, file: ${storagePath}`);

    // Create a placeholder feedback entry
    const placeholder = await prisma.feedback.create({
      data: {
        userId,
        storagePath,
        fileHash: req.body.fileHash,
        condition: 'Processing...',
        riskLevel: 'Unknown',
        doctorAnalysis: 'AI extraction in progress...',
      }
    });

    // Enqueue the worker job. Import lazily so auth/admin tests do not need Redis.
    const { extractionQueue } = await import('../queues/extraction.queue.js');
    const job = await extractionQueue.add('extract', {
      userId,
      feedbackId: placeholder.id,
      storagePath,
    });

    // Return the jobId so the client can connect to SSE
    return res.status(202).json({ 
      message: 'Extraction started',
      jobId: job.id,
      feedbackId: placeholder.id
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error({ error }, 'Error queuing lab result extraction');

    void sendErrorAlert(error, `uploadLabResult (User: ${req.localUser?.id})`).catch((e) => {
      logger.error({ e }, 'Failed to send error email alert');
    });

    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getUploadUrl = async (req: Request, res: Response) => {
  try {
    const { fileName, fileHash } = req.body;
    if (!fileName || typeof fileName !== 'string') return res.status(400).json({ error: 'Missing fileName' });
    if (!SAFE_UPLOAD_FILE_REGEX.test(fileName) || fileName.length > 160) {
      return res.status(400).json({ error: 'Invalid fileName' });
    }

    const userId = req.localUser?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Deduplication check
    if (fileHash && typeof fileHash === 'string') {
      const existingFeedback = await prisma.feedback.findFirst({
        where: { userId, fileHash }
      });
      if (existingFeedback) {
        return res.status(200).json({
          duplicate: true,
          feedbackId: existingFeedback.id
        });
      }
    }

    const storagePath = `${userId}/${fileName}`;
    
    // Generate a signed upload URL valid for 5 minutes
    const { data, error } = await getSupabaseAdminClient()
      .storage
      .from('clinical-documents')
      .createSignedUploadUrl(storagePath);
      
    if (error) throw new Error(error.message);
    
    return res.status(200).json({ 
      signedUrl: data.signedUrl, 
      token: data.token,
      path: data.path,
      storagePath 
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Error generating signed upload URL');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLabFeedbacks = async (req: Request, res: Response) => {
  try {
    const userId = req.localUser?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const feedbacks = await getUserFeedbacks(userId);
    return res.status(200).json({ data: feedbacks });
  } catch (error: unknown) {
    logger.error({ error }, 'Error fetching feedbacks');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLabFeedback = async (req: Request, res: Response) => {
  try {
    const userId = req.localUser?.id;
    const id = req.params.id as string;
    const { condition } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const updated = await updateFeedbackCondition(id, userId, condition);
    if (!updated) return res.status(404).json({ error: 'Feedback not found' });

    return res.status(200).json({ data: updated });
  } catch (error: unknown) {
    logger.error({ error }, 'Error updating feedback');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteLabFeedback = async (req: Request, res: Response) => {
  try {
    const userId = req.localUser?.id;
    const id = req.params.id as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const deleted = await deleteFeedback(id, userId);
    if (!deleted) return res.status(404).json({ error: 'Feedback not found' });

    return res.status(200).json({ message: 'Feedback deleted successfully' });
  } catch (error: unknown) {
    logger.error({ error }, 'Error deleting feedback');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
