/**
 * Admin Repository — raw SQL queries for user management
 *
 * Isolates Prisma $queryRaw/$executeRaw calls behind typed functions
 * so controllers and services never see raw SQL directly.
 */

import { Prisma } from '../generated/prisma/client';
import prisma from '../lib/prisma.js';

/* ─── Shared types ─── */

export type AccountStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type StaffAccountType = 'doctor' | 'pharmacist';

export interface AccountStatusRow {
  id: string;
  account_type: string;
  account_status: string;
  must_change_password: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  suspended_reason: string | null;
  updated_at: string;
}

export interface AdminUserRow {
  id: unknown;
  email: unknown;
  first_name: unknown;
  last_name: unknown;
  account_type: unknown;
  account_status: unknown;
  must_change_password: unknown;
  approved_by: unknown;
  approved_at: unknown;
  rejected_reason: unknown;
  suspended_reason: unknown;
  created_at: unknown;
  updated_at: unknown;
}

export interface AuditLogRow {
  id: unknown;
  actor_id: unknown;
  actor_email: unknown;
  actor_first_name: unknown;
  actor_last_name: unknown;
  action: unknown;
  target_type: unknown;
  target_id: unknown;
  old_value: unknown;
  new_value: unknown;
  ip_address: unknown;
  created_at: unknown;
}

export interface ListUsersFilters {
  accountType?: string;
  accountStatus?: string;
  search?: string;
}

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  targetId?: string;
  from?: string;
  to?: string;
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* ─── User account queries ─── */

export async function insertUserAccount(userId: string, accountType: StaffAccountType): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO public.user_accounts (id, account_type, account_status, must_change_password)
    VALUES (
      ${userId}::uuid,
      ${accountType}::public.account_type,
      'pending'::public.account_status,
      TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
      account_type = EXCLUDED.account_type,
      account_status = EXCLUDED.account_status,
      must_change_password = TRUE,
      updated_at = now()
  `;
}

export async function countActiveAdmins(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM public.user_accounts
      WHERE account_type = 'admin' AND account_status = 'active'
    `
  );
  return rows[0]?.count ?? 0;
}

export async function getAccountStatus(userId: string): Promise<AccountStatusRow | undefined> {
  const rows = await prisma.$queryRaw<AccountStatusRow[]>(
    Prisma.sql`
      SELECT id, account_type, account_status, must_change_password, approved_by, approved_at,
             rejected_reason, suspended_reason, updated_at
      FROM public.user_accounts WHERE id = ${userId}::uuid
    `
  );
  return rows[0];
}

export async function updateAccountStatus(
  userId: string,
  accountStatus: AccountStatus,
  actorId: string,
  reason?: string,
): Promise<AccountStatusRow | undefined> {
  const rows = await prisma.$queryRaw<AccountStatusRow[]>`
    UPDATE public.user_accounts
    SET
      account_status = ${accountStatus}::public.account_status,
      approved_by = CASE WHEN ${accountStatus} = 'active' THEN ${actorId}::uuid ELSE approved_by END,
      approved_at = CASE WHEN ${accountStatus} = 'active' THEN now() ELSE approved_at END,
      rejected_reason = CASE WHEN ${accountStatus} = 'rejected' THEN ${reason ?? null} ELSE NULL END,
      suspended_reason = CASE WHEN ${accountStatus} = 'suspended' THEN ${reason ?? null} ELSE NULL END,
      updated_at = now()
    WHERE id = ${userId}::uuid
    RETURNING id, account_type, account_status, must_change_password, approved_by, approved_at, rejected_reason, suspended_reason, updated_at
  `;
  return rows[0];
}

/* ─── List users (paginated + filtered) ─── */

function buildUserWhereClause(filters: ListUsersFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (filters.accountType) {
    conditions.push(Prisma.sql`ua.account_type = ${filters.accountType}::public.account_type`);
  }

  if (filters.accountStatus) {
    conditions.push(Prisma.sql`ua.account_status = ${filters.accountStatus}::public.account_status`);
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      Prisma.sql`(p.email ILIKE ${pattern} OR p.first_name ILIKE ${pattern} OR p.last_name ILIKE ${pattern})`
    );
  }

  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
}

export async function countUsers(filters: ListUsersFilters): Promise<number> {
  const whereClause = buildUserWhereClause(filters);
  const rows = await prisma.$queryRaw<Array<{ total: number }>>(
    Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM public.user_accounts ua
      LEFT JOIN public.profiles p ON p.id = ua.id
      ${whereClause}
    `
  );
  return rows[0]?.total ?? 0;
}

export async function findUsers(filters: ListUsersFilters, limit: number, offset: number): Promise<AdminUserRow[]> {
  const whereClause = buildUserWhereClause(filters);
  return prisma.$queryRaw<AdminUserRow[]>(
    Prisma.sql`
      SELECT
        ua.id,
        p.email,
        p.first_name,
        p.last_name,
        ua.account_type,
        ua.account_status,
        ua.must_change_password,
        ua.approved_by,
        ua.approved_at,
        ua.rejected_reason,
        ua.suspended_reason,
        ua.created_at,
        ua.updated_at
      FROM public.user_accounts ua
      LEFT JOIN public.profiles p ON p.id = ua.id
      ${whereClause}
      ORDER BY ua.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  );
}

/* ─── Audit log queries ─── */

function buildAuditWhereClause(filters: AuditLogFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (filters.actorId && UUID_V4_REGEX.test(filters.actorId)) {
    conditions.push(Prisma.sql`l.actor_id = ${filters.actorId}::uuid`);
  }

  if (filters.action) {
    conditions.push(Prisma.sql`l.action = ${filters.action}`);
  }

  if (filters.targetId && UUID_V4_REGEX.test(filters.targetId)) {
    conditions.push(Prisma.sql`l.target_id = ${filters.targetId}::uuid`);
  }

  if (filters.from) {
    conditions.push(Prisma.sql`l.created_at >= ${filters.from}::timestamptz`);
  }

  if (filters.to) {
    conditions.push(Prisma.sql`l.created_at <= ${filters.to}::timestamptz`);
  }

  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
}

export async function countAuditLogs(filters: AuditLogFilters): Promise<number> {
  const whereClause = buildAuditWhereClause(filters);
  const rows = await prisma.$queryRaw<Array<{ total: number }>>(
    Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM public.admin_audit_log l
      ${whereClause}
    `
  );
  return rows[0]?.total ?? 0;
}

export async function findAuditLogs(filters: AuditLogFilters, limit: number, offset: number): Promise<AuditLogRow[]> {
  const whereClause = buildAuditWhereClause(filters);
  return prisma.$queryRaw<AuditLogRow[]>(
    Prisma.sql`
      SELECT
        l.id,
        l.actor_id,
        p.email        AS actor_email,
        p.first_name   AS actor_first_name,
        p.last_name    AS actor_last_name,
        l.action,
        l.target_type,
        l.target_id,
        l.old_value,
        l.new_value,
        l.ip_address,
        l.created_at
      FROM public.admin_audit_log l
      LEFT JOIN public.profiles p ON p.id = l.actor_id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  );
}
