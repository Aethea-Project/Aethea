-- ============================================================
-- Supabase Auth Hook Functions
-- Version: 1.0
-- Date: 2026-03-11
-- Purpose:
--   1) before_user_created  — blocks non-patient public signups
--   2) custom_access_token_hook — injects account_type, account_status,
--      and must_change_password into every issued JWT
-- Prerequisites: Run 2026-03-11_authorization_schema.sql first.
-- Run in: Supabase SQL Editor
-- After running: enable both hooks in Supabase Dashboard
--   Authentication → Hooks → select the matching functions.
-- ============================================================

BEGIN;

-- ============================================================
-- 1) before_user_created hook
-- Called by Supabase Auth before creating a new user.
-- Blocks doctor / pharmacist / admin signups from the public form.
-- Admin-created users (Dashboard or service_role API) always pass.
-- ============================================================

CREATE OR REPLACE FUNCTION public.before_user_created(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_type TEXT;
BEGIN
  -- Users created via Supabase Dashboard or service_role API
  -- have source = 'admin' — always allow.
  IF (event->>'source') = 'admin' THEN
    RETURN event;
  END IF;

  v_account_type := COALESCE(
    event->'claims'->'raw_user_meta_data'->>'account_type',
    'patient'
  );

  IF v_account_type NOT IN ('patient') THEN
    RAISE EXCEPTION
      'Public signup is restricted to patient accounts. Contact an administrator.';
  END IF;

  RETURN event;
END;
$$;

-- Supabase requires these exact grants to invoke the hook
GRANT EXECUTE ON FUNCTION public.before_user_created(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.before_user_created(JSONB) FROM PUBLIC, authenticated, anon;

-- ============================================================
-- 2) custom_access_token_hook
-- Called by Supabase Auth every time it issues a JWT.
-- Reads user_accounts and injects trusted claims that the
-- backend and frontend can rely on without extra DB lookups.
--
-- Injected claims (top-level in the JWT payload):
--   account_type         : 'patient' | 'doctor' | 'pharmacist' | 'admin'
--   account_status       : 'pending' | 'active' | 'suspended' | 'rejected'
--   must_change_password : true | false
-- ============================================================

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

  -- Only inject if a user_accounts row exists.
  -- If missing (e.g. during the brief window before the trigger fires)
  -- the JWT is still issued without role claims — backend will reject it.
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
