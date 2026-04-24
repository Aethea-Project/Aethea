/**
 * Admin User Service — business logic for admin user management
 *
 * Orchestrates Supabase Admin API, the admin repository, and auditing.
 * Controllers should delegate here instead of embedding this logic.
 */

import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';
import { getSupabaseAdminClient } from '../lib/supabaseAdmin.js';
import { writeAuditLog, extractRequestMeta, type AuditAction } from './auditService.js';
import { revokeAllUserSessions } from '../lib/sessionRegistry.js';
import { sendAdminPasswordChangedNoticeEmail } from './emailService.js';
import {
  insertUserAccount,
  countActiveAdmins,
  getAccountStatus,
  updateAccountStatus,
  findUserById,
  findLastUserSignInAt,
  updateUserProfileByAdmin,
  updateUserAccountType,
  updateUserMustChangePassword,
  countUsers,
  findUsers,
  countAuditLogs,
  findAuditLogs,
  type AccountStatus,
  type AccountType,
  type AdminProfileUpdateInput,
  type StaffAccountType,
  type ListUsersFilters,
  type AuditLogFilters,
} from '../repositories/adminRepository.js';

/* ─── Interfaces ─── */

export interface CreateStaffUserInput {
  email: string;
  temporaryPassword: string;
  accountType: StaffAccountType;
  firstName: string;
  lastName: string;
}

export interface CreateStaffUserResult {
  id: string;
  email: string | undefined;
  accountType: StaffAccountType;
  accountStatus: 'pending';
  mustChangePassword: true;
}

export interface UpdateStatusInput {
  userId: string;
  accountStatus: AccountStatus;
  reason?: string;
  actorId: string;
}

export interface RequestMeta {
  headers: Record<string, string | string[] | undefined>;
  socketAddress?: string;
}

export interface UpdateAccountTypeInput {
  userId: string;
  accountType: AccountType;
  actorId: string;
}

export interface DeleteUserInput {
  userId: string;
  actorId: string;
}

export interface ResetTemporaryPasswordInput {
  userId: string;
  temporaryPassword: string;
  actorId: string;
}

export interface SendPasswordResetLinkInput {
  userId: string;
  actorId: string;
}

const DEFAULT_RESET_PASSWORD_ORIGIN = 'https://aethea.me';

const toNullableEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeOrigin = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
};

const isApiOrigin = (origin: string): boolean => {
  try {
    return /^api\./i.test(new URL(origin).hostname);
  } catch {
    return false;
  }
};

const isLocalOrigin = (origin: string): boolean => {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  } catch {
    return false;
  }
};

const resolvePasswordResetRedirectUrl = (): string => {
  const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));

  const webOrigins = configuredOrigins.filter((origin) => !isApiOrigin(origin));
  const candidates = webOrigins.length > 0 ? webOrigins : configuredOrigins;

  const selectedOrigin = process.env.NODE_ENV === 'production'
    ? candidates.find((origin) => !isLocalOrigin(origin))
    : candidates.find((origin) => isLocalOrigin(origin)) ?? candidates[0];

  const baseOrigin = selectedOrigin ?? DEFAULT_RESET_PASSWORD_ORIGIN;
  return `${baseOrigin.replace(/\/+$/, '')}/reset-password`;
};

/* ─── Service functions ─── */

export async function createStaffUser(
  input: CreateStaffUserInput,
  actorId: string | undefined,
  meta: RequestMeta,
): Promise<CreateStaffUserResult> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.temporaryPassword,
    email_confirm: true,
    user_metadata: {
      first_name: input.firstName,
      last_name: input.lastName,
      full_name: `${input.firstName} ${input.lastName}`.trim(),
      account_type: input.accountType,
    },
  });

  if (error || !data.user) {
    throw AppError.badRequest(error?.message || 'Unable to create user', 'ADMIN_CREATE_USER_FAILED');
  }

  await insertUserAccount(data.user.id, input.accountType);

  if (actorId) {
    const { ipAddress, userAgent } = extractRequestMeta(meta.headers, meta.socketAddress);
    await writeAuditLog({
      actorId,
      action: 'user.create',
      targetType: 'user_account',
      targetId: data.user.id,
      newValue: { email: input.email, accountType: input.accountType, accountStatus: 'pending' },
      ipAddress,
      userAgent,
    });
  }

  return {
    id: data.user.id,
    email: data.user.email,
    accountType: input.accountType,
    accountStatus: 'pending',
    mustChangePassword: true,
  };
}

