-- Create the first super_admin user
-- Run this AFTER you have created the user via Supabase Auth (Sign Up in the app, or via Supabase Dashboard)
-- Then update this query with the actual UUID from auth.users

-- Step 1: Create user via Supabase Auth (use the app login or Supabase Dashboard)
-- Step 2: Get the user's UUID from auth.users table
-- Step 3: Run this INSERT with that UUID:

-- INSERT INTO profiles (id, email, full_name, role, password_changed, onboarding_completed, is_active)
-- VALUES ('PASTE-UUID-HERE', 'admin@bdja.ac.ke', 'Super Admin', 'super_admin', true, true, true);

-- Alternative: Use the API endpoint POST /api/admin/create-user with role: super_admin
