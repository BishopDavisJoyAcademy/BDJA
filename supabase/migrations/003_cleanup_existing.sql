-- Cleanup migration for databases that already ran old migrations
-- Run this AFTER 001 and 002 if you have existing data, OR run this first if you want to fix an existing DB

-- ============================================
-- STEP 1: Drop conflicting triggers
-- ============================================
DROP TRIGGER IF EXISTS auto_create_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auto_create_profile();
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================
-- STEP 2: Fix profiles table - ensure user_category has default
-- ============================================
ALTER TABLE profiles ALTER COLUMN user_category SET DEFAULT 'student';
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'student';

-- Ensure existing NULL values are fixed
UPDATE profiles SET user_category = COALESCE(user_category, 'student') WHERE user_category IS NULL;
UPDATE profiles SET role = COALESCE(role, 'student') WHERE role IS NULL;

-- ============================================
-- STEP 3: Create the correct single trigger
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, user_category, is_active, password_changed, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'user_category', COALESCE(NEW.raw_user_meta_data->>'role', 'student')),
    true,
    false,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    user_category = EXCLUDED.user_category,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 4: Fix get_user_permissions function
-- ============================================
DROP FUNCTION IF EXISTS get_user_permissions(UUID);
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_key VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT p.key::VARCHAR
  FROM staff_permissions sp
  JOIN permissions p ON sp.permission_id = p.id
  WHERE sp.profile_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Fix has_permission function
-- ============================================
DROP FUNCTION IF EXISTS has_permission(UUID, VARCHAR);
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_permissions sp
    JOIN permissions p ON sp.permission_id = p.id
    WHERE sp.profile_id = p_user_id AND p.key = p_permission_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Ensure staff table exists
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  department VARCHAR(50) DEFAULT 'General',
  designation VARCHAR(50) DEFAULT 'Staff',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 7: Ensure all required tables exist
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token_hash VARCHAR(64) NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  failed_attempts INTEGER DEFAULT 0,
  locked_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  unlocked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  unlock_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 8: Enable RLS on all tables
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vora_content ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 9: Create/update RLS policies
-- ============================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_staff" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_staff" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_staff" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_staff" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));

DROP POLICY IF EXISTS "staff_select_all" ON staff;
DROP POLICY IF EXISTS "staff_manage" ON staff;
CREATE POLICY "staff_select_all" ON staff FOR SELECT USING (true);
CREATE POLICY "staff_manage" ON staff FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));

DROP POLICY IF EXISTS "students_select_all" ON students;
DROP POLICY IF EXISTS "students_manage" ON students;
CREATE POLICY "students_select_all" ON students FOR SELECT USING (true);
CREATE POLICY "students_manage" ON students FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'students.manage'));

DROP POLICY IF EXISTS "staff_perms_select_own" ON staff_permissions;
DROP POLICY IF EXISTS "staff_perms_manage" ON staff_permissions;
CREATE POLICY "staff_perms_select_own" ON staff_permissions FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "staff_perms_manage" ON staff_permissions FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));

DROP POLICY IF EXISTS "sessions_own" ON user_sessions;
CREATE POLICY "sessions_own" ON user_sessions FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "audit_admin" ON audit_logs;
CREATE POLICY "audit_admin" ON audit_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "login_attempts_admin" ON login_attempts;
CREATE POLICY "login_attempts_admin" ON login_attempts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "lockouts_admin" ON account_lockouts;
CREATE POLICY "lockouts_admin" ON account_lockouts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- ============================================
-- STEP 10: Create security functions if missing
-- ============================================
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_user_id UUID,
  p_email VARCHAR,
  p_success BOOLEAN,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS VOID AS $$
DECLARE
  v_lockout RECORD;
BEGIN
  INSERT INTO login_attempts (user_id, email, ip_address, user_agent, success)
  VALUES (p_user_id, p_email, p_ip_address, p_user_agent, p_success);

  IF NOT p_success AND p_user_id IS NOT NULL THEN
    INSERT INTO account_lockouts (user_id, failed_attempts)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      failed_attempts = account_lockouts.failed_attempts + 1,
      updated_at = NOW();

    SELECT * INTO v_lockout FROM account_lockouts WHERE user_id = p_user_id;
    IF v_lockout.failed_attempts >= 5 THEN
      UPDATE account_lockouts SET
        locked_at = NOW(),
        locked_until = NOW() + INTERVAL '30 minutes',
        updated_at = NOW()
      WHERE user_id = p_user_id;
    END IF;
  END IF;

  IF p_success AND p_user_id IS NOT NULL THEN
    UPDATE account_lockouts SET
      failed_attempts = 0,
      locked_at = NULL,
      locked_until = NULL,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_lockout_details(p_user_id UUID)
RETURNS TABLE(is_locked BOOLEAN, locked_until TIMESTAMPTZ, failed_attempts INTEGER, remaining_attempts INTEGER) AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record FROM account_lockouts WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::TIMESTAMPTZ, 0::INTEGER, 5::INTEGER;
    RETURN;
  END IF;

  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > NOW() THEN
    RETURN QUERY SELECT true::BOOLEAN, v_record.locked_until, v_record.failed_attempts, 0::INTEGER;
  ELSE
    RETURN QUERY SELECT false::BOOLEAN, NULL::TIMESTAMPTZ, v_record.failed_attempts, GREATEST(0, 5 - v_record.failed_attempts)::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unlock_account(p_user_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE account_lockouts SET
    failed_attempts = 0,
    locked_at = NULL,
    locked_until = NULL,
    unlocked_by = p_admin_id,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO audit_logs (user_id, action, target_type, target_id, metadata)
  VALUES (p_admin_id, 'ACCOUNT_UNLOCKED', 'user', p_user_id::TEXT, jsonb_build_object('reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_session(
  p_user_id UUID,
  p_token_hash VARCHAR,
  p_device_info JSONB,
  p_ip_address INET,
  p_expires_at TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_sessions (user_id, session_token_hash, device_info, ip_address, expires_at)
  VALUES (p_user_id, p_token_hash, p_device_info, p_ip_address, p_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION force_logout_all_sessions(p_user_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions SET revoked_at = NOW(), is_active = false WHERE user_id = p_user_id AND revoked_at IS NULL;
  INSERT INTO audit_logs (user_id, action, target_type, target_id, metadata)
  VALUES (p_admin_id, 'FORCE_LOGOUT_ALL', 'user', p_user_id::TEXT, jsonb_build_object('reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
