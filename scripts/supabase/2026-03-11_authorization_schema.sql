-- ============================================================
-- Supabase Migration: Authorization Schema
-- Version: 1.0
-- Date: 2026-03-11
-- Purpose:
--   1) Add account_type and account_status enums
--   2) Create user_accounts table (one row per auth user)
--   3) Create staff_profiles table (doctor/pharmacist verification)
--   4) Wire auto-insert into user_accounts on signup
--   5) Backfill existing users as patient/active
-- Run in: Supabase SQL Editor (after profiles_reconcile.sql)
-- ============================================================

BEGIN;

-- ============================================================
-- 1) Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('patient', 'doctor', 'pharmacist', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('pending', 'active', 'suspended', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2) user_accounts table
-- One row per auth.users row. Holds trusted authorization state.
-- Never modified by clients — only by triggers, hooks, and service_role.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_accounts (
  id                   UUID                    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type         public.account_type     NOT NULL,
  account_status       public.account_status   NOT NULL DEFAULT 'pending',
  must_change_password BOOLEAN                 NOT NULL DEFAULT FALSE,
  approved_by          UUID                    REFERENCES auth.users(id),
  approved_at          TIMESTAMPTZ,
  rejected_reason      TEXT,
  suspended_reason     TEXT,
  created_at           TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ             NOT NULL DEFAULT now()
);

ALTER TABLE public.user_accounts
  DROP CONSTRAINT IF EXISTS ck_ua_rejected_reason_len,
  DROP CONSTRAINT IF EXISTS ck_ua_suspended_reason_len;
ALTER TABLE public.user_accounts
  ADD CONSTRAINT ck_ua_rejected_reason_len
    CHECK (rejected_reason IS NULL OR length(rejected_reason) <= 500),
  ADD CONSTRAINT ck_ua_suspended_reason_len
    CHECK (suspended_reason IS NULL OR length(suspended_reason) <= 500);

CREATE INDEX IF NOT EXISTS idx_ua_account_type   ON public.user_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_ua_account_status ON public.user_accounts(account_status);
CREATE INDEX IF NOT EXISTS idx_ua_type_status    ON public.user_accounts(account_type, account_status);

DROP TRIGGER IF EXISTS update_user_accounts_updated_at ON public.user_accounts;
CREATE TRIGGER update_user_accounts_updated_at
  BEFORE UPDATE ON public.user_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) staff_profiles table
-- Stores verification documents for doctors and pharmacists.
-- Paths point to private Supabase Storage objects.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id                    UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID                    NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_type            public.account_type     NOT NULL,
  government_id_path    TEXT,
  specialty             TEXT,
  affiliation_name      TEXT,
  affiliation_type      TEXT,
  certificate_file_path TEXT,
  selfie_file_path      TEXT,
  verification_status   TEXT                    NOT NULL DEFAULT 'unverified',
  verification_notes    TEXT,
  submitted_at          TIMESTAMPTZ,
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           UUID                    REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ             NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles
  DROP CONSTRAINT IF EXISTS ck_sp_staff_type,
  DROP CONSTRAINT IF EXISTS ck_sp_affiliation_type,
  DROP CONSTRAINT IF EXISTS ck_sp_verification_status;