export async function changeUserStatus(
  input: UpdateStatusInput,
  meta: RequestMeta,
): Promise<Record<string, unknown>> {
  const { userId, accountStatus, reason, actorId } = input;

  // Prevent suspending/rejecting the last active admin
  if (accountStatus === 'suspended' || accountStatus === 'rejected') {
    const adminCount = await countActiveAdmins();
    if (adminCount <= 1 && userId === actorId) {
      throw AppError.badRequest(
        'Cannot suspend or reject the only active admin account. Promote another admin first.',
        'ADMIN_LOCKOUT_PREVENTED'
      );
    }
  }

  const current = await getAccountStatus(userId);
  const updated = await updateAccountStatus(userId, accountStatus, actorId, reason);
  if (!updated) {
    throw AppError.notFound('User account not found');
  }

  // Security: ensure status changes take effect immediately for existing JWTs.
  // If a user is suspended/rejected/pending, revoke all backend-registered sessions.
  // (This blocks requests even if the access token claim is stale.)
  if (accountStatus !== 'active') {
    try {
      await revokeAllUserSessions({ userId });
    } catch (sessionError) {
      logger.warn(
        { err: sessionError, userId, accountStatus },
        'Failed to revoke user sessions after account status change',
      );
    }
  }

  const actionMap: Record<AccountStatus, AuditAction> = {
    active: 'user.approve',
    suspended: 'user.suspend',
    rejected: 'user.reject',
    pending: 'user.approve',
  };

  const { ipAddress, userAgent } = extractRequestMeta(meta.headers, meta.socketAddress);
  await writeAuditLog({
    actorId,
    action: actionMap[accountStatus],
    targetType: 'user_account',
    targetId: updated.id,
    oldValue: current
      ? {
          accountStatus: current.account_status,
          rejectedReason: current.rejected_reason,
          suspendedReason: current.suspended_reason,
        }
      : undefined,
    newValue: {
      accountStatus: updated.account_status,
      rejectedReason: updated.rejected_reason,
      suspendedReason: updated.suspended_reason,
      reason,
    },
    ipAddress,
    userAgent,
  });

  return {
    id: updated.id,
    accountType: updated.account_type,
    accountStatus: updated.account_status,
    mustChangePassword: updated.must_change_password,
    approvedBy: updated.approved_by,
    approvedAt: updated.approved_at,
    rejectedReason: updated.rejected_reason,
    suspendedReason: updated.suspended_reason,
    updatedAt: updated.updated_at,
  };
}

export async function listUsers(filters: ListUsersFilters, page: number, limit: number, skip: number) {
  const [total, rows] = await Promise.all([
    countUsers(filters),
    findUsers(filters, limit, skip),
  ]);

  const mapped = rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    accountType: row.account_type,
    accountStatus: row.account_status,
    mustChangePassword: row.must_change_password,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedReason: row.rejected_reason,
    suspendedReason: row.suspended_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { data: mapped, total, page, limit };
}

