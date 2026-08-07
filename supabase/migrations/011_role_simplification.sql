-- BDJA Migration 011: Role Simplification (Ghost Removal) — FIXED
-- Collapses 8 hardcoded roles into 4: student, parent, staff, admin
-- IDEMPOTENT - safe to run multiple times

-- ============================================
-- 1. DROP old constraints FIRST so updates don't fail
-- ============================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_category_check;

-- ============================================
-- 2. Migrate old roles to new simplified roles
-- ============================================
UPDATE profiles SET 
  role = 'staff',
  user_category = 'staff'
WHERE role IN ('teacher', 'class_prefect', 'bursar', 'librarian');

UPDATE profiles SET 
  role = 'admin',
  user_category = 'admin'
WHERE role IN ('principal', 'super_admin');

-- Fallback: any remaining non-standard roles become staff
UPDATE profiles SET 
  role = 'staff',
  user_category = 'staff'
WHERE role NOT IN ('student', 'parent', 'staff', 'admin');

-- ============================================
-- 3. ADD new constraints AFTER all updates are done
-- ============================================
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('student', 'parent', 'staff', 'admin'));

ALTER TABLE profiles ADD CONSTRAINT profiles_user_category_check 
  CHECK (user_category IN ('student', 'parent', 'staff', 'admin'));

-- ============================================
-- 4. Update RLS policies for simplified roles
-- ============================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins have full access" ON profiles;
DROP POLICY IF EXISTS "Staff can view student and parent profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins have full access" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.user_category = 'admin'
    )
  );

CREATE POLICY "Staff can view student and parent profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.user_category = 'staff'
    ) AND user_category IN ('student', 'parent')
  );

-- ============================================
-- 5. Grant all permissions to existing admins
-- ============================================
INSERT INTO staff_permissions (profile_id, permission_id, granted_by)
SELECT 
  p.id,
  perm.id,
  p.id
FROM profiles p
CROSS JOIN permissions perm
WHERE p.user_category = 'admin'
ON CONFLICT (profile_id, permission_id) DO NOTHING;
