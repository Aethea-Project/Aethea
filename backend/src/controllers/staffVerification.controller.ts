/**
 * Staff Verification Controller — thin HTTP layer
 *
 * Delegates all business logic to staffVerificationService.
 * Only responsible for: extracting HTTP params, calling services, sending responses.
 */

import { Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { parsePagination, paginatedResult } from '../lib/pagination.js';
import {
  createUploadUrl,
  getProfile,
  submitProfile,
  getVerificationQueue,
  reviewProfile,
  getDocumentLinks,
} from '../services/staffVerificationService.js';
import type { StaffType } from '../repositories/staffVerificationRepository.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getStaffType = (req: Request): StaffType => {
  const accountType = req.user?.account_type;
  if (accountType === 'doctor' || accountType === 'pharmacist') {
    return accountType;
  }
  throw AppError.forbidden('Only staff accounts can access this endpoint');
};

export const createVerificationUploadUrl = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw AppError.unauthorized('No authenticated user');
  }

  const data = await createUploadUrl(userId, req.body.bucket, req.body.fileName);
  res.json({ data });
};

export const getMyVerificationProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw AppError.unauthorized('No authenticated user');
  }

  const data = await getProfile(userId);
  res.json({ data });
};

export const submitVerificationProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw AppError.unauthorized('No authenticated user');
  }

  const staffType = getStaffType(req);
  const data = await submitProfile({
    userId,
    staffType,
    governmentIdPath: req.body.governmentIdPath,
    certificateFilePath: req.body.certificateFilePath,
    selfieFilePath: req.body.selfieFilePath,
    specialty: req.body.specialty,
    affiliationName: req.body.affiliationName,
    affiliationType: req.body.affiliationType,
    nationalId: req.body.nationalId,
    syndicateId: req.body.syndicateId,
    ministryLicense: req.body.ministryLicense,
  });

  res.json({ data });
};

export const listVerificationQueue = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = parsePagination(req);
  const status = typeof req.query.status === 'string' ? req.query.status : 'under_review';

  const { data, total } = await getVerificationQueue(status, page, limit, skip);
  res.json(paginatedResult(data, total, page, limit));
};

export const reviewVerificationProfile = async (req: Request, res: Response): Promise<void> => {
  const actorId = req.user?.id;
  const rawUserId = req.params.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  if (!actorId || !userId) {
    throw AppError.unauthorized('Missing authenticated context');
  }

  if (!UUID_REGEX.test(userId)) {
    throw AppError.badRequest('Invalid userId format');
  }

  const data = await reviewProfile(userId, actorId, req.body.verificationStatus, req.body.notes, {
    headers: req.headers as Record<string, string | string[] | undefined>,
    socketAddress: req.ip,
  });
  res.json({ data });
};

export const getVerificationDocumentLinks = async (req: Request, res: Response): Promise<void> => {
  const rawUserId = req.params.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  if (!userId) {
    throw AppError.badRequest('userId is required');
  }

  if (!UUID_REGEX.test(userId)) {
    throw AppError.badRequest('Invalid userId format');
  }

  const data = await getDocumentLinks(userId);
  res.json({ data });
};
