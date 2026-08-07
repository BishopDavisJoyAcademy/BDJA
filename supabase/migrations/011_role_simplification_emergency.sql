-- EMERGENCY: Fix profiles_role_check constraint if 011 failed mid-way
-- Run this in Supabase SQL Editor if you see "violates check constraint 'profiles_role_check'"

-- Step 1: Drop the old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_category_check;

-- Step 2: Fix any lingering legacy roles
UPDATE profiles SET role = 'staff', user_category = 'staff'
WHERE role IN ('teacher', 'class_prefect', 'bursar', 'librarian');

UPDATE profiles SET role = 'admin', user_category = 'admin'
WHERE role IN ('principal', 'super_admin');

UPDATE profiles SET role = 'staff', user_category = 'staff'
WHERE role NOT IN ('student', 'parent', 'staff', 'admin');

UPDATE profiles SET user_category = 'staff'
WHERE user_category IN ('teacher', 'class_prefect', 'bursar', 'librarian');

UPDATE profiles SET user_category = 'admin'
WHERE user_category IN ('principal', 'super_admin');

UPDATE profiles SET user_category = 'staff'
WHERE user_category NOT IN ('student', 'parent', 'staff', 'admin');

-- Step 3: Add the new constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('student', 'parent', 'staff', 'admin'));

ALTER TABLE profiles ADD CONSTRAINT profiles_user_category_check 
  CHECK (user_category IN ('student', 'parent', 'staff', 'admin'));
