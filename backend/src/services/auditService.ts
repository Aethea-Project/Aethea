/**
 * Audit Service — cross-cutting domain concern
 *
 * Records admin actions with before/after state snapshots for compliance.
 */

import prisma from '../lib/prisma.js';

export type AuditAction =
  | 'user.view'
  | 'user.approve'
  | 'user.suspend'
  | 'user.reject'
  | 'user.delete'
  | 'user.create'
  | 'user.profile_update'
  | 'user.account_type_change'
  | 'user.force_password_reset'
  | 'staff.review_approve'
  | 'staff.review_reject';

export type AuditTargetType = 'user_account' | 'staff_profile';

export interface AuditLogInput {
  actorId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  targetEmail?: string;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO public.admin_audit_log
      (actor_id, action, target_type, target_id, old_value, new_value, ip_address, user_agent, target_email)
    VALUES (
      ${input.actorId}::uuid,
      ${input.action},
      ${input.targetType},
      ${input.targetId}::uuid,
      ${input.oldValue ? JSON.stringify(input.oldValue) : null}::jsonb,
      ${input.newValue ? JSON.stringify(input.newValue) : null}::jsonb,
      ${input.ipAddress},
      ${input.userAgent},
      ${input.targetEmail ?? null}
    )
  `;
}

export function extractRequestMeta(headers: Record<string, string | string[] | undefined>, socketAddress?: string) {
  const ip = socketAddress ?? null;
  const ua = (headers['user-agent'] as string | undefined) ?? null;
  return { ipAddress: ip, userAgent: ua };
}
