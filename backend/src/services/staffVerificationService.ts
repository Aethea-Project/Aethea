/**
 * Staff Verification Service — business logic for staff identity verification
 *
 * Orchestrates the staff verification repository, Supabase storage, and account status transitions.
 */

import { AppError } from '../lib/AppError.js';
import { getSupabaseAdminClient } from '../lib/supabaseAdmin.js';
import { validateMagicBytes } from '../lib/magicBytes.js';
import {
  findStaffProfile,
  upsertStaffProfile,
  setAccountStatusPending,
  countProfilesByStatus,
  findProfilesByStatus,
  findProfileDocPaths,
  reviewStaffProfileTransaction,
  type VerificationStatus,
  type StaffType,
} from '../repositories/staffVerificationRepository.js';
import { auditUserAction } from './auditHelper.js';
import { revokeAllUserSessions } from '../lib/sessionRegistry.js';
import { getRedisClient } from '../lib/redisClient.js';

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
  const objectPath = `verification/${userId}/v${Date.now()}/${safeFileName}`;

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
  return await findStaffProfile(userId) ?? null;
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
  nationalId: string;
  syndicateId: string;
  ministryLicense: string;
}

const isOwnedVerificationPath = (path: string, userId: string): boolean => {
  const normalized = path.replace(/\\/g, '/');
  return normalized.startsWith(`verification/${userId}/`) &&
    !normalized.includes('..') &&
    normalized.split('/').every((part) => part.length > 0);
};

async function verifyAndCleanupFile(bucket: 'staff-documents' | 'staff-selfies', path: string, userId: string) {
  if (!isOwnedVerificationPath(path, userId)) {
    throw AppError.forbidden('Uploaded document path is not owned by the authenticated user', 'DOCUMENT_PATH_FORBIDDEN');
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
  
  if (error || !data) {
    throw AppError.badRequest(`Failed to download uploaded document: ${error?.message || 'unknown error'}`, 'DOWNLOAD_FAILED');
  }

  let buffer: Buffer;
  if (typeof (data as any).arrayBuffer === 'function') {
    const ab = await (data as any).arrayBuffer();
    buffer = Buffer.from(ab);
  } else if (Buffer.isBuffer(data)) {
    buffer = data;
  } else {
    const ab = await (data as any).arrayBuffer();
    buffer = Buffer.from(ab);
  }

  const detectedType = validateMagicBytes(buffer);
  if (!detectedType) {
    // Delete invalid file immediately to prevent spoofing and storage pollution
    await supabaseAdmin.storage.from(bucket).remove([path]);
    throw new AppError(
      `Security violation: The uploaded file at ${path} does not match any allowed file signatures (PDF, PNG, JPEG, WEBP). It has been removed.`,
      415,
      'UNSUPPORTED_MEDIA_TYPE'
    );
  }
}

export async function submitProfile(input: SubmitProfileInput) {
  // 1. Specialty Check
  if (
    input.staffType === 'doctor' && 
    input.specialty && 
    input.specialty.trim().toLowerCase() !== 'general practice'
  ) {
    if (!input.certificateFilePath || !input.certificateFilePath.trim()) {
      throw new AppError(
        'A medical certificate is strictly required for specialties other than General Practice.',
        422,
        'CERTIFICATE_REQUIRED'
      );
    }
  }

  // 2. Validate uploaded documents before updating the database
  if (input.governmentIdPath) {
    await verifyAndCleanupFile('staff-documents', input.governmentIdPath, input.userId);
  }
  if (input.certificateFilePath) {
    await verifyAndCleanupFile('staff-documents', input.certificateFilePath, input.userId);
  }
  if (input.selfieFilePath) {
    await verifyAndCleanupFile('staff-selfies', input.selfieFilePath, input.userId);
  }

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
  meta: { headers: Record<string, string | string[] | undefined>; socketAddress?: string } = { headers: {} },
) {
  const before = await findStaffProfile(userId);
  const updated = await reviewStaffProfileTransaction(userId, verificationStatus, notes ?? null, actorId);
  if (!updated) {
    throw AppError.notFound('Staff profile not found');
  }

  try {
    await revokeAllUserSessions({ userId });
    const redis = await getRedisClient();
    await redis?.del(`user:status:${userId}`);
  } catch {
    // Best-effort cache/session cleanup; review result already persisted.
  }

  await auditUserAction(
    meta,
    actorId,
    verificationStatus === 'verified' ? 'staff.review_approve' : 'staff.review_reject',
    userId,
    before ? { verificationStatus: before.verification_status } : undefined,
    { verificationStatus, notes: notes ?? null },
  );

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
