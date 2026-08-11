-- ============================================================
-- BDJA Platform — Unified Initial Schema (v3.0)
-- All tables, functions, triggers, RLS policies, indexes
-- Run this ONCE in a fresh Supabase project SQL Editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  phone VARCHAR(20),
  email VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'student',
  user_category VARCHAR(20) DEFAULT 'student',
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  password_changed BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  temp_password_hash TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_role CHECK (role IN ('student', 'parent', 'staff', 'admin')),
  CONSTRAINT chk_user_category CHECK (user_category IN ('student', 'parent', 'staff', 'admin'))
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  department VARCHAR(50) DEFAULT 'General',
  designation VARCHAR(50) DEFAULT 'Staff',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship VARCHAR(50) DEFAULT 'parent',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS permission_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  published BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  author VARCHAR(100),
  isbn VARCHAR(20),
  category VARCHAR(50),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'lost', 'damaged')),
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject VARCHAR(200),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vora_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  summary TEXT,
  subject VARCHAR(50) NOT NULL DEFAULT 'General',
  grade_level VARCHAR(20) NOT NULL DEFAULT 'Grade 1',
  category VARCHAR(50),
  topic VARCHAR(100),
  tags TEXT[],
  channel VARCHAR(100),
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  youtube_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vora_content_id UUID NOT NULL REFERENCES vora_content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vora_content_id)
);

-- Homepage CMS tables
CREATE TABLE IF NOT EXISTS homepage_carousel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  button_text TEXT,
  button_link TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_director_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  director_name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_role TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_upcoming_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic structure tables
CREATE TABLE IF NOT EXISTS grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  grade_level_id UUID REFERENCES grade_levels(id) ON DELETE SET NULL,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  class_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  capacity INTEGER DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

-- Joy AI tables
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) DEFAULT 'New Conversation',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS joy_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  theme VARCHAR(20) DEFAULT 'light',
  personality_mode VARCHAR(20) DEFAULT 'auto',
  language_preference VARCHAR(20) DEFAULT 'auto',
  show_timestamps BOOLEAN DEFAULT true,
  enable_sound BOOLEAN DEFAULT false,
  enable_streaming BOOLEAN DEFAULT true,
  font_size VARCHAR(10) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS joy_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  category VARCHAR(50),
  role VARCHAR(20),
  resolved BOOLEAN DEFAULT false,
  response_time_ms INTEGER,
  model_used VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS joy_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_category ON profiles(user_category);
CREATE INDEX IF NOT EXISTS idx_profiles_campus ON profiles(campus_id);
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff(employee_id);
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade_level);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_profile ON staff_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_impersonated ON audit_logs(impersonated_user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user ON account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_assessments_student ON assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_vora_subject ON vora_content(subject);
CREATE INDEX IF NOT EXISTS idx_vora_grade ON vora_content(grade_level);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conv ON conversation_messages(conversation_id);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_key TEXT) AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin') THEN
    RETURN QUERY SELECT p.key::TEXT FROM permissions p ORDER BY p.category, p.key;
    RETURN;
  END IF;
  RETURN QUERY
    SELECT perm.key::TEXT
    FROM staff_permissions sp
    JOIN permissions perm ON perm.id = sp.permission_id
    WHERE sp.profile_id = p_user_id
    ORDER BY perm.category, perm.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin') THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM staff_permissions sp
    JOIN permissions p ON p.id = sp.permission_id
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

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_raw_role TEXT;
  v_user_category TEXT;
BEGIN
  v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_user_category := CASE v_raw_role
    WHEN 'student' THEN 'student'
    WHEN 'parent'  THEN 'parent'
    WHEN 'teacher' THEN 'staff'
    WHEN 'class_prefect' THEN 'staff'
    WHEN 'bursar'  THEN 'staff'
    WHEN 'librarian' THEN 'staff'
    WHEN 'principal' THEN 'admin'
    WHEN 'super_admin' THEN 'admin'
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

-- ============================================
-- TRIGGERS
-- ============================================

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname NOT LIKE 'RI_ConstraintTrigger_%'
      AND tgname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', t.tgname);
  END LOOP;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'schema_migrations' LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE saved_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_carousel ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_director_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_upcoming_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE joy_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE joy_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE joy_action_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_staff" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_staff" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_staff" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_staff" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));

-- Staff
DROP POLICY IF EXISTS "staff_select_all" ON staff;
DROP POLICY IF EXISTS "staff_manage" ON staff;
CREATE POLICY "staff_select_all" ON staff FOR SELECT USING (true);
CREATE POLICY "staff_manage" ON staff FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));

