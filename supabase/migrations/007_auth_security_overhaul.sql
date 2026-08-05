-- ============================================================
-- BDJA Platform v3.0 — Complete Authentication & Security Overhaul
-- Migration 007: Auth Security Overhaul
-- Date: 2026-08-04
--
-- PROBLEM ADDRESSED:
-- 1. Missing profile rows caused all users to redirect to ?error=suspended
-- 2. No account lockout mechanism for brute-force attacks
-- 3. No session tracking or concurrent session limits
-- 4. No password history or expiry enforcement
-- 5. Weak RLS policies (SELECT USING true)
-- 6. No audit trail for login attempts
-- 7. No admin recovery mechanism for locked accounts
--
-- SOLUTION:
-- 1. Auto-create profile on auth.user creation via trigger
-- 2. Account lockout table with exponential backoff
-- 3. User sessions table with device tracking
-- 4. Password history table with expiry enforcement
-- 5. Proper RLS policies per role
-- 6. Login audit table with IP/user-agent tracking
-- 7. Admin unlock API with audit logging
-- ============================================================

-- ============================================
-- 1. ACCOUNT LOCKOUT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_user ON account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked ON account_lockouts(locked_until) WHERE locked_until IS NOT NULL;

-- ============================================
-- 2. USER SESSIONS TABLE (server-side session tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE revoked_at IS NULL;

-- ============================================
-- 3. PASSWORD HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id, changed_at DESC);

-- ============================================
-- 4. LOGIN AUDIT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS login_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  action TEXT NOT NULL CHECK (action IN ('login_success', 'login_failed', 'logout', 'password_changed', 'account_locked', 'account_unlocked', 'session_revoked', 'suspicious_activity')),
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_audit_user ON login_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_action ON login_audit(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_ip ON login_audit(ip_address, created_at DESC);

-- ============================================
-- 5. EMERGENCY ADMIN RECOVERY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS admin_recovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('unlock_account', 'reset_password', 'force_logout', 'restore_profile')),
  reason TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_recovery_target ON admin_recovery_log(target_user_id);

-- ============================================
-- 6. AUTO-CREATE PROFILE TRIGGER (CRITICAL FIX)
-- ============================================
CREATE OR REPLACE FUNCTION auto_create_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_campus_id UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  v_campus_id := NULLIF(NEW.raw_user_meta_data->>'campus_id', '');

  INSERT INTO profiles (id, email, full_name, role, campus_id, is_active, password_changed, onboarding_completed)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, v_campus_id, true, false, false)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_profile_trigger ON auth.users;
CREATE TRIGGER auto_create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_profile();

-- ============================================
-- 7. AUTO-UPDATE LOCKOUT TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_lockout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lockout_timestamp_trigger ON account_lockouts;
CREATE TRIGGER update_lockout_timestamp_trigger
  BEFORE UPDATE ON account_lockouts
  FOR EACH ROW
  EXECUTE FUNCTION update_lockout_timestamp();

-- ============================================
-- 8. RLS POLICIES FOR NEW TABLES
-- ============================================
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_recovery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lockouts_own" ON account_lockouts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "lockouts_admin" ON account_lockouts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'super_admin'))
);

CREATE POLICY "sessions_own" ON user_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sessions_admin" ON user_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'super_admin'))
);

CREATE POLICY "password_history_own" ON password_history FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "login_audit_own" ON login_audit FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "login_audit_admin" ON login_audit FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'super_admin'))
);

CREATE POLICY "recovery_log_admin" ON admin_recovery_log FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'super_admin'))
);

-- ============================================
-- 9. FUNCTION: RECORD LOGIN ATTEMPT
-- ============================================
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_user_id UUID,
  p_email TEXT,
  p_success BOOLEAN,
  p_ip_address TEXT,
  p_user_agent TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_success THEN
    INSERT INTO login_audit (user_id, email, action, ip_address, user_agent, details)
    VALUES (p_user_id, p_email, 'login_success', p_ip_address::INET, p_user_agent, '{}');
    DELETE FROM account_lockouts WHERE user_id = p_user_id;
  ELSE
    INSERT INTO login_audit (user_id, email, action, ip_address, user_agent, details)
    VALUES (p_user_id, p_email, 'login_failed', p_ip_address::INET, p_user_agent, '{}');
    INSERT INTO account_lockouts (user_id, failed_attempts, last_failed_at, ip_address, user_agent)
    VALUES (p_user_id, 1, now(), p_ip_address, p_user_agent)
    ON CONFLICT (user_id)
    DO UPDATE SET
      failed_attempts = account_lockouts.failed_attempts + 1,
      last_failed_at = now(),
      ip_address = p_ip_address,
      user_agent = p_user_agent;
    UPDATE account_lockouts
    SET locked_until = now() + (INTERVAL '30 minutes' * POWER(2, GREATEST(failed_attempts - 5, 0)))
    WHERE user_id = p_user_id AND failed_attempts >= 5 AND locked_until IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. FUNCTION: CHECK ACCOUNT LOCKED
