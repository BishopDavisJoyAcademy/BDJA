-- ============================================================
-- BDJA Platform — Bug Fix 003
-- Issue: handle_new_user trigger missing "admin" role mapping
--        Causes users created with role="admin" to get user_category="student"
--        Also fixes login route to use admin client for profile lookup
-- Date: 2026-08-11
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- Recreate the function with the admin role fix
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_raw_role TEXT;
  v_user_category TEXT;
BEGIN
  v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_user_category := CASE v_raw_role
    WHEN 'student' THEN 'student'
    WHEN 'parent' THEN 'parent'
    WHEN 'teacher' THEN 'staff'
    WHEN 'class_prefect' THEN 'staff'
    WHEN 'bursar' THEN 'staff'
    WHEN 'librarian' THEN 'staff'
    WHEN 'principal' THEN 'admin'
    WHEN 'super_admin' THEN 'admin'
    WHEN 'admin' THEN 'admin'        -- BUG FIX: was missing, defaulted to student
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

-- Ensure trigger is attached (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
