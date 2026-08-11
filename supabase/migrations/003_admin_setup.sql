-- ============================================================
-- BDJA Platform — Admin User Setup
-- Run this AFTER creating the auth user in Supabase Dashboard
-- or after the user signs up via the app
-- ============================================================

-- IMPORTANT: Replace the UUID below with the actual UUID from auth.users
-- You can get it by running: SELECT id, email FROM auth.users;

-- ============================================
-- STEP 1: Ensure admin user metadata is correct
-- ============================================

UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'full_name', 'Bishop Davis Joy Academy',
  'role', 'admin',
  'user_category', 'admin'
)
WHERE email = 'bishopdavisjoyacademy@gmail.com';

-- ============================================
-- STEP 2: Ensure profile exists and is correct
-- ============================================

INSERT INTO profiles (
  id, email, full_name, role, user_category,
  is_active, password_changed, onboarding_completed,
  created_at, updated_at
)
VALUES (
  'ced464c1-a700-4808-9f49-da62942e2e50',
  'bishopdavisjoyacademy@gmail.com',
  'Bishop Davis Joy Academy',
  'admin',
  'admin',
  true,
  false,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  user_category = EXCLUDED.user_category,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- STEP 3: Grant ALL permissions to admin
-- ============================================

INSERT INTO staff_permissions (profile_id, permission_id, granted_by)
SELECT
  'ced464c1-a700-4808-9f49-da62942e2e50',
  id,
  'ced464c1-a700-4808-9f49-da62942e2e50'
FROM permissions
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- ============================================
-- STEP 4: Verify
-- ============================================

SELECT 'Profile' as check_item, COUNT(*) as count FROM profiles WHERE id = 'ced464c1-a700-4808-9f49-da62942e2e50'
UNION ALL
SELECT 'Permissions', COUNT(*) FROM staff_permissions WHERE profile_id = 'ced464c1-a700-4808-9f49-da62942e2e50';