ALTER TABLE public.staff_profiles
  ADD CONSTRAINT ck_sp_staff_type
    CHECK (staff_type IN ('doctor', 'pharmacist')),
  ADD CONSTRAINT ck_sp_affiliation_type
    CHECK (affiliation_type IS NULL OR affiliation_type IN ('hospital', 'clinic', 'pharmacy', 'other')),
  ADD CONSTRAINT ck_sp_verification_status
    CHECK (verification_status IN ('unverified', 'under_review', 'verified', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_sp_user_id             ON public.staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_staff_type          ON public.staff_profiles(staff_type);
CREATE INDEX IF NOT EXISTS idx_sp_verification_status ON public.staff_profiles(verification_status);

DROP TRIGGER IF EXISTS update_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER update_staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4) RLS
-- ============================================================

ALTER TABLE public.user_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- user_accounts: each user reads only their own row
DROP POLICY IF EXISTS "User can view own account" ON public.user_accounts;
CREATE POLICY "User can view own account"
  ON public.user_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- user_accounts: no client writes — only service_role and triggers
DROP POLICY IF EXISTS "Service role full access to user_accounts" ON public.user_accounts;
CREATE POLICY "Service role full access to user_accounts"
  ON public.user_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- staff_profiles: each staff member reads their own row
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff_profiles;
CREATE POLICY "Staff can view own profile"
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- staff_profiles: staff can create their own row
DROP POLICY IF EXISTS "Staff can insert own profile" ON public.staff_profiles;
CREATE POLICY "Staff can insert own profile"
  ON public.staff_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- staff_profiles: staff can update their own row only before submission
DROP POLICY IF EXISTS "Staff can update own unsubmitted profile" ON public.staff_profiles;
CREATE POLICY "Staff can update own unsubmitted profile"
  ON public.staff_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND verification_status = 'unverified')
  WITH CHECK (auth.uid() = user_id);

-- service_role bypasses all RLS on staff_profiles
DROP POLICY IF EXISTS "Service role full access to staff_profiles" ON public.staff_profiles;
CREATE POLICY "Service role full access to staff_profiles"
  ON public.staff_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5) Grants
-- ============================================================

GRANT ALL ON public.user_accounts  TO service_role;
GRANT SELECT ON public.user_accounts TO authenticated;

GRANT ALL ON public.staff_profiles  TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.staff_profiles TO authenticated;

-- ============================================================
-- 6) Updated handle_new_user() trigger function
-- Extends the existing profile creation to also insert a
-- user_accounts row on every new signup.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name   TEXT;
  v_last_name    TEXT;
  v_gender       TEXT;
  v_phone        TEXT;
  v_date_of_birth DATE;
  v_account_type TEXT;
BEGIN
  v_first_name := NULLIF(trim(COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'given_name', ''
  )), '');
  v_last_name := NULLIF(trim(COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'family_name', ''
  )), '');
  v_gender       := NEW.raw_user_meta_data->>'gender';
  v_phone        := NEW.raw_user_meta_data->>'phone';
  v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'patient');

  BEGIN
    v_date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_date_of_birth := NULL;
  END;

  -- Insert profile row (unchanged existing logic)
  INSERT INTO public.profiles (
    id, email, first_name, last_name,
    gender, phone, date_of_birth, avatar_url
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_first_name,
    v_last_name,
    v_gender,
    v_phone,
    v_date_of_birth,
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email         = EXCLUDED.email,
    first_name    = COALESCE(public.profiles.first_name, EXCLUDED.first_name),
    last_name     = COALESCE(public.profiles.last_name, EXCLUDED.last_name),
    gender        = COALESCE(public.profiles.gender, EXCLUDED.gender),
    phone         = COALESCE(public.profiles.phone, EXCLUDED.phone),
    date_of_birth = COALESCE(public.profiles.date_of_birth, EXCLUDED.date_of_birth),
    avatar_url    = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at    = now();

  -- Insert authorization row.
  -- Patients start active (they confirm via email link).
  -- Staff (doctor/pharmacist/admin) start pending until an admin approves.
  INSERT INTO public.user_accounts (
    id,
    account_type,
    account_status,
    must_change_password
  )
  VALUES (
    NEW.id,
    v_account_type::public.account_type,
    CASE
      WHEN v_account_type = 'patient' THEN 'active'::public.account_status
      ELSE 'pending'::public.account_status
    END,
    CASE
      WHEN v_account_type IN ('doctor', 'pharmacist', 'admin') THEN TRUE
      ELSE FALSE
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ============================================================
-- 7) Backfill existing users who have no user_accounts row.
-- Assumes they are patients (safest default).
-- ============================================================

INSERT INTO public.user_accounts (id, account_type, account_status, must_change_password)
SELECT
  au.id,
  'patient'::public.account_type,
  'active'::public.account_status,
  FALSE
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_accounts ua WHERE ua.id = au.id
);

COMMIT;
