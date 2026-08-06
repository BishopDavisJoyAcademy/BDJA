-- ============================================================
-- BDJA Platform v4.0 — Schema Cleanup
-- Migration 010: Add user_category, Update RLS
-- ============================================================

-- ============================================
-- 1. ADD user_category COLUMN
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_category TEXT;

-- Backfill user_category from role
UPDATE profiles SET user_category = 'student' WHERE role = 'student';
UPDATE profiles SET user_category = 'parent' WHERE role = 'parent';
UPDATE profiles SET user_category = 'staff' WHERE role IN ('teacher', 'bursar', 'librarian', 'class_prefect');
UPDATE profiles SET user_category = 'admin' WHERE role IN ('principal', 'super_admin');

-- Set default and NOT NULL
ALTER TABLE profiles ALTER COLUMN user_category SET DEFAULT 'student';
UPDATE profiles SET user_category = 'student' WHERE user_category IS NULL;
ALTER TABLE profiles ALTER COLUMN user_category SET NOT NULL;

-- Add check constraint
ALTER TABLE profiles ADD CONSTRAINT chk_user_category 
  CHECK (user_category IN ('student', 'parent', 'staff', 'admin'));

-- ============================================
-- 2. UPDATE PROFILES RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);
CREATE POLICY "profiles_select_staff" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM staff_permissions sp 
    JOIN permissions perm ON sp.permission_id = perm.id 
    WHERE sp.profile_id = auth.uid() AND perm.key = 'students.view')
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);

-- ============================================
-- 3. UPDATE AUDIT LOGS RLS
-- ============================================
DROP POLICY IF EXISTS "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_admin" ON audit_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);

-- ============================================
-- 4. UPDATE LOGIN AUDIT RLS
-- ============================================
DROP POLICY IF EXISTS "login_audit_admin" ON login_audit;
CREATE POLICY "login_audit_admin" ON login_audit FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);

-- ============================================
-- 5. UPDATE ACCOUNT LOCKOUTS RLS
-- ============================================
DROP POLICY IF EXISTS "lockouts_admin" ON account_lockouts;
CREATE POLICY "lockouts_admin" ON account_lockouts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);

-- ============================================
-- 6. UPDATE USER SESSIONS RLS
-- ============================================
DROP POLICY IF EXISTS "sessions_admin" ON user_sessions;
CREATE POLICY "sessions_admin" ON user_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);

-- ============================================
-- 7. UPDATE ADMIN RECOVERY LOG RLS
-- ============================================
DROP POLICY IF EXISTS "recovery_log_admin" ON admin_recovery_log;
CREATE POLICY "recovery_log_admin" ON admin_recovery_log FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);

-- ============================================
-- 8. CREATE FUNCTION: CHECK PERMISSION
-- ============================================
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins always have all permissions
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin') THEN
    RETURN true;
  END IF;
  -- Check staff_permissions
  RETURN EXISTS (
    SELECT 1 FROM staff_permissions sp
    JOIN permissions p ON sp.permission_id = p.id
    WHERE sp.profile_id = p_user_id AND p.key = p_permission_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. CREATE FUNCTION: GET USER PERMISSIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_key TEXT, permission_name TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.key, p.name, p.category
  FROM staff_permissions sp
  JOIN permissions p ON sp.permission_id = p.id
  WHERE sp.profile_id = p_user_id
  UNION
  SELECT p.key, p.name, p.category
  FROM permissions p
  WHERE EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin')
  ORDER BY category, permission_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