-- Students
DROP POLICY IF EXISTS "students_select_all" ON students;
DROP POLICY IF EXISTS "students_manage" ON students;
CREATE POLICY "students_select_all" ON students FOR SELECT USING (true);
CREATE POLICY "students_manage" ON students FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'students.manage'));

-- Permission categories
DROP POLICY IF EXISTS "perm_cat_select" ON permission_categories;
CREATE POLICY "perm_cat_select" ON permission_categories FOR SELECT USING (auth.role() = 'authenticated');

-- Permissions
DROP POLICY IF EXISTS "perms_select" ON permissions;
CREATE POLICY "perms_select" ON permissions FOR SELECT USING (auth.role() = 'authenticated');

-- Staff permissions
DROP POLICY IF EXISTS "staff_perms_select_own" ON staff_permissions;
DROP POLICY IF EXISTS "staff_perms_manage" ON staff_permissions;
CREATE POLICY "staff_perms_select_own" ON staff_permissions FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "staff_perms_manage" ON staff_permissions FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'staff.manage'));

-- User sessions
DROP POLICY IF EXISTS "sessions_own" ON user_sessions;
CREATE POLICY "sessions_own" ON user_sessions FOR ALL USING (user_id = auth.uid());

-- Password history
DROP POLICY IF EXISTS "pw_history_own" ON password_history;
CREATE POLICY "pw_history_own" ON password_history FOR ALL USING (user_id = auth.uid());

-- Audit logs
DROP POLICY IF EXISTS "audit_admin" ON audit_logs;
CREATE POLICY "audit_admin" ON audit_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Login attempts
DROP POLICY IF EXISTS "login_attempts_admin" ON login_attempts;
CREATE POLICY "login_attempts_admin" ON login_attempts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Account lockouts
DROP POLICY IF EXISTS "lockouts_admin" ON account_lockouts;
CREATE POLICY "lockouts_admin" ON account_lockouts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Suggestions
DROP POLICY IF EXISTS "suggestions_own" ON suggestions;
DROP POLICY IF EXISTS "suggestions_admin" ON suggestions;
CREATE POLICY "suggestions_own" ON suggestions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "suggestions_admin" ON suggestions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- CMS pages
DROP POLICY IF EXISTS "cms_public" ON cms_pages;
DROP POLICY IF EXISTS "cms_admin" ON cms_pages;
CREATE POLICY "cms_public" ON cms_pages FOR SELECT USING (published = true);
CREATE POLICY "cms_admin" ON cms_pages FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Calendar
DROP POLICY IF EXISTS "calendar_read" ON calendar_events;
DROP POLICY IF EXISTS "calendar_admin" ON calendar_events;
CREATE POLICY "calendar_read" ON calendar_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "calendar_admin" ON calendar_events FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Timetable
DROP POLICY IF EXISTS "timetable_read" ON timetable_entries;
DROP POLICY IF EXISTS "timetable_admin" ON timetable_entries;
CREATE POLICY "timetable_read" ON timetable_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "timetable_admin" ON timetable_entries FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Assessments
DROP POLICY IF EXISTS "assessments_own" ON assessments;
DROP POLICY IF EXISTS "assessments_staff" ON assessments;
CREATE POLICY "assessments_own" ON assessments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "assessments_staff" ON assessments FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'grades.manage'));

-- Assignments
DROP POLICY IF EXISTS "assignments_staff" ON assignments;
DROP POLICY IF EXISTS "assignments_student" ON assignments;
CREATE POLICY "assignments_staff" ON assignments FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'assignments.manage'));
CREATE POLICY "assignments_student" ON assignments FOR SELECT USING (EXISTS (SELECT 1 FROM students s WHERE s.id = auth.uid() AND s.class_id = assignments.class_id));

-- Fee payments
DROP POLICY IF EXISTS "fees_own" ON fee_payments;
DROP POLICY IF EXISTS "fees_staff" ON fee_payments;
CREATE POLICY "fees_own" ON fee_payments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "fees_staff" ON fee_payments FOR ALL USING (EXISTS (SELECT 1 FROM staff_permissions sp JOIN permissions p ON sp.permission_id = p.id WHERE sp.profile_id = auth.uid() AND p.key = 'fees.manage'));

