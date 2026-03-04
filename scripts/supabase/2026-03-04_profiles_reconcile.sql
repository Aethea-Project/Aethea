-- ============================================================
-- Supabase Migration: Medical Platform - Profiles Reconciliation
-- Version: 1.2
-- Date: 2026-03-04
-- Purpose:
--   1) Align profiles schema with current app contract
--   2) Avoid 400 errors from generated/full_name writes and strict NOT NULL names
--   3) Keep auto-profile creation on new auth users
-- ============================================================

BEGIN;

-- 1) Base table (safe for fresh projects)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,

  first_name VARCHAR(50),
  last_name VARCHAR(50),
  full_name VARCHAR(100) GENERATED ALWAYS AS (
    CASE
      WHEN first_name IS NULL AND last_name IS NULL THEN NULL
      WHEN first_name IS NULL THEN last_name
      WHEN last_name IS NULL THEN first_name
      ELSE first_name || ' ' || last_name
    END
  ) STORED,

  gender VARCHAR(20),
  phone VARCHAR(20),
  date_of_birth DATE,

  blood_type VARCHAR(3),
  allergies TEXT,
  chronic_conditions TEXT,
  height_cm NUMERIC(5, 1),
  weight_kg NUMERIC(5, 1),

  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),

  avatar_url TEXT,
  is_profile_complete BOOLEAN GENERATED ALWAYS AS (
    first_name IS NOT NULL
    AND last_name IS NOT NULL
    AND date_of_birth IS NOT NULL
    AND gender IS NOT NULL
  ) STORED,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Add missing columns for existing projects
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blood_type VARCHAR(3);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chronic_conditions TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 1);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5, 1);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Make sure legacy strict constraints don't block OAuth/new users.
ALTER TABLE public.profiles ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

-- 3) Constraints (drop old defaults then add explicit named constraints)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_first_name_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_last_name_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_date_of_birth_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_blood_type_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_allergies_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_chronic_conditions_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_height_cm_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_weight_kg_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_emergency_contact_name_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_emergency_contact_phone_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_url_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT ck_profiles_first_name_min_len
    CHECK (first_name IS NULL OR length(trim(first_name)) >= 2),
  ADD CONSTRAINT ck_profiles_last_name_min_len
    CHECK (last_name IS NULL OR length(trim(last_name)) >= 2),
  ADD CONSTRAINT ck_profiles_gender_allowed
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD CONSTRAINT ck_profiles_phone_format
    CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{1,3}[0-9]{7,12}$'),
  ADD CONSTRAINT ck_profiles_dob_range
    CHECK (date_of_birth IS NULL OR (date_of_birth >= DATE '1900-01-01' AND date_of_birth <= CURRENT_DATE - INTERVAL '1 year')),
  ADD CONSTRAINT ck_profiles_blood_type
    CHECK (blood_type IS NULL OR blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  ADD CONSTRAINT ck_profiles_allergies_len
    CHECK (allergies IS NULL OR length(allergies) <= 1000),
  ADD CONSTRAINT ck_profiles_chronic_conditions_len
    CHECK (chronic_conditions IS NULL OR length(chronic_conditions) <= 1000),
  ADD CONSTRAINT ck_profiles_height_cm
    CHECK (height_cm IS NULL OR (height_cm >= 30 AND height_cm <= 300)),
  ADD CONSTRAINT ck_profiles_weight_kg
    CHECK (weight_kg IS NULL OR (weight_kg >= 1 AND weight_kg <= 500)),
  ADD CONSTRAINT ck_profiles_emergency_contact_name
    CHECK (emergency_contact_name IS NULL OR length(trim(emergency_contact_name)) >= 2),
  ADD CONSTRAINT ck_profiles_emergency_contact_phone
    CHECK (emergency_contact_phone IS NULL OR emergency_contact_phone ~ '^\+[1-9][0-9]{1,3}[0-9]{7,12}$'),
  ADD CONSTRAINT ck_profiles_avatar_url
    CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://');

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_blood_type ON public.profiles(blood_type) WHERE blood_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON public.profiles(date_of_birth) WHERE date_of_birth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON public.profiles(first_name, last_name)
  WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- 5) updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6) RLS + realtime identity
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
CREATE POLICY "Service role full access"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7) Auto-create / backfill profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_gender TEXT;
  v_phone TEXT;
  v_date_of_birth DATE;
BEGIN
  v_first_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name', '')), '');
  v_last_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name', '')), '');
  v_gender := NEW.raw_user_meta_data->>'gender';
  v_phone := NEW.raw_user_meta_data->>'phone';

  BEGIN
    v_date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_date_of_birth := NULL;
  END;

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    gender,
    phone,
    date_of_birth,
    avatar_url
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
    email = EXCLUDED.email,
    first_name = COALESCE(public.profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(public.profiles.last_name, EXCLUDED.last_name),
    gender = COALESCE(public.profiles.gender, EXCLUDED.gender),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    date_of_birth = COALESCE(public.profiles.date_of_birth, EXCLUDED.date_of_birth),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8) Grants
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- 9) Optional stats view
CREATE OR REPLACE VIEW public.profile_statistics
WITH (security_invoker = on) AS
SELECT
  COUNT(*) AS total_profiles,
  COUNT(*) FILTER (WHERE is_profile_complete = true) AS complete_profiles,
  COUNT(*) FILTER (WHERE blood_type IS NOT NULL) AS profiles_with_blood_type,
  COUNT(*) FILTER (WHERE emergency_contact_phone IS NOT NULL) AS profiles_with_emergency_contact,
  AVG(EXTRACT(YEAR FROM age(date_of_birth))) AS avg_age,
  COUNT(*) FILTER (WHERE gender = 'male') AS male_count,
  COUNT(*) FILTER (WHERE gender = 'female') AS female_count
FROM public.profiles
WHERE date_of_birth IS NOT NULL;

COMMENT ON TABLE public.profiles IS 'User profiles with medical information';
COMMENT ON COLUMN public.profiles.full_name IS 'Generated from first_name + last_name';
COMMENT ON COLUMN public.profiles.is_profile_complete IS 'True when main required fields are present';
COMMENT ON VIEW public.profile_statistics IS 'Aggregated profile statistics';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Profiles reconciliation migration completed successfully.';
END $$;