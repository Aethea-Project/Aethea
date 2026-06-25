/**
 * Audit Helper — reduces boilerplate for admin audit log entries
 *
 * Wraps extractRequestMeta + writeAuditLog into a single call
 * that every admin service function can use in one line.
 */

import { writeAuditLog, extractRequestMeta, type AuditAction, type AuditTargetType } from './auditService.js';
import type { RequestMeta } from './adminUserService.js';

export async function auditUserAction(
  meta: RequestMeta,
  actorId: string,
  action: AuditAction,
  targetId: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
  targetEmail?: string,
): Promise<void> {
  const { ipAddress, userAgent } = extractRequestMeta(meta.headers, meta.socketAddress);
  await writeAuditLog({
    actorId,
    action,
    targetType: 'user_account' as AuditTargetType,
    targetId,
    oldValue,
    newValue,
    ipAddress,
    userAgent,
    targetEmail,
  });
}
