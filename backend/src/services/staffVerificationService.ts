/**
 * Staff Verification Service — business logic for staff identity verification
 *
 * Orchestrates the staff verification repository, Supabase storage, and account status transitions.
 */

import { AppError } from '../lib/AppError.js';
import { getSupabaseAdminClient } from '../lib/supabaseAdmin.js';
import {
  findStaffProfile,
  upsertStaffProfile,
  setAccountStatusPending,
  countProfilesByStatus,
  findProfilesByStatus,
  updateVerificationStatus,
  approveAccount,
  rejectAccount,
  findProfileDocPaths,
  type VerificationStatus,
  type StaffType,
} from '../repositories/staffVerificationRepository.js';

/* ─── File sanitization ─── */

const SAFE_FILE_REGEX = /^[a-zA-Z0-9._-]+$/;
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf']);

export function sanitizeFileName(fileName: string): string {
  const normalized = fileName.trim();
  if (!normalized || normalized.length > 140 || !SAFE_FILE_REGEX.test(normalized)) {
    throw AppError.badRequest('Invalid file name', 'INVALID_FILE_NAME');
  }

  const ext = normalized.slice(normalized.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw AppError.badRequest('File type not allowed. Accepted: png, jpg, jpeg, webp, pdf', 'INVALID_FILE_TYPE');
  }

  return normalized;
}

/* ─── Service functions ─── */

export async function createUploadUrl(
  userId: string,
  bucket: 'staff-documents' | 'staff-selfies',
  fileName: string,
) {
  const safeFileName = sanitizeFileName(fileName);
  const objectPath = `${userId}/${Date.now()}-${safeFileName}`;

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(objectPath);

  if (error || !data) {
    throw AppError.badRequest(error?.message || 'Failed to create signed upload URL', 'UPLOAD_URL_FAILED');
  }

  return { bucket, path: data.path, token: data.token, signedUrl: data.signedUrl };
}

export async function getProfile(userId: string) {
  return findStaffProfile(userId) ?? null;
}

export interface SubmitProfileInput {
  userId: string;
  staffType: StaffType;
  governmentIdPath: string;
  certificateFilePath: string;
  selfieFilePath: string;
  specialty: string;
  affiliationName: string;
  affiliationType: string;
}

export async function submitProfile(input: SubmitProfileInput) {
  const result = await upsertStaffProfile(input);
  await setAccountStatusPending(input.userId);
  return result ?? null;
}

const VALID_STATUSES: ReadonlySet<string> = new Set<VerificationStatus>([
  'unverified', 'under_review', 'verified', 'rejected',
]);

export async function getVerificationQueue(status: string, page: number, limit: number, skip: number) {
  if (!VALID_STATUSES.has(status)) {
    throw AppError.badRequest('Invalid verification status filter');
  }

  const [total, rows] = await Promise.all([
    countProfilesByStatus(status),
    findProfilesByStatus(status, limit, skip),
  ]);

  return { data: rows, total, page, limit };
}

export async function reviewProfile(
  userId: string,
  actorId: string,
  verificationStatus: 'verified' | 'rejected',
  notes?: string,
) {
  const updated = await updateVerificationStatus(userId, verificationStatus, notes ?? null, actorId);
  if (!updated) {
    throw AppError.notFound('Staff profile not found');
  }

  if (verificationStatus === 'verified') {
    await approveAccount(userId, actorId);
  } else {
    await rejectAccount(userId, notes ?? 'Verification rejected');
  }

  return updated;
}

export async function getDocumentLinks(userId: string) {
  const profile = await findProfileDocPaths(userId);
  if (!profile) {
    throw AppError.notFound('Staff profile not found');
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const signLink = async (bucket: 'staff-documents' | 'staff-selfies', path: string | null) => {
    if (!path) return null;
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  };

  const [governmentIdUrl, certificateUrl, selfieUrl] = await Promise.all([
    signLink('staff-documents', profile.government_id_path),
    signLink('staff-documents', profile.certificate_file_path),
    signLink('staff-selfies', profile.selfie_file_path),
  ]);

  return { governmentIdUrl, certificateUrl, selfieUrl };
}