export async function getUserDetail(userId: string) {
  const [row, lastSignInAt] = await Promise.all([
    findUserById(userId),
    findLastUserSignInAt(userId),
  ]);

  if (!row) {
    throw AppError.notFound('User account not found');
  }

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    gender: row.gender,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    bloodType: row.blood_type,
    allergies: row.allergies,
    chronicConditions: row.chronic_conditions,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    accountType: row.account_type,
    accountStatus: row.account_status,
    mustChangePassword: row.must_change_password,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    lastSignInAt,
    rejectedReason: row.rejected_reason,
    suspendedReason: row.suspended_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateUserProfile(
  userId: string,
  input: AdminProfileUpdateInput,
  actorId: string,
  meta: RequestMeta,
) {
  const current = await findUserById(userId);
  if (!current) {
    throw AppError.notFound('User account not found');
  }

  await updateUserProfileByAdmin(userId, input);
  const updated = await getUserDetail(userId);

  const { ipAddress, userAgent } = extractRequestMeta(meta.headers, meta.socketAddress);
  await writeAuditLog({
    actorId,
    action: 'user.approve',
    targetType: 'user_account',
    targetId: userId,
    oldValue: {
      firstName: current.first_name,
      lastName: current.last_name,
      phone: current.phone,
      gender: current.gender,
      dateOfBirth: current.date_of_birth,
    },
    newValue: {
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      gender: updated.gender,
      dateOfBirth: updated.dateOfBirth,
    },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function resetUserTemporaryPassword(
  input: ResetTemporaryPasswordInput,
  meta: RequestMeta,
) {
  const { userId, temporaryPassword, actorId } = input;

  if (userId === actorId) {
    throw AppError.badRequest(
      'Use your own profile to change your password.',
      'ADMIN_SELF_PASSWORD_RESET_FORBIDDEN',
    );
  }

  const [current, userDetail] = await Promise.all([
    getAccountStatus(userId),
    findUserById(userId),
  ]);

  if (!current || !userDetail) {
    throw AppError.notFound('User account not found');
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
  });

  if (error) {
    throw AppError.badRequest(
      error.message || 'Unable to reset password',
      'ADMIN_TEMP_PASSWORD_RESET_FAILED',
    );
  }

  const updated = await updateUserMustChangePassword(userId, true);
  if (!updated) {
    throw AppError.notFound('User account not found');
  }

  let revokedSessions = 0;
  try {
    revokedSessions = await revokeAllUserSessions({ userId });
  } catch (sessionError) {
    logger.warn(
      { err: sessionError, userId },
      'Failed to revoke user sessions after temporary password reset',
    );
  }

  const targetEmail = toNullableEmail(userDetail.email);
  if (targetEmail) {
    await sendAdminPasswordChangedNoticeEmail({
      to: targetEmail,
    });
  }

  const { ipAddress, userAgent } = extractRequestMeta(meta.headers, meta.socketAddress);
  try {
    await writeAuditLog({
      actorId,
      action: 'user.force_password_reset',
      targetType: 'user_account',
      targetId: userId,
      oldValue: {
        mustChangePassword: current.must_change_password,
      },
      newValue: {
        mustChangePassword: updated.must_change_password,
        revokedSessions,
        emailNotificationRequested: Boolean(targetEmail),
      },
      ipAddress,
      userAgent,
    });
  } catch (auditError) {
    logger.warn(
      { err: auditError, actorId, userId },
      'Failed to write audit log for temporary password reset',
    );
  }

  return {
    id: updated.id,
    mustChangePassword: updated.must_change_password,
    revokedSessions,
  };
}

export async function sendUserPasswordResetLink(
  input: SendPasswordResetLinkInput,
  meta: RequestMeta,
) {
  const { userId, actorId } = input;

  if (userId === actorId) {
    throw AppError.badRequest(
      'Use your own profile to reset your password.',
      'ADMIN_SELF_PASSWORD_RESET_LINK_FORBIDDEN',
    );
  }

  const [current, userDetail] = await Promise.all([
    getAccountStatus(userId),
    findUserById(userId),
  ]);

  if (!current || !userDetail) {
    throw AppError.notFound('User account not found');
  }

  const email = toNullableEmail(userDetail.email);
  if (!email) {
    throw AppError.badRequest(
      'User account does not have a valid email address.',
      'ADMIN_PASSWORD_RESET_EMAIL_MISSING',
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const redirectTo = resolvePasswordResetRedirectUrl();
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw AppError.badRequest(
      error.message || 'Unable to send password reset email',
      'ADMIN_PASSWORD_RESET_LINK_FAILED',
    );
  }

  const { ipAddress, userAgent } = extractRequestMeta(meta.headers, meta.socketAddress);
  try {
    await writeAuditLog({
      actorId,
      action: 'user.force_password_reset',
      targetType: 'user_account',
      targetId: userId,
      oldValue: {
        mustChangePassword: current.must_change_password,
      },
      newValue: {
        delivery: 'reset_link_email',
        email,
      },
      ipAddress,
      userAgent,
    });
  } catch (auditError) {
    logger.warn(
      { err: auditError, actorId, userId },
      'Failed to write audit log for password reset link delivery',
    );
  }

  return {
    id: userId,
    email,
  };
}

export async function changeUserAccountType(
  input: UpdateAccountTypeInput,
  meta: RequestMeta,
) {
  const current = await getAccountStatus(input.userId);
  if (!current) {
    throw AppError.notFound('User account not found');
  }

  const nextStatus: AccountStatus =
    input.accountType === 'patient' ? 'active' :
      input.accountType === 'admin' ? 'active' :
        'pending';

  const mustChangePassword = input.accountType !== 'patient';

  const updated = await updateUserAccountType(
    input.userId,
    input.accountType,
    nextStatus,
    mustChangePassword,
    input.actorId,
  );

  if (!updated) {
    throw AppError.notFound('User account not found');
  }

  // Security: account type changes can grant/revoke privileges; revoke sessions so
  // old tokens with stale claims cannot continue to access privileged endpoints.
  try {
    await revokeAllUserSessions({ userId: input.userId });
  } catch (sessionError) {
    logger.warn(
      { err: sessionError, userId: input.userId, accountType: input.accountType },
      'Failed to revoke user sessions after account type change',
    );
  }

  const { ipAddress, userAgent } = extractRequestMeta(meta.headers, meta.socketAddress);
  await writeAuditLog({
    actorId: input.actorId,
    action: 'user.approve',
    targetType: 'user_account',
    targetId: input.userId,
    oldValue: {
      accountType: current.account_type,
      accountStatus: current.account_status,
      mustChangePassword: current.must_change_password,
    },
    newValue: {
      accountType: updated.account_type,
      accountStatus: updated.account_status,
      mustChangePassword: updated.must_change_password,
    },
    ipAddress,
    userAgent,
  });

  return {
    id: updated.id,
    accountType: updated.account_type,
    accountStatus: updated.account_status,
    mustChangePassword: updated.must_change_password,
    approvedBy: updated.approved_by,
    approvedAt: updated.approved_at,
    rejectedReason: updated.rejected_reason,
    suspendedReason: updated.suspended_reason,
    updatedAt: updated.updated_at,
  };
}

export async function deleteUserAccount(input: DeleteUserInput, meta: RequestMeta) {
  const current = await getAccountStatus(input.userId);
  if (!current) {
    throw AppError.notFound('User account not found');
  }

  if (current.account_type === 'admin' && current.account_status === 'active') {
    const adminCount = await countActiveAdmins();
    if (adminCount <= 1) {
      throw AppError.badRequest(
        'Cannot delete the only active admin account. Create another active admin first.',
        'ADMIN_LOCKOUT_PREVENTED',
      );
    }
  }

  // Best-effort: revoke backend sessions before deleting the Supabase identity.
  // This prevents short-lived auth cache windows from allowing access post-delete.
  try {
    await revokeAllUserSessions({ userId: input.userId });
  } catch (sessionError) {
    logger.warn(
      { err: sessionError, userId: input.userId },
      'Failed to revoke user sessions before account deletion',
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(input.userId);
  if (error) {
    throw AppError.badRequest(error.message, 'ADMIN_DELETE_USER_FAILED');
  }

  const { ipAddress, userAgent } = extractRequestMeta(meta.headers, meta.socketAddress);
  await writeAuditLog({
    actorId: input.actorId,
    action: 'user.reject',
    targetType: 'user_account',
    targetId: input.userId,
    oldValue: {
      accountType: current.account_type,
      accountStatus: current.account_status,
      mustChangePassword: current.must_change_password,
    },
    newValue: {
      deleted: true,
    },
    ipAddress,
    userAgent,
  });
}

export async function listAuditLog(filters: AuditLogFilters, page: number, limit: number, skip: number) {
  const [total, rows] = await Promise.all([
    countAuditLogs(filters),
    findAuditLogs(filters, limit, skip),
  ]);

  const mapped = rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    actorName: [row.actor_first_name, row.actor_last_name].filter(Boolean).join(' ') || null,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    oldValue: row.old_value,
    newValue: row.new_value,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  }));

  return { data: mapped, total, page, limit };
}
