-- ============================================================
-- Admin Audit Log — Migration
-- Date: 2026-03-11
-- Purpose:
--   Append-only log of every business-level admin action:
--   user approval, suspension, rejection, staff profile review decisions.
--   Records who did what, to whom, when, from where, and what changed.
--
-- This complements Supabase's built-in auth.audit_log_entries (which
-- covers auth events) with application-layer business action traceability.
--
-- HOW TO USE:
--   Run this script once in Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ============================================================
-- 1) Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID        NOT NULL REFERENCES auth.users(id),
  action       TEXT        NOT NULL,
  target_type  TEXT        NOT NULL,
  target_id    UUID        NOT NULL,
  old_value    JSONB,
  new_value    JSONB,
  ip_address   TEXT,
  user_agent   TEXT,
  target_email TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce known action values
ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS ck_aal_action,
  DROP CONSTRAINT IF EXISTS ck_aal_target_type;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT ck_aal_action
    CHECK (action IN (
      'user.view',
      'user.approve',
      'user.suspend',
      'user.reject',
      'user.delete',
      'user.create',
      'user.profile_update',
      'user.account_type_change',
      'user.force_password_reset',
      'staff.review_approve',
      'staff.review_reject'
    )),
  ADD CONSTRAINT ck_aal_target_type
    CHECK (target_type IN ('user_account', 'staff_profile'));

-- Indexes for the common query patterns
CREATE INDEX IF NOT EXISTS idx_aal_actor_id    ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_aal_action      ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_aal_target_id   ON public.admin_audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_aal_target_email ON public.admin_audit_log(target_email);
CREATE INDEX IF NOT EXISTS idx_aal_created_at  ON public.admin_audit_log(created_at DESC);

-- ============================================================
-- 2) RLS
-- Admins can read all rows. Nobody can write directly (service_role only).
-- ============================================================

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'account_type')::text = '"admin"'
  );

DROP POLICY IF EXISTS "Service role full access to audit log" ON public.admin_audit_log;
CREATE POLICY "Service role full access to audit log"
  ON public.admin_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3) Grants
-- ============================================================

GRANT ALL ON public.admin_audit_log TO service_role;
GRANT SELECT ON public.admin_audit_log TO authenticated;

COMMIT;