-- Library books
DROP POLICY IF EXISTS "library_read" ON library_books;
DROP POLICY IF EXISTS "library_admin" ON library_books;
CREATE POLICY "library_read" ON library_books FOR SELECT USING (true);
CREATE POLICY "library_admin" ON library_books FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Admissions
DROP POLICY IF EXISTS "admissions_admin" ON admissions;
CREATE POLICY "admissions_admin" ON admissions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Messages
DROP POLICY IF EXISTS "messages_own" ON messages;
CREATE POLICY "messages_own" ON messages FOR ALL USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Notifications
DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- Vora content
DROP POLICY IF EXISTS "vora_public" ON vora_content;
DROP POLICY IF EXISTS "vora_admin" ON vora_content;
CREATE POLICY "vora_public" ON vora_content FOR SELECT USING (is_public = true);
CREATE POLICY "vora_admin" ON vora_content FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Saved videos
DROP POLICY IF EXISTS "saved_videos_own" ON saved_videos;
CREATE POLICY "saved_videos_own" ON saved_videos FOR ALL USING (user_id = auth.uid());

-- Homepage tables
DROP POLICY IF EXISTS "homepage_carousel_public" ON homepage_carousel;
DROP POLICY IF EXISTS "homepage_carousel_admin" ON homepage_carousel;
CREATE POLICY "homepage_carousel_public" ON homepage_carousel FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_carousel_admin" ON homepage_carousel FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "homepage_director_public" ON homepage_director_message;
DROP POLICY IF EXISTS "homepage_director_admin" ON homepage_director_message;
CREATE POLICY "homepage_director_public" ON homepage_director_message FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_director_admin" ON homepage_director_message FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "homepage_notices_public" ON homepage_notices;
DROP POLICY IF EXISTS "homepage_notices_admin" ON homepage_notices;
CREATE POLICY "homepage_notices_public" ON homepage_notices FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));
CREATE POLICY "homepage_notices_admin" ON homepage_notices FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "homepage_stats_public" ON homepage_stats;
DROP POLICY IF EXISTS "homepage_stats_admin" ON homepage_stats;
CREATE POLICY "homepage_stats_public" ON homepage_stats FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_stats_admin" ON homepage_stats FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "homepage_testimonials_public" ON homepage_testimonials;
DROP POLICY IF EXISTS "homepage_testimonials_admin" ON homepage_testimonials;
CREATE POLICY "homepage_testimonials_public" ON homepage_testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_testimonials_admin" ON homepage_testimonials FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "homepage_events_public" ON homepage_upcoming_events;
DROP POLICY IF EXISTS "homepage_events_admin" ON homepage_upcoming_events;
CREATE POLICY "homepage_events_public" ON homepage_upcoming_events FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_events_admin" ON homepage_upcoming_events FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Academic structure
DROP POLICY IF EXISTS "grade_levels_public" ON grade_levels;
DROP POLICY IF EXISTS "grade_levels_admin" ON grade_levels;
CREATE POLICY "grade_levels_public" ON grade_levels FOR SELECT USING (true);
CREATE POLICY "grade_levels_admin" ON grade_levels FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "subjects_public" ON subjects;
DROP POLICY IF EXISTS "subjects_admin" ON subjects;
CREATE POLICY "subjects_public" ON subjects FOR SELECT USING (true);
CREATE POLICY "subjects_admin" ON subjects FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "classes_public" ON classes;
DROP POLICY IF EXISTS "classes_admin" ON classes;
CREATE POLICY "classes_public" ON classes FOR SELECT USING (true);
CREATE POLICY "classes_admin" ON classes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "class_subjects_public" ON class_subjects;
DROP POLICY IF EXISTS "class_subjects_admin" ON class_subjects;
CREATE POLICY "class_subjects_public" ON class_subjects FOR SELECT USING (true);
CREATE POLICY "class_subjects_admin" ON class_subjects FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- Joy AI
DROP POLICY IF EXISTS "conversations_own" ON conversations;
DROP POLICY IF EXISTS "conversations_admin" ON conversations;
CREATE POLICY "conversations_own" ON conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "conversations_admin" ON conversations FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "conv_messages_own" ON conversation_messages;
DROP POLICY IF EXISTS "conv_messages_admin" ON conversation_messages;
CREATE POLICY "conv_messages_own" ON conversation_messages FOR ALL USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_messages.conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "conv_messages_admin" ON conversation_messages FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "joy_prefs_own" ON joy_user_preferences;
CREATE POLICY "joy_prefs_own" ON joy_user_preferences FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "joy_analytics_admin" ON joy_analytics;
CREATE POLICY "joy_analytics_admin" ON joy_analytics FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

DROP POLICY IF EXISTS "joy_action_logs_own" ON joy_action_logs;
CREATE POLICY "joy_action_logs_own" ON joy_action_logs FOR ALL USING (user_id = auth.uid());

-- ============================================
-- SERVICE ROLE PRIVILEGES
-- ============================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
CREATE POLICY "Allow authenticated read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Allow authenticated delete own" ON storage.objects;
CREATE POLICY "Allow authenticated delete own" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'attachments' AND owner = auth.uid());
