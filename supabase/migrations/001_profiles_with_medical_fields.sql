-- ============================================================
-- Supabase Migration: Medical Platform - User Profiles
-- Version: 1.0
-- Date: 2026-02-07
-- Description: Complete user profile schema with medical information,
--              emergency contacts, and insurance details
-- ============================================================

-- Begin transaction for atomic execution
BEGIN;

-- 1. Create the profiles table with comprehensive medical data
CREATE TABLE IF NOT EXISTS public.profiles (
  -- Primary identification
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  
  -- Personal information
  first_name VARCHAR(50) NOT NULL CHECK (length(trim(first_name)) >= 2),
  last_name VARCHAR(50) NOT NULL CHECK (length(trim(last_name)) >= 2),
  full_name VARCHAR(100) GENERATED ALWAYS AS (trim(first_name || ' ' || last_name)) STORED,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  phone VARCHAR(20) CHECK (phone ~ '^\+[1-9][0-9]{1,3}[0-9]{7,12}$'), -- International format validation
  date_of_birth DATE CHECK (
    date_of_birth >= '1900-01-01' 
    AND date_of_birth <= CURRENT_DATE - INTERVAL '1 year'
  ),
  
  -- Medical information
  blood_type VARCHAR(3) CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  allergies TEXT CHECK (length(allergies) <= 1000),
  chronic_conditions TEXT CHECK (length(chronic_conditions) <= 1000),
  height_cm NUMERIC(5, 1) CHECK (height_cm >= 30 AND height_cm <= 300),
  weight_kg NUMERIC(5, 1) CHECK (weight_kg >= 1 AND weight_kg <= 500),
  medical_notes TEXT CHECK (length(medical_notes) <= 5000),
  
  -- Emergency contact
  emergency_contact_name VARCHAR(100) CHECK (length(trim(emergency_contact_name)) >= 2),
  emergency_contact_phone VARCHAR(20) CHECK (emergency_contact_phone ~ '^\+[1-9][0-9]{1,3}[0-9]{7,12}$'),
  
  -- Insurance information
  insurance_provider VARCHAR(100),
  insurance_policy_number VARCHAR(50),
  
  -- Profile metadata
  avatar_url TEXT CHECK (avatar_url ~ '^https?://'),
  is_profile_complete BOOLEAN GENERATED ALWAYS AS (
    first_name IS NOT NULL 
    AND last_name IS NOT NULL 
    AND date_of_birth IS NOT NULL
    AND gender IS NOT NULL
  ) STORED,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_blood_type ON public.profiles(blood_type) WHERE blood_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON public.profiles(date_of_birth) WHERE date_of_birth IS NOT NULL;

-- Composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON public.profiles(first_name, last_name) 
  WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

COMMENT ON TABLE public.profiles IS 'User profiles with complete medical information for healthcare platform';
COMMENT ON COLUMN public.profiles.id IS 'UUID from auth.users, primary key';
COMMENT ON COLUMN public.profiles.email IS 'User email address (unique)';
COMMENT ON COLUMN public.profiles.phone IS 'International phone format: +[country code][number]';
COMMENT ON COLUMN public.profiles.blood_type IS 'ABO blood type with Rh factor';
COMMENT ON COLUMN public.profiles.height_cm IS 'Height in centimeters (30-300 cm range)';
COMMENT ON COLUMN public.profiles.weight_kg IS 'Weight in kilograms (1-500 kg range)';
COMMENT ON COLUMN public.profiles.is_profile_complete IS 'Auto-calculated: true if all required fields are filled';

-- 3. Auto-update updated_at timestamp trigger
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user privacy and data access control
-- Policy 1: Users can view only their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can update only their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can insert their own profile (for manual creation)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 4: Service role has full access (for backend API)
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
CREATE POLICY "Service role full access"
  ON public.profiles
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- 6. Auto-create profile on user registration (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_gender TEXT;
  v_phone TEXT;
  v_date_of_birth DATE;
BEGIN
  -- Extract and validate user metadata
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_gender := NEW.raw_user_meta_data->>'gender';
  v_phone := NEW.raw_user_meta_data->>'phone';
  
  -- Safe date conversion with error handling
  BEGIN
    v_date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_date_of_birth := NULL;
  END;

  -- Insert profile with validated data
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    gender, 
    phone, 
    date_of_birth
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(trim(v_first_name), ''),
    NULLIF(trim(v_last_name), ''),
    v_gender,
    v_phone,
    v_date_of_birth
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate profile creation

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Grant necessary permissions
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- 8. Create view for profile statistics (optional - for admin dashboard)
CREATE OR REPLACE VIEW public.profile_statistics
WITH (security_invoker=on) AS
SELECT
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE is_profile_complete = true) as complete_profiles,
  COUNT(*) FILTER (WHERE blood_type IS NOT NULL) as profiles_with_blood_type,
  COUNT(*) FILTER (WHERE emergency_contact_phone IS NOT NULL) as profiles_with_emergency_contact,
  COUNT(*) FILTER (WHERE insurance_provider IS NOT NULL) as profiles_with_insurance,
  AVG(EXTRACT(YEAR FROM age(date_of_birth))) as avg_age,
  COUNT(*) FILTER (WHERE gender = 'male') as male_count,
  COUNT(*) FILTER (WHERE gender = 'female') as female_count
FROM public.profiles
WHERE date_of_birth IS NOT NULL;

COMMENT ON VIEW public.profile_statistics IS 'Aggregated statistics for profile data (admin/service_role only - uses invoker permissions)';

-- Commit transaction
COMMIT;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration completed successfully! Profile table is ready with all medical fields.';
END $$;
