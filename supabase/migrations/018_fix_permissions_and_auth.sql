-- ============================================================
-- BDJA Platform v5.0 — Migration 018
-- Fixes: Auth trigger missing user_category, UNION ORDER BY bug,
--        user_permissions -> staff_permissions table reference
-- ============================================================

-- ============================================
-- 1. FIX: auto_create_profile trigger
-- Problem: Trigger inserted profiles WITHOUT user_category column.
-- Migration 010 made user_category NOT NULL, causing INSERT to fail
-- when Supabase Auth creates a new user. This cascaded to HTTP 500.
-- ============================================
CREATE OR REPLACE FUNCTION auto_create_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_user_category TEXT;
  v_full_name TEXT;
  v_campus_id UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_user_category := COALESCE(NEW.raw_user_meta_data->>'user_category', v_role, 'student');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  v_campus_id := NULLIF(NEW.raw_user_meta_data->>'campus_id', '');

  INSERT INTO profiles (
    id, email, full_name, role, user_category, campus_id,
    is_active, password_changed, onboarding_completed
  )
  VALUES (
    NEW.id, NEW.email, v_full_name, v_role, v_user_category, v_campus_id,
    true, false, false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS auto_create_profile_trigger ON auth.users;
CREATE TRIGGER auto_create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_profile();

-- ============================================
-- 2. FIX: get_user_permissions function
-- Problem: UNION ORDER BY referenced "permission_key" which is NOT
-- a result column name from the first SELECT. PostgreSQL requires
-- ORDER BY in UNION to reference ONLY result column names.
-- Fix: Explicitly alias columns in both SELECTs as permission_key,
--      permission_name, category.
-- ============================================
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_key TEXT, permission_name TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.key AS permission_key, p.name AS permission_name, p.category
  FROM staff_permissions sp
  JOIN permissions p ON sp.permission_id = p.id
  WHERE sp.profile_id = p_user_id
  UNION
  SELECT p.key AS permission_key, p.name AS permission_name, p.category
  FROM permissions p
  WHERE EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin')
  ORDER BY category, permission_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FIX: has_permission function
-- Problem: Function logic was correct but we ensure it uses
-- staff_permissions (not the non-existent user_permissions).
-- Also add explicit admin bypass for performance.
-- ============================================
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins always have all permissions
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin') THEN
    RETURN true;
  END IF;
  -- Check staff_permissions table
  RETURN EXISTS (
    SELECT 1
    FROM staff_permissions sp
    JOIN permissions p ON sp.permission_id = p.id
    WHERE sp.profile_id = p_user_id AND p.key = p_permission_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FIX: Backfill any profiles missing user_category
-- (Safety net for profiles created before this migration)
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

-- ============================================
-- 5. FIX: Ensure user_category constraint exists
-- ============================================
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS chk_user_category;
ALTER TABLE profiles
  ADD CONSTRAINT chk_user_category
  CHECK (user_category IN ('student', 'parent', 'staff', 'admin'));
