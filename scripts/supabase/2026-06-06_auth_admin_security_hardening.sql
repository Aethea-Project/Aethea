-- ============================================================
-- Auth/Admin Security Hardening Follow-up
-- Date: 2026-06-06
-- Purpose:
--   Keep Supabase-side trusted claims and admin audit definitions aligned
--   with the application hardening in v9.1.
-- Run in: Supabase SQL Editor, after the 2026-03-11 scripts.
-- ============================================================

BEGIN;

-- Keep audit schema compatible with durable actor/target snapshots.
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS target_email TEXT;

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

CREATE INDEX IF NOT EXISTS idx_aal_target_email ON public.admin_audit_log(target_email);

-- Current trusted-claim hook. This replaces older copies that only inject
-- account_type and would make protected routes reject otherwise-valid users.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_type    TEXT;
  v_status  TEXT;
  v_mcp     BOOLEAN;
  v_claims  JSONB;
BEGIN
  v_user_id := (event->>'user_id')::UUID;
  v_claims  := event->'claims';

  SELECT
    account_type::TEXT,
    account_status::TEXT,
    must_change_password
  INTO v_type, v_status, v_mcp
  FROM public.user_accounts
  WHERE id = v_user_id;

  IF FOUND THEN
    v_claims := jsonb_set(v_claims, '{account_type}',         to_jsonb(v_type));
    v_claims := jsonb_set(v_claims, '{account_status}',       to_jsonb(v_status));
    v_claims := jsonb_set(v_claims, '{must_change_password}', to_jsonb(v_mcp));
  END IF;

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) FROM PUBLIC, authenticated, anon;

COMMIT;
