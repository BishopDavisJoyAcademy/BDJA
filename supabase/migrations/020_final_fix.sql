-- ============================================================
-- BDJA Migration 020: DEFINITIVE FIX
-- 
-- Problems this solves:
-- 1. Auth user creation fails (trigger conflict / CHECK violation)
-- 2. get_user_permissions UNION ORDER BY error
-- 3. has_permission using wrong table reference
--
-- Run this ENTIRE script in Supabase SQL Editor.
-- It uses DROP + CREATE (not REPLACE) to guarantee old code is gone.
-- ============================================================

-- ============================================
-- STEP 1: NUKE all triggers on auth.users
-- ============================================
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname NOT LIKE 'ri_%'  -- skip referential integrity triggers
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', t.tgname);
  END LOOP;
END $$;

-- ============================================
-- STEP 2: NUKE all functions that touch auth.users triggers
-- ============================================
DROP FUNCTION IF EXISTS auto_create_profile() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================
-- STEP 3: Create ONE bulletproof trigger function
-- 
-- CRITICAL: Maps 'teacher' -> 'staff' for user_category CHECK constraint.
-- The CHECK is: user_category IN ('student','parent','staff','admin')
-- Raw metadata role can be 'teacher', 'principal', etc.
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_raw_role TEXT;
  v_user_category TEXT;
BEGIN
  v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- Map old role names to new user_category values
  v_user_category := CASE v_raw_role
    WHEN 'student' THEN 'student'
    WHEN 'parent'  THEN 'parent'
    WHEN 'teacher' THEN 'staff'
    WHEN 'class_prefect' THEN 'staff'
    WHEN 'bursar'  THEN 'staff'
    WHEN 'librarian' THEN 'staff'
    WHEN 'principal' THEN 'admin'
    WHEN 'super_admin' THEN 'admin'
    ELSE 'student'
  END;

  INSERT INTO public.profiles (
    id, email, full_name, role, user_category,
    is_active, password_changed, onboarding_completed,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_raw_role,
    v_user_category,
    true,
    false,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 4: Fix get_user_permissions — NO UNION, two RETURN QUERY blocks
-- ============================================
DROP FUNCTION IF EXISTS get_user_permissions(UUID);

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_key TEXT) AS $$
BEGIN
  -- Admins get every permission key
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin') THEN
    RETURN QUERY SELECT p.key FROM permissions p ORDER BY p.category, p.key;
    RETURN;
  END IF;

  -- Non-admins get only assigned permissions
  RETURN QUERY
    SELECT perm.key
    FROM staff_permissions sp
    JOIN permissions perm ON perm.id = sp.permission_id
    WHERE sp.profile_id = p_user_id
    ORDER BY perm.category, perm.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Fix has_permission — clean rebuild
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
    JOIN permissions p ON p.id = sp.permission_id
    WHERE sp.profile_id = p_user_id AND p.key = p_permission_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Ensure staff table exists (code references it but schema didn't create it)
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  department TEXT DEFAULT 'General',
  designation TEXT DEFAULT 'Staff',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave','terminated')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_all" ON staff;
CREATE POLICY "staff_select_all" ON staff FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_admin_all" ON staff;
CREATE POLICY "staff_admin_all" ON staff FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_staff_updated_at'
  ) THEN
    CREATE TRIGGER update_staff_updated_at
      BEFORE UPDATE ON staff
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================
-- STEP 7: Safety columns + backfill
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_category') THEN
    ALTER TABLE public.profiles ADD COLUMN user_category TEXT DEFAULT 'student';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='temp_password_hash') THEN
    ALTER TABLE public.profiles ADD COLUMN temp_password_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='created_by') THEN
    ALTER TABLE public.profiles ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

UPDATE profiles
SET user_category = COALESCE(CASE role
  WHEN 'student' THEN 'student' WHEN 'parent' THEN 'parent'
  WHEN 'teacher' THEN 'staff' WHEN 'bursar' THEN 'staff'
  WHEN 'librarian' THEN 'staff' WHEN 'class_prefect' THEN 'staff'
  WHEN 'principal' THEN 'admin' WHEN 'super_admin' THEN 'admin'
  ELSE 'student' END, 'student')
WHERE user_category IS NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_user_category;
ALTER TABLE profiles ADD CONSTRAINT chk_user_category
  CHECK (user_category IN ('student', 'parent', 'staff', 'admin'));

-- ============================================
-- VERIFICATION (uncomment to run)
-- ============================================
-- SELECT tgname, proname
-- FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid
-- WHERE tgrelid = 'auth.users'::regclass;
-- Should show ONLY: on_auth_user_created -> handle_new_user
