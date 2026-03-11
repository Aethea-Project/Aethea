/**
 * Admin User Service — business logic for admin user management
 *
 * Orchestrates Supabase Admin API, the admin repository, and auditing.
 * Controllers should delegate here instead of embedding this logic.
 */

import { AppError } from '../lib/AppError.js';
import { getSupabaseAdminClient } from '../lib/supabaseAdmin.js';
import { writeAuditLog, extractRequestMeta, type AuditAction } from './auditService.js';
import {
  insertUserAccount,
  countActiveAdmins,
  getAccountStatus,
  updateAccountStatus,
  countUsers,
  findUsers,
  countAuditLogs,
  findAuditLogs,
  type AccountStatus,
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
