-- Initial clean schema for BDJA Platform
-- No conflicting triggers, proper defaults, clean RLS

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Campuses
CREATE TABLE IF NOT EXISTS campuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  phone VARCHAR(20),
  email VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'parent', 'staff', 'admin')),
  user_category VARCHAR(20) DEFAULT 'student' CHECK (user_category IN ('student', 'parent', 'staff', 'admin')),
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  password_changed BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  temp_password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  department VARCHAR(50) DEFAULT 'General',
  designation VARCHAR(50) DEFAULT 'Staff',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  admission_number VARCHAR(50) NOT NULL UNIQUE,
  grade_level VARCHAR(20) NOT NULL,
  class_id UUID,
  enrollment_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent-Student links
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship VARCHAR(50) DEFAULT 'parent',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- Permission categories
CREATE TABLE IF NOT EXISTS permission_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff permissions
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, permission_id)
);

-- User sessions (server-side tracking)
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

-- Password history
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  impersonated_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Login attempts (for rate limiting and security)
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account lockouts
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

-- Suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('idea', 'feedback', 'bug', 'improvement', 'complaint')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'planned', 'implemented', 'declined', 'closed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  admin_response TEXT,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CMS Pages
CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  published BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  event_type VARCHAR(50) NOT NULL,
  target_audience VARCHAR(50) DEFAULT 'all',
  target_grade VARCHAR(20),
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timetable
CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(50),
  topic VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessments
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  strand VARCHAR(100) NOT NULL,
  sub_strand VARCHAR(100) NOT NULL,
  specific_learning_outcome TEXT,
  performance_level VARCHAR(20) NOT NULL CHECK (performance_level IN ('beginning', 'developing', 'competent', 'exceeds')),
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  term VARCHAR(20) NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  max_score NUMERIC(5,2),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee payments
CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  balance NUMERIC(10,2) DEFAULT 0,
  term VARCHAR(20) NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  payment_date DATE,
  payment_method VARCHAR(50),
  receipt_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Library books
CREATE TABLE IF NOT EXISTS library_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  author VARCHAR(100),
  isbn VARCHAR(20),
  category VARCHAR(50),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'lost', 'damaged')),
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admissions
CREATE TABLE IF NOT EXISTS admissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_name VARCHAR(100) NOT NULL,
  parent_name VARCHAR(100),
  parent_email VARCHAR(255),
  parent_phone VARCHAR(20),
  grade_level VARCHAR(20) NOT NULL,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'waitlisted')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject VARCHAR(200),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vora content
CREATE TABLE IF NOT EXISTS vora_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  summary TEXT,
  subject VARCHAR(50),
  grade_level VARCHAR(20),
  category VARCHAR(50),
  topic VARCHAR(100),
  tags TEXT[],
  channel VARCHAR(100),
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  youtube_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS
-- ============================================

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

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
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

-- Profiles: users can read their own, staff can read all
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_staff" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_staff" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));

-- Staff: staff can read all
CREATE POLICY "staff_select_all" ON staff FOR SELECT USING (true);
CREATE POLICY "staff_manage" ON staff FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));

-- Students: staff can read all, parents can read their children
CREATE POLICY "students_select_all" ON students FOR SELECT USING (true);
CREATE POLICY "students_manage" ON students FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'students.manage'));

-- Permission categories: authenticated read
CREATE POLICY "perm_cat_select" ON permission_categories FOR SELECT USING (auth.role() = 'authenticated');

-- Permissions: authenticated read
CREATE POLICY "perms_select" ON permissions FOR SELECT USING (auth.role() = 'authenticated');

-- Staff permissions: staff can read own, manage with permission
CREATE POLICY "staff_perms_select_own" ON staff_permissions FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "staff_perms_manage" ON staff_permissions FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));

-- User sessions: own only
CREATE POLICY "sessions_own" ON user_sessions FOR ALL USING (user_id = auth.uid());

-- Password history: own only
CREATE POLICY "pw_history_own" ON password_history FOR ALL USING (user_id = auth.uid());

-- Audit logs: admin only
CREATE POLICY "audit_admin" ON audit_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Login attempts: admin only
CREATE POLICY "login_attempts_admin" ON login_attempts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Account lockouts: admin only
CREATE POLICY "lockouts_admin" ON account_lockouts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Suggestions: own + admin
CREATE POLICY "suggestions_own" ON suggestions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "suggestions_admin" ON suggestions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- CMS pages: public read, admin write
CREATE POLICY "cms_public" ON cms_pages FOR SELECT USING (published = true);
CREATE POLICY "cms_admin" ON cms_pages FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Calendar: authenticated read, admin write
CREATE POLICY "calendar_read" ON calendar_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "calendar_admin" ON calendar_events FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Assessments: own + staff
CREATE POLICY "assessments_own" ON assessments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "assessments_staff" ON assessments FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'grades.manage'));

-- Fee payments: own + staff
CREATE POLICY "fees_own" ON fee_payments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "fees_staff" ON fee_payments FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'fees.manage'));

-- Messages: own
CREATE POLICY "messages_own" ON messages FOR ALL USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Notifications: own
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- Vora: public read, admin write
CREATE POLICY "vora_public" ON vora_content FOR SELECT USING (true);
CREATE POLICY "vora_admin" ON vora_content FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- ============================================
-- TRIGGERS
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at to all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'schema_migrations' LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;
