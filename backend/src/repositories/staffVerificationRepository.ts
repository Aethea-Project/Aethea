/**
 * Staff Verification Repository — raw SQL queries for staff profiles
 *
 * Isolates Prisma $queryRaw/$executeRaw calls behind typed functions.
 */

import prisma from '../lib/prisma.js';

export type VerificationStatus = 'unverified' | 'under_review' | 'verified' | 'rejected';
export type StaffType = 'doctor' | 'pharmacist';

export interface StaffProfileRow {
  user_id: unknown;
  staff_type: unknown;
  government_id_path: unknown;
  certificate_file_path: unknown;
  selfie_file_path: unknown;
  specialty: unknown;
  affiliation_name: unknown;
  affiliation_type: unknown;
  national_id: unknown;
  syndicate_id: unknown;
  ministry_license: unknown;
  verification_status: unknown;
  verification_notes: unknown;
  submitted_at: unknown;
  reviewed_at: unknown;
  reviewed_by: unknown;
  updated_at: unknown;
}

export interface StaffProfileDocPaths {
  government_id_path: string | null;
  certificate_file_path: string | null;
  selfie_file_path: string | null;
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

export async function findStaffProfile(userId: string): Promise<StaffProfileRow | undefined> {
  const rows = await prisma.$queryRaw<StaffProfileRow[]>`
    SELECT
      sp.user_id,
      sp.staff_type,
      sp.government_id_path,
      sp.certificate_file_path,
      sp.selfie_file_path,
      sp.specialty,
      sp.affiliation_name,
      sp.affiliation_type,
      sp.national_id,
      sp.syndicate_id,
      sp.ministry_license,
      sp.verification_status,
      sp.verification_notes,
      sp.submitted_at,
      sp.reviewed_at,
      sp.reviewed_by,
      sp.updated_at
    FROM public.staff_profiles sp
    WHERE sp.user_id = ${userId}::uuid
    LIMIT 1
  `;
  return rows[0];
}

export async function upsertStaffProfile(input: SubmitProfileInput): Promise<Record<string, unknown> | undefined> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    INSERT INTO public.staff_profiles (
      user_id,
      staff_type,
      government_id_path,
      certificate_file_path,
      selfie_file_path,
      specialty,
      affiliation_name,
      affiliation_type,
      national_id,
      syndicate_id,
      ministry_license,
      verification_status,
      submitted_at,
      updated_at
    )
    VALUES (
      ${input.userId}::uuid,
      ${input.staffType}::public.account_type,
      ${input.governmentIdPath},
      ${input.certificateFilePath},
      ${input.selfieFilePath},
      ${input.specialty},
      ${input.affiliationName},
      ${input.affiliationType},
      ${input.nationalId},
      ${input.syndicateId},
      ${input.ministryLicense},
      'under_review',
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      staff_type = EXCLUDED.staff_type,
      government_id_path = EXCLUDED.government_id_path,
      certificate_file_path = EXCLUDED.certificate_file_path,
      selfie_file_path = EXCLUDED.selfie_file_path,
      specialty = EXCLUDED.specialty,
      affiliation_name = EXCLUDED.affiliation_name,
      affiliation_type = EXCLUDED.affiliation_type,
      national_id = EXCLUDED.national_id,
      syndicate_id = EXCLUDED.syndicate_id,
      ministry_license = EXCLUDED.ministry_license,
      verification_status = 'under_review',
      verification_notes = NULL,
      submitted_at = now(),
      reviewed_at = NULL,
      reviewed_by = NULL,
      updated_at = now()
    RETURNING user_id, staff_type, verification_status, submitted_at, updated_at
  `;
  return rows[0];
}

export async function setAccountStatusPending(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE public.user_accounts
    SET account_status = 'pending'::public.account_status,
        updated_at = now()
    WHERE id = ${userId}::uuid
  `;
}

export async function countProfilesByStatus(status: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COUNT(*)::int AS total
    FROM public.staff_profiles sp
    WHERE sp.verification_status = ${status}
  `;
  return rows[0]?.total ?? 0;
}

export async function findProfilesByStatus(status: string, limit: number, offset: number): Promise<Array<Record<string, unknown>>> {
  return prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
      sp.user_id,
      sp.staff_type,
      sp.specialty,
      sp.affiliation_name,
      sp.affiliation_type,
      sp.national_id,
      sp.syndicate_id,
      sp.ministry_license,
      sp.verification_status,
      sp.verification_notes,
      sp.government_id_path,
      sp.certificate_file_path,
      sp.selfie_file_path,
      sp.submitted_at,
      sp.reviewed_at,
      sp.reviewed_by,
      p.email,
      p.first_name,
      p.last_name
    FROM public.staff_profiles sp
    LEFT JOIN public.profiles p ON p.id = sp.user_id
    WHERE sp.verification_status = ${status}
    ORDER BY sp.submitted_at DESC NULLS LAST
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}

export async function updateVerificationStatus(
  userId: string,
  verificationStatus: string,
  notes: string | null,
  reviewerId: string,
): Promise<Record<string, unknown> | undefined> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    UPDATE public.staff_profiles
    SET verification_status = ${verificationStatus},
        verification_notes = ${notes},
        reviewed_at = now(),
        reviewed_by = ${reviewerId}::uuid,
        updated_at = now()
    WHERE user_id = ${userId}::uuid
    RETURNING user_id, verification_status, verification_notes, reviewed_at, reviewed_by, updated_at
  `;
  return rows[0];
}

export async function approveAccount(userId: string, actorId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE public.user_accounts
    SET account_status = 'active'::public.account_status,
        approved_by = ${actorId}::uuid,
        approved_at = now(),
        rejected_reason = NULL,
        suspended_reason = NULL,
        updated_at = now()
    WHERE id = ${userId}::uuid
  `;
}

export async function rejectAccount(userId: string, reason: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE public.user_accounts
    SET account_status = 'rejected'::public.account_status,
        rejected_reason = ${reason},
        updated_at = now()
    WHERE id = ${userId}::uuid
  `;
}

export async function reviewStaffProfileTransaction(
  userId: string,
  verificationStatus: 'verified' | 'rejected',
  notes: string | null,
  reviewerId: string,
): Promise<Record<string, unknown> | undefined> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<Record<string, unknown>>>`
      UPDATE public.staff_profiles
      SET verification_status = ${verificationStatus},
          verification_notes = ${notes},
          reviewed_at = now(),
          reviewed_by = ${reviewerId}::uuid,
          updated_at = now()
      WHERE user_id = ${userId}::uuid
      RETURNING user_id, verification_status, verification_notes, reviewed_at, reviewed_by, updated_at
    `;

