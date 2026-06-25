-- OBSOLETE SCRIPT - DO NOT APPLY
-- This legacy helper injected only account_type into JWTs.
-- Protected routes now require account_type, account_status, and
-- must_change_password trusted claims.
--
-- Use scripts/supabase/2026-06-06_auth_admin_security_hardening.sql instead.

DO $$
BEGIN
  RAISE EXCEPTION
    'backend/custom_access_token_hook.sql is obsolete. Apply scripts/supabase/2026-06-06_auth_admin_security_hardening.sql instead.';
END;
$$;