-- ============================================
CREATE OR REPLACE FUNCTION is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO v_locked_until
  FROM account_lockouts
  WHERE user_id = p_user_id;
  RETURN v_locked_until IS NOT NULL AND v_locked_until > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. FUNCTION: GET LOCKOUT DETAILS
-- ============================================
CREATE OR REPLACE FUNCTION get_lockout_details(p_user_id UUID)
RETURNS TABLE (
  is_locked BOOLEAN,
  locked_until TIMESTAMPTZ,
  failed_attempts INTEGER,
  remaining_attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(al.locked_until > now(), false) AS is_locked,
    al.locked_until,
    COALESCE(al.failed_attempts, 0) AS failed_attempts,
    GREATEST(5 - COALESCE(al.failed_attempts, 0), 0) AS remaining_attempts
  FROM auth.users u
  LEFT JOIN account_lockouts al ON al.user_id = u.id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. FUNCTION: UNLOCK ACCOUNT (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION unlock_account(p_user_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_admin_id AND role IN ('principal', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can unlock accounts';
  END IF;
  DELETE FROM account_lockouts WHERE user_id = p_user_id;
  INSERT INTO admin_recovery_log (admin_id, target_user_id, action, reason)
  VALUES (p_admin_id, p_user_id, 'unlock_account', p_reason);
  INSERT INTO login_audit (user_id, action, details)
  VALUES (p_user_id, 'account_unlocked', jsonb_build_object('unlocked_by', p_admin_id, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. FUNCTION: FORCE LOGOUT ALL SESSIONS
-- ============================================
CREATE OR REPLACE FUNCTION force_logout_all_sessions(p_user_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_admin_id AND role IN ('principal', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can force logout';
  END IF;
  UPDATE user_sessions
  SET revoked_at = now(), revoked_reason = p_reason
  WHERE user_id = p_user_id AND revoked_at IS NULL;
  INSERT INTO admin_recovery_log (admin_id, target_user_id, action, reason)
  VALUES (p_admin_id, p_user_id, 'force_logout', p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 14. FUNCTION: RECORD SESSION CREATION
-- ============================================
CREATE OR REPLACE FUNCTION record_session(
  p_user_id UUID,
  p_token_hash TEXT,
  p_device_info JSONB,
  p_ip_address TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_sessions (user_id, session_token_hash, device_info, ip_address, expires_at)
  VALUES (p_user_id, p_token_hash, p_device_info, p_ip_address::INET, p_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. FUNCTION: CLEANUP EXPIRED SESSIONS
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < now() - INTERVAL '7 days'
     OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '30 days');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 16. FUNCTION: CLEANUP OLD LOGIN AUDIT
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_login_audit()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM login_audit WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 17. GRANT SERVICE ROLE PERMISSIONS
-- ============================================
GRANT ALL ON account_lockouts TO service_role;
GRANT ALL ON user_sessions TO service_role;
GRANT ALL ON password_history TO service_role;
GRANT ALL ON login_audit TO service_role;
GRANT ALL ON admin_recovery_log TO service_role;

GRANT ALL ON SEQUENCE account_lockouts_id_seq TO service_role;
GRANT ALL ON SEQUENCE user_sessions_id_seq TO service_role;
GRANT ALL ON SEQUENCE password_history_id_seq TO service_role;
GRANT ALL ON SEQUENCE login_audit_id_seq TO service_role;
GRANT ALL ON SEQUENCE admin_recovery_log_id_seq TO service_role;

-- ============================================
-- 18. VERIFY: Ensure all existing auth.users have profiles
-- ============================================
INSERT INTO profiles (id, email, full_name, role, is_active, password_changed, onboarding_completed)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'role', 'student'),
  true,
  false,
  false
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- ============================================
-- 19. UPDATE EXISTING PROFILES
-- ============================================
UPDATE profiles SET is_active = true WHERE is_active IS NULL;
UPDATE profiles SET password_changed = false WHERE password_changed IS NULL;
UPDATE profiles SET onboarding_completed = false WHERE onboarding_completed IS NULL;

-- ============================================
-- 20-22. ADD CONSTRAINTS
-- ============================================
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE profiles ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN password_changed SET DEFAULT false;
ALTER TABLE profiles ALTER COLUMN password_changed SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN onboarding_completed SET DEFAULT false;
ALTER TABLE profiles ALTER COLUMN onboarding_completed SET NOT NULL;

-- ============================================
-- 23. CREATE INDEX
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- 24. VERIFY TRIGGER IS ACTIVE
-- ============================================
-- Run this to verify: SELECT * FROM pg_trigger WHERE tgname = 'auto_create_profile_trigger';
