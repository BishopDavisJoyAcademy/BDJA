-- ============================================================
-- BDJA EMERGENCY FIX SQL
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes BOTH the auth trigger AND the permission UNION bug
-- ============================================================

-- ============================================
-- PART 1: FIX AUTH USER CREATION
-- Problem: Multiple conflicting triggers on auth.users
-- Solution: Drop ALL triggers, keep ONE bulletproof trigger
-- ============================================

-- Step 1: Drop ALL existing triggers on auth.users (nuclear option)
DROP TRIGGER IF EXISTS auto_create_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop old functions
DROP FUNCTION IF EXISTS auto_create_profile();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 3: Create ONE bulletproof trigger function
-- This has exception handling so auth user creation NEVER fails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, role, user_category,
    is_active, password_changed, onboarding_completed,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'user_category', COALESCE(NEW.raw_user_meta_data->>'role', 'student')),
    true,
    false,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but NEVER fail auth user creation
  RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Attach the ONE trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PART 2: FIX get_user_permissions UNION BUG
-- Problem: ORDER BY references column alias not in first SELECT
-- Solution: Wrap UNION in subquery, ORDER outside
-- ============================================

DROP FUNCTION IF EXISTS get_user_permissions(UUID);

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_key TEXT, permission_name TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT p.key, p.name, p.category
    FROM staff_permissions sp
    JOIN permissions p ON sp.permission_id = p.id
    WHERE sp.profile_id = p_user_id
    UNION
    SELECT p.key, p.name, p.category
    FROM permissions p
    WHERE EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin')
  ) AS combined
  ORDER BY combined.category, combined.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: FIX has_permission function
-- ============================================

DROP FUNCTION IF EXISTS has_permission(UUID, TEXT);

CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin') THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM staff_permissions sp
    JOIN permissions p ON sp.permission_id = p.id
    WHERE sp.profile_id = p_user_id AND p.key = p_permission_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: Safety - ensure all required columns exist
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_category') THEN
    ALTER TABLE public.profiles ADD COLUMN user_category TEXT DEFAULT 'student';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'temp_password_hash') THEN
    ALTER TABLE public.profiles ADD COLUMN temp_password_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'password_changed') THEN
    ALTER TABLE public.profiles ADD COLUMN password_changed BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_by') THEN
    ALTER TABLE public.profiles ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- ============================================
-- PART 5: Backfill any NULL user_category values
-- ============================================
UPDATE profiles
SET user_category = COALESCE(
  CASE role
    WHEN 'student' THEN 'student'
    WHEN 'parent' THEN 'parent'
    WHEN 'teacher' THEN 'staff'
    WHEN 'bursar' THEN 'staff'
    WHEN 'librarian' THEN 'staff'
    WHEN 'class_prefect' THEN 'staff'
    WHEN 'principal' THEN 'admin'
    WHEN 'super_admin' THEN 'admin'
    ELSE 'student'
  END,
  'student'
)
WHERE user_category IS NULL;

-- Ensure constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_user_category;
ALTER TABLE profiles ADD CONSTRAINT chk_user_category
  CHECK (user_category IN ('student', 'parent', 'staff', 'admin'));

-- ============================================
-- VERIFICATION QUERIES (run these to confirm)
-- ============================================
-- Check triggers on auth.users:
-- SELECT tgname, proname FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid WHERE tgrelid = 'auth.users'::regclass;
-- Should show ONLY: on_auth_user_created -> handle_new_user

-- Check get_user_permissions:
-- SELECT get_user_permissions('YOUR-ADMIN-USER-ID-HERE');
-- Should return permissions without error
