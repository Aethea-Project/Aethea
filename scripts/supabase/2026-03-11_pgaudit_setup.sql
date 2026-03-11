-- ============================================================
-- PGAudit Setup — Run AFTER enabling the pgaudit extension
-- Date: 2026-03-11
-- Purpose:
--   Configure pgaudit to monitor all writes to user_accounts and
--   staff_profiles at the database level. This is a safety net that
--   catches any direct DB edits that bypass the application layer.
--
-- HOW TO USE:
--   1. Go to Supabase Dashboard → Database → Extensions
--   2. Search "pgaudit" and click Enable
--   3. Run this script in Supabase SQL Editor
--
-- WHERE TO FIND THE LOGS:
--   Supabase Dashboard → Logs → Postgres Logs
--   Filter by: AUDIT%user_accounts or AUDIT%staff_profiles
-- ============================================================

-- Create a dedicated role that pgaudit uses to scope what it monitors.
-- This role cannot log in — it exists only to define the audit scope.
DO $$ BEGIN
  CREATE ROLE "aethea_auditor" noinherit;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant the auditor role visibility into the tables we want monitored.
-- pgaudit will log any SELECT, INSERT, UPDATE, or DELETE on these tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_accounts   TO "aethea_auditor";
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles  TO "aethea_auditor";

-- Tell pgaudit to use our auditor role as the monitoring scope.
ALTER ROLE "postgres" SET pgaudit.role TO 'aethea_auditor';

-- Confirm the configuration took effect.
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname IN ('postgres', 'aethea_auditor');