    const updated = rows[0];
    if (!updated) return undefined;

    if (verificationStatus === 'verified') {
      await tx.$executeRaw`
        UPDATE public.user_accounts
        SET account_status = 'active'::public.account_status,
            approved_by = ${reviewerId}::uuid,
            approved_at = now(),
            rejected_reason = NULL,
            suspended_reason = NULL,
            updated_at = now()
        WHERE id = ${userId}::uuid
      `;

      const staffRows = await tx.$queryRaw<Array<{ staff_type: string, specialty: string }>>`
        SELECT staff_type, specialty FROM public.staff_profiles WHERE user_id = ${userId}::uuid
      `;
      const staffProfile = staffRows[0];

      if (staffProfile && staffProfile.staff_type === 'doctor') {
        const userProfileRows = await tx.$queryRaw<Array<{ first_name: string, last_name: string }>>`
          SELECT first_name, last_name FROM public.profiles WHERE id = ${userId}::uuid
        `;
        const userProfile = userProfileRows[0];
        
        await tx.$executeRaw`
          INSERT INTO public.doctor_profiles (
            id,
            user_id,
            first_name,
            last_name,
            specialty,
            verified,
            updated_at
          )
          VALUES (
            gen_random_uuid(),
            ${userId}::uuid,
            COALESCE(${userProfile?.first_name}, 'Unknown'),
            COALESCE(${userProfile?.last_name}, 'Doctor'),
            COALESCE(${staffProfile.specialty}, 'General Practice'),
            true,
            now()
          )
          ON CONFLICT (user_id) DO UPDATE SET
            specialty = EXCLUDED.specialty,
            verified = true,
            updated_at = now()
        `;
      }
    } else {
      await tx.$executeRaw`
        UPDATE public.user_accounts
        SET account_status = 'rejected'::public.account_status,
            rejected_reason = ${notes ?? 'Verification rejected'},
            updated_at = now()
        WHERE id = ${userId}::uuid
      `;
    }

    return updated;
  });
}

export async function findProfileDocPaths(userId: string): Promise<StaffProfileDocPaths | undefined> {
  const rows = await prisma.$queryRaw<StaffProfileDocPaths[]>`
    SELECT government_id_path, certificate_file_path, selfie_file_path
    FROM public.staff_profiles
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `;
  return rows[0];
}
