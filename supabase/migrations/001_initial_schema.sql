-- ============================================================
-- BDJA Platform — Complete Corrected Schema
-- Auto-generated from src/types/database.ts to match codebase exactly
-- 61 tables, all foreign keys, indexes, functions, triggers, RLS policies
-- Date: 2026-08-11
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES (no foreign keys yet)
-- ============================================

CREATE TABLE IF NOT EXISTS account_lockouts (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  failed_attempts INTEGER NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT,
  last_failed_at TEXT,
  locked_until TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_recovery_log (
  action TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET,
  reason TEXT NOT NULL,
  target_user_id UUID NOT NULL,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS campuses (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS login_attempts (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET,
  success BOOLEAN
);

CREATE TABLE IF NOT EXISTS login_audit (
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB,
  email TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET,
  user_agent TEXT,
  user_id UUID
);

CREATE TABLE IF NOT EXISTS password_history (
  changed_at TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash TEXT NOT NULL,
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS permission_categories (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  icon TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS permissions (
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  avatar_url TEXT,
  campus_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  email TEXT NOT NULL,
  failed_login_count INTEGER,
  full_name TEXT NOT NULL,
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL,
  last_login_at TEXT,
  last_login_ip INET,
  last_password_change TEXT,
  locked_until TEXT,
  mfa_enabled BOOLEAN,
  mfa_secret TEXT,
  onboarding_completed BOOLEAN NOT NULL,
  password_changed BOOLEAN NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  temp_password_hash TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_category TEXT NOT NULL,
  CONSTRAINT chk_role CHECK (role IN ('student', 'parent', 'staff', 'admin', 'super_admin', 'teacher', 'class_prefect', 'bursar', 'librarian', 'principal')),
  CONSTRAINT chk_user_category CHECK (user_category IN ('student', 'parent', 'staff', 'admin'))
);

CREATE TABLE IF NOT EXISTS saved_videos (
  difficulty TEXT,
  duration_seconds INTEGER,
  grade_level TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_at TEXT,
  subject TEXT,
  summary TEXT,
  thumbnail_url TEXT,
  title TEXT NOT NULL,
  user_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  youtube_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  department TEXT,
  designation TEXT,
  employee_id TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  join_date TEXT,
  status TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_staff_status CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated'))
);

CREATE TABLE IF NOT EXISTS staff_permissions (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  UNIQUE(profile_id, permission_id)
);

CREATE TABLE IF NOT EXISTS staff_roles (
  assigned_by UUID,
  campus_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permissions JSONB NOT NULL,
  role TEXT NOT NULL,
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  grade_levels TEXT[],
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suggestions (
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT,
  responded_at TEXT,
  responded_by UUID,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL,
  CONSTRAINT chk_suggestion_type CHECK (type IN ('idea', 'feedback', 'bug', 'improvement', 'complaint')),
  CONSTRAINT chk_suggestion_status CHECK (status IN ('open', 'under_review', 'planned', 'implemented', 'declined', 'closed')),
  CONSTRAINT chk_suggestion_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  device_fingerprint TEXT,
  device_info JSONB,
  expires_at TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET,
  is_active BOOLEAN,
  last_active_at TEXT,
  revoked_at TEXT,
  revoked_reason TEXT,
  session_token_hash TEXT NOT NULL,
  user_agent TEXT,
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS admissions (
  admission_number TEXT,
  campus_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date_of_birth TEXT,
  documents JSONB,
  first_name TEXT NOT NULL,
  gender TEXT,
  grade_applied TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_name TEXT NOT NULL,
  notes TEXT,
  parent_email TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  reviewed_by UUID,
  status TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_admission_status CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'waitlisted'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impersonated_user_id UUID,
  ip_address TEXT,
  new_data JSONB,
  old_data JSONB,
  record_id TEXT,
  table_name TEXT,
  user_agent TEXT,
  user_id UUID
);

CREATE TABLE IF NOT EXISTS calendar_events (
  attachments JSONB,
  campus_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  description TEXT,
  end_date TEXT,
  event_type TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  target_grade TEXT,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  academic_year TEXT NOT NULL,
  campus_id UUID NOT NULL,
  class_teacher_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  grade_level TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stream TEXT
);

CREATE TABLE IF NOT EXISTS cms_pages (
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_published BOOLEAN,
  last_edited_by UUID,
  meta_description TEXT,
  meta_keywords TEXT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_pinned BOOLEAN,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS fee_structures (
  academic_year TEXT NOT NULL,
  activity_fees INTEGER,
  campus_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  grade_level TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  other_fees JSONB,
  term TEXT NOT NULL,
  total INTEGER,
  transport INTEGER,
  tuition INTEGER NOT NULL,
  uniform INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_uploads (
  checksum TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  filename TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mime_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  scan_result TEXT,
  scanned BOOLEAN,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS homepage_carousel (
  button_link TEXT,
  button_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  description TEXT,
  display_order INTEGER NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT,
  is_active BOOLEAN,
  subtitle TEXT,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_director_message (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  director_name TEXT NOT NULL,
  director_photo_url TEXT,
  director_title TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN,
  message TEXT NOT NULL,
  signature_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_footer_links (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  display_order INTEGER NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN,
  label TEXT NOT NULL,
  section TEXT NOT NULL,
  url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS homepage_grade_levels (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  description TEXT,
  display_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  grade_key TEXT NOT NULL,
  icon_filename TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_news (
  category TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  excerpt TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT,
  is_active BOOLEAN,
  is_featured BOOLEAN,
  news_date TEXT NOT NULL,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_notices (
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  icon_type TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN,
  is_pinned BOOLEAN,
  priority INTEGER,
  notice_date TEXT NOT NULL,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_quick_links (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  display_order INTEGER NOT NULL,
  icon_name TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN,
  label TEXT NOT NULL,
  target_audience TEXT,
  url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS homepage_social_links (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  display_order INTEGER NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN,
  platform TEXT NOT NULL,
  url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS homepage_stats (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  display_order INTEGER NOT NULL,
  icon_name TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN,
  label TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS joy_actions (
  action_data JSONB,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  success BOOLEAN,
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS joy_analytics (
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_used TEXT,
  query TEXT NOT NULL,
  resolved BOOLEAN,
  response_time_ms INTEGER,
  role TEXT,
  user_id UUID
);

CREATE TABLE IF NOT EXISTS joy_user_preferences (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  enable_sound BOOLEAN,
  enable_streaming BOOLEAN,
  font_size TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_preference TEXT NOT NULL,
  personality_mode TEXT NOT NULL,
  show_timestamps BOOLEAN,
  theme TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS library_resources (
  author TEXT,
  available_copies INTEGER,
  borrowed_by JSONB,
  campus_id UUID,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  file_url TEXT,
  grade_levels TEXT[],
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn TEXT,
  resource_type TEXT NOT NULL,
  subject_id UUID,
  title TEXT NOT NULL,
  total_copies INTEGER
);

CREATE TABLE IF NOT EXISTS mark_sheet_templates (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  description TEXT,
  grade_levels TEXT[],
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN,
  layout_config JSONB NOT NULL,
  name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  attachments JSONB,
  class_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  read BOOLEAN,
  read_at TEXT,
  receiver_id UUID,
  sender_id UUID NOT NULL,
  subject TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  action_url TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  read BOOLEAN,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  user_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS parent_students (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_primary BOOLEAN,
  parent_id UUID NOT NULL,
  relationship TEXT,
  student_id UUID NOT NULL,
  UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS students (
  admission_number TEXT NOT NULL,
  barcode TEXT,
  campus_id UUID,
  class_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date_of_birth TEXT,
  enrollment_date TEXT,
  grade_level TEXT,
  house_team TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID,
  status TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_student_status CHECK (status IN ('active', 'inactive', 'graduated', 'transferred'))
);

CREATE TABLE IF NOT EXISTS study_streaks (
  current_streak INTEGER,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_activity_date TEXT,
  longest_streak INTEGER,
  student_id UUID NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_mark_sheets (
  academic_year TEXT NOT NULL,
  class_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  entries JSONB NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_template BOOLEAN,
  layout_config JSONB NOT NULL,
  max_score INTEGER,
  subject_id UUID,
  teacher_id UUID NOT NULL,
  template_name TEXT,
  term TEXT NOT NULL,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_registers (
  class_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  entries JSONB NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_template BOOLEAN,
  layout_config JSONB NOT NULL,
  register_date TEXT NOT NULL,
  teacher_id UUID NOT NULL,
  template_name TEXT,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_timetables (
  class_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN,
  is_template BOOLEAN,
  layout_config JSONB NOT NULL,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetable (
  campus_id UUID NOT NULL,
  class_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  day_of_week INTEGER NOT NULL,
  end_time TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room TEXT,
  start_time TEXT NOT NULL,
  subject_id UUID NOT NULL,
  teacher_id UUID,
  topic TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS values_badges (
  awarded_by UUID NOT NULL,
  badge_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT,
  student_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS vora_content (
  approved BOOLEAN,
  approved_by UUID,
  campus_id UUID NOT NULL,
  captions JSONB,
  class_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  description TEXT,
  duration TEXT,
  grade_level TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_public BOOLEAN,
  specific_learning_outcome TEXT,
  strand TEXT,
  sub_strand TEXT,
  subject TEXT NOT NULL,
  subject_id UUID,
  summary TEXT,
  thumbnail_url TEXT,
  title TEXT NOT NULL,
  topic TEXT,
  transcript TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID NOT NULL,
  video_url TEXT NOT NULL,
  visibility TEXT,
  CONSTRAINT chk_vora_visibility CHECK (visibility IN ('public', 'private', 'restricted'))
);

CREATE TABLE IF NOT EXISTS vora_quizzes (
  correct_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  explanation TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  options JSONB,
  order_index INTEGER,
  question TEXT NOT NULL,
  vora_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
  academic_year TEXT NOT NULL,
  assessed_by UUID NOT NULL,
  change_reason TEXT,
  class_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_score INTEGER,
  performance_level TEXT NOT NULL,
  score INTEGER,
  specific_learning_outcome TEXT,
  strand TEXT NOT NULL,
  student_id UUID NOT NULL,
  sub_strand TEXT NOT NULL,
  subject_id UUID NOT NULL,
  term TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_performance_level CHECK (performance_level IN ('beginning', 'developing', 'competent', 'exceeds'))
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  assignment_id UUID NOT NULL,
  attachments JSONB,
  content TEXT,
  grade JSONB,
  graded_at TEXT,
  graded_by UUID,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT,
  student_id UUID NOT NULL,
  submitted_at TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
  attachments JSONB,
  class_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  due_date TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric JSONB,
  status TEXT,
  subject_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_assignment_status CHECK (status IN ('draft', 'published', 'closed'))
);

CREATE TABLE IF NOT EXISTS attendance (
  class_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marked_by UUID NOT NULL,
  notes TEXT,
  status TEXT NOT NULL,
  student_id UUID NOT NULL,
  subject_id UUID,
  CONSTRAINT chk_attendance_status CHECK (status IN ('present', 'absent', 'late', 'excused'))
);

CREATE TABLE IF NOT EXISTS character_reports (
  academic_year TEXT NOT NULL,
  assessed_by UUID NOT NULL,
  commitment TEXT,
  compassion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  discipline TEXT,
  excellence TEXT,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrity TEXT,
  respect TEXT,
  responsibility TEXT,
  student_id UUID NOT NULL,
  teacher_notes TEXT,
  teamwork TEXT,
  term TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS class_subjects (
  class_id UUID NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL,
  teacher_id UUID,
  UNIQUE(class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  content TEXT NOT NULL,
  conversation_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metadata JSONB,
  role TEXT NOT NULL,
  CONSTRAINT chk_message_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE TABLE IF NOT EXISTS fee_payments (
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fee_structure_id UUID NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notes TEXT,
  payment_method TEXT NOT NULL,
  receipt_number TEXT,
  receipt_url TEXT,
  status TEXT,
  student_id UUID NOT NULL,
  transaction_ref TEXT,
  verified_at TEXT,
  verified_by UUID,
  CONSTRAINT chk_fee_status CHECK (status IN ('paid', 'partial', 'unpaid', 'overdue'))
);

CREATE TABLE IF NOT EXISTS library_borrowings (
  borrowed_at TEXT,
  due_date TEXT NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL,
  returned_at TEXT,
  staff_id UUID,
  status TEXT,
  student_id UUID
);

CREATE TABLE IF NOT EXISTS parent_children (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  relationship TEXT,
  student_id UUID NOT NULL,
  UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS vora_attempts (
  answers JSONB,
  completed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score INTEGER,
  student_id UUID NOT NULL,
  vora_id UUID NOT NULL
);

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_category_fkey;
ALTER TABLE permissions ADD CONSTRAINT permissions_category_fkey FOREIGN KEY (category) REFERENCES permission_categories(key) ON DELETE SET NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_campus_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE saved_videos DROP CONSTRAINT IF EXISTS saved_videos_user_id_fkey;
ALTER TABLE saved_videos ADD CONSTRAINT saved_videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_id_fkey;
ALTER TABLE staff ADD CONSTRAINT staff_id_fkey FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE staff_permissions DROP CONSTRAINT IF EXISTS staff_permissions_granted_by_fkey;
ALTER TABLE staff_permissions ADD CONSTRAINT staff_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE staff_permissions DROP CONSTRAINT IF EXISTS staff_permissions_permission_id_fkey;
ALTER TABLE staff_permissions ADD CONSTRAINT staff_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE SET NULL;

ALTER TABLE staff_permissions DROP CONSTRAINT IF EXISTS staff_permissions_profile_id_fkey;
ALTER TABLE staff_permissions ADD CONSTRAINT staff_permissions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE staff_roles DROP CONSTRAINT IF EXISTS staff_roles_assigned_by_fkey;
ALTER TABLE staff_roles ADD CONSTRAINT staff_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE staff_roles DROP CONSTRAINT IF EXISTS staff_roles_campus_id_fkey;
ALTER TABLE staff_roles ADD CONSTRAINT staff_roles_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE staff_roles DROP CONSTRAINT IF EXISTS staff_roles_user_id_fkey;
ALTER TABLE staff_roles ADD CONSTRAINT staff_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE suggestions DROP CONSTRAINT IF EXISTS suggestions_responded_by_fkey;
ALTER TABLE suggestions ADD CONSTRAINT suggestions_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE suggestions DROP CONSTRAINT IF EXISTS suggestions_user_id_fkey;
ALTER TABLE suggestions ADD CONSTRAINT suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE admissions DROP CONSTRAINT IF EXISTS admissions_campus_id_fkey;
ALTER TABLE admissions ADD CONSTRAINT admissions_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE admissions DROP CONSTRAINT IF EXISTS admissions_reviewed_by_fkey;
ALTER TABLE admissions ADD CONSTRAINT admissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_campus_id_fkey;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_created_by_fkey;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_campus_id_fkey;
ALTER TABLE classes ADD CONSTRAINT classes_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_class_teacher_id_fkey;
ALTER TABLE classes ADD CONSTRAINT classes_class_teacher_id_fkey FOREIGN KEY (class_teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE cms_pages DROP CONSTRAINT IF EXISTS cms_pages_last_edited_by_fkey;
ALTER TABLE cms_pages ADD CONSTRAINT cms_pages_last_edited_by_fkey FOREIGN KEY (last_edited_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_structures_campus_id_fkey;
ALTER TABLE fee_structures ADD CONSTRAINT fee_structures_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_structures_created_by_fkey;
ALTER TABLE fee_structures ADD CONSTRAINT fee_structures_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE file_uploads DROP CONSTRAINT IF EXISTS file_uploads_user_id_fkey;
ALTER TABLE file_uploads ADD CONSTRAINT file_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE homepage_carousel DROP CONSTRAINT IF EXISTS homepage_carousel_created_by_fkey;
ALTER TABLE homepage_carousel ADD CONSTRAINT homepage_carousel_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE homepage_director_message DROP CONSTRAINT IF EXISTS homepage_director_message_created_by_fkey;
ALTER TABLE homepage_director_message ADD CONSTRAINT homepage_director_message_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE homepage_footer_links DROP CONSTRAINT IF EXISTS homepage_footer_links_created_by_fkey;
ALTER TABLE homepage_footer_links ADD CONSTRAINT homepage_footer_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE homepage_grade_levels DROP CONSTRAINT IF EXISTS homepage_grade_levels_created_by_fkey;
ALTER TABLE homepage_grade_levels ADD CONSTRAINT homepage_grade_levels_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE homepage_news DROP CONSTRAINT IF EXISTS homepage_news_created_by_fkey;
ALTER TABLE homepage_news ADD CONSTRAINT homepage_news_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE homepage_notices DROP CONSTRAINT IF EXISTS homepage_notices_created_by_fkey;
ALTER TABLE homepage_notices ADD CONSTRAINT homepage_notices_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE homepage_quick_links DROP CONSTRAINT IF EXISTS homepage_quick_links_created_by_fkey;
ALTER TABLE homepage_quick_links ADD CONSTRAINT homepage_quick_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE homepage_social_links DROP CONSTRAINT IF EXISTS homepage_social_links_created_by_fkey;
ALTER TABLE homepage_social_links ADD CONSTRAINT homepage_social_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE homepage_stats DROP CONSTRAINT IF EXISTS homepage_stats_created_by_fkey;
ALTER TABLE homepage_stats ADD CONSTRAINT homepage_stats_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE joy_actions DROP CONSTRAINT IF EXISTS joy_actions_user_id_fkey;
ALTER TABLE joy_actions ADD CONSTRAINT joy_actions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE joy_analytics DROP CONSTRAINT IF EXISTS joy_analytics_user_id_fkey;
ALTER TABLE joy_analytics ADD CONSTRAINT joy_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE joy_user_preferences DROP CONSTRAINT IF EXISTS joy_user_preferences_user_id_fkey;
ALTER TABLE joy_user_preferences ADD CONSTRAINT joy_user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE library_resources DROP CONSTRAINT IF EXISTS library_resources_campus_id_fkey;
ALTER TABLE library_resources ADD CONSTRAINT library_resources_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE library_resources DROP CONSTRAINT IF EXISTS library_resources_created_by_fkey;
ALTER TABLE library_resources ADD CONSTRAINT library_resources_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE library_resources DROP CONSTRAINT IF EXISTS library_resources_subject_id_fkey;
ALTER TABLE library_resources ADD CONSTRAINT library_resources_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE mark_sheet_templates DROP CONSTRAINT IF EXISTS mark_sheet_templates_created_by_fkey;
ALTER TABLE mark_sheet_templates ADD CONSTRAINT mark_sheet_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_class_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE parent_students DROP CONSTRAINT IF EXISTS parent_students_parent_id_fkey;
ALTER TABLE parent_students ADD CONSTRAINT parent_students_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE parent_students DROP CONSTRAINT IF EXISTS parent_students_student_id_fkey;
ALTER TABLE parent_students ADD CONSTRAINT parent_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_campus_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_class_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_profile_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE study_streaks DROP CONSTRAINT IF EXISTS study_streaks_student_id_fkey;
ALTER TABLE study_streaks ADD CONSTRAINT study_streaks_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE teacher_mark_sheets DROP CONSTRAINT IF EXISTS teacher_mark_sheets_class_id_fkey;
ALTER TABLE teacher_mark_sheets ADD CONSTRAINT teacher_mark_sheets_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE teacher_mark_sheets DROP CONSTRAINT IF EXISTS teacher_mark_sheets_created_by_fkey;
ALTER TABLE teacher_mark_sheets ADD CONSTRAINT teacher_mark_sheets_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE teacher_mark_sheets DROP CONSTRAINT IF EXISTS teacher_mark_sheets_subject_id_fkey;
ALTER TABLE teacher_mark_sheets ADD CONSTRAINT teacher_mark_sheets_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE teacher_mark_sheets DROP CONSTRAINT IF EXISTS teacher_mark_sheets_teacher_id_fkey;
ALTER TABLE teacher_mark_sheets ADD CONSTRAINT teacher_mark_sheets_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE teacher_registers DROP CONSTRAINT IF EXISTS teacher_registers_class_id_fkey;
ALTER TABLE teacher_registers ADD CONSTRAINT teacher_registers_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE teacher_registers DROP CONSTRAINT IF EXISTS teacher_registers_created_by_fkey;
ALTER TABLE teacher_registers ADD CONSTRAINT teacher_registers_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE teacher_registers DROP CONSTRAINT IF EXISTS teacher_registers_teacher_id_fkey;
ALTER TABLE teacher_registers ADD CONSTRAINT teacher_registers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE teacher_timetables DROP CONSTRAINT IF EXISTS teacher_timetables_class_id_fkey;
ALTER TABLE teacher_timetables ADD CONSTRAINT teacher_timetables_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE teacher_timetables DROP CONSTRAINT IF EXISTS teacher_timetables_teacher_id_fkey;
ALTER TABLE teacher_timetables ADD CONSTRAINT teacher_timetables_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_campus_id_fkey;
ALTER TABLE timetable ADD CONSTRAINT timetable_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_class_id_fkey;
ALTER TABLE timetable ADD CONSTRAINT timetable_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_created_by_fkey;
ALTER TABLE timetable ADD CONSTRAINT timetable_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_subject_id_fkey;
ALTER TABLE timetable ADD CONSTRAINT timetable_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_teacher_id_fkey;
ALTER TABLE timetable ADD CONSTRAINT timetable_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE values_badges DROP CONSTRAINT IF EXISTS values_badges_awarded_by_fkey;
ALTER TABLE values_badges ADD CONSTRAINT values_badges_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE values_badges DROP CONSTRAINT IF EXISTS values_badges_student_id_fkey;
ALTER TABLE values_badges ADD CONSTRAINT values_badges_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE vora_content DROP CONSTRAINT IF EXISTS vora_content_approved_by_fkey;
ALTER TABLE vora_content ADD CONSTRAINT vora_content_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE vora_content DROP CONSTRAINT IF EXISTS vora_content_campus_id_fkey;
ALTER TABLE vora_content ADD CONSTRAINT vora_content_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL;

ALTER TABLE vora_content DROP CONSTRAINT IF EXISTS vora_content_class_id_fkey;
ALTER TABLE vora_content ADD CONSTRAINT vora_content_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE vora_content DROP CONSTRAINT IF EXISTS vora_content_subject_id_fkey;
ALTER TABLE vora_content ADD CONSTRAINT vora_content_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE vora_content DROP CONSTRAINT IF EXISTS vora_content_uploaded_by_fkey;
ALTER TABLE vora_content ADD CONSTRAINT vora_content_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE vora_quizzes DROP CONSTRAINT IF EXISTS vora_quizzes_vora_id_fkey;
ALTER TABLE vora_quizzes ADD CONSTRAINT vora_quizzes_vora_id_fkey FOREIGN KEY (vora_id) REFERENCES vora_content(id) ON DELETE SET NULL;

ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_assessed_by_fkey;
ALTER TABLE assessments ADD CONSTRAINT assessments_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_class_id_fkey;
ALTER TABLE assessments ADD CONSTRAINT assessments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_student_id_fkey;
ALTER TABLE assessments ADD CONSTRAINT assessments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_subject_id_fkey;
ALTER TABLE assessments ADD CONSTRAINT assessments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_fkey;
ALTER TABLE assignment_submissions ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL;

ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_graded_by_fkey;
ALTER TABLE assignment_submissions ADD CONSTRAINT assignment_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_student_id_fkey;
ALTER TABLE assignment_submissions ADD CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_class_id_fkey;
ALTER TABLE assignments ADD CONSTRAINT assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_subject_id_fkey;
ALTER TABLE assignments ADD CONSTRAINT assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_teacher_id_fkey;
ALTER TABLE assignments ADD CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_class_id_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_marked_by_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_subject_id_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE character_reports DROP CONSTRAINT IF EXISTS character_reports_assessed_by_fkey;
ALTER TABLE character_reports ADD CONSTRAINT character_reports_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE character_reports DROP CONSTRAINT IF EXISTS character_reports_student_id_fkey;
ALTER TABLE character_reports ADD CONSTRAINT character_reports_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS class_subjects_class_id_fkey;
ALTER TABLE class_subjects ADD CONSTRAINT class_subjects_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS class_subjects_subject_id_fkey;
ALTER TABLE class_subjects ADD CONSTRAINT class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS class_subjects_teacher_id_fkey;
ALTER TABLE class_subjects ADD CONSTRAINT class_subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_conversation_id_fkey;
ALTER TABLE conversation_messages ADD CONSTRAINT conversation_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;

ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_fee_structure_id_fkey;
ALTER TABLE fee_payments ADD CONSTRAINT fee_payments_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE SET NULL;

ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_fkey;
ALTER TABLE fee_payments ADD CONSTRAINT fee_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_verified_by_fkey;
ALTER TABLE fee_payments ADD CONSTRAINT fee_payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE library_borrowings DROP CONSTRAINT IF EXISTS library_borrowings_resource_id_fkey;
ALTER TABLE library_borrowings ADD CONSTRAINT library_borrowings_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES library_resources(id) ON DELETE SET NULL;

ALTER TABLE library_borrowings DROP CONSTRAINT IF EXISTS library_borrowings_staff_id_fkey;
ALTER TABLE library_borrowings ADD CONSTRAINT library_borrowings_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE library_borrowings DROP CONSTRAINT IF EXISTS library_borrowings_student_id_fkey;
ALTER TABLE library_borrowings ADD CONSTRAINT library_borrowings_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE parent_children DROP CONSTRAINT IF EXISTS parent_children_parent_id_fkey;
ALTER TABLE parent_children ADD CONSTRAINT parent_children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE parent_children DROP CONSTRAINT IF EXISTS parent_children_student_id_fkey;
ALTER TABLE parent_children ADD CONSTRAINT parent_children_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE vora_attempts DROP CONSTRAINT IF EXISTS vora_attempts_student_id_fkey;
ALTER TABLE vora_attempts ADD CONSTRAINT vora_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE vora_attempts DROP CONSTRAINT IF EXISTS vora_attempts_vora_id_fkey;
ALTER TABLE vora_attempts ADD CONSTRAINT vora_attempts_vora_id_fkey FOREIGN KEY (vora_id) REFERENCES vora_content(id) ON DELETE SET NULL;


-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_usercategory ON profiles(user_category);
CREATE INDEX IF NOT EXISTS idx_profiles_campusid ON profiles(campus_id);
CREATE INDEX IF NOT EXISTS idx_profiles_isactive ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_createdby ON profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_staff_employeeid ON staff(employee_id);
CREATE INDEX IF NOT EXISTS idx_students_admissionnumber ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_gradelevel ON students(grade_level);
CREATE INDEX IF NOT EXISTS idx_students_classid ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_parent_students_parentid ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_studentid ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_parentid ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_studentid ON parent_children(student_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_profileid ON staff_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_permissionid ON staff_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_userid ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_sessiontokenhash ON user_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_userid ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_createdat ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ipaddress ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_audit_userid ON login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_userid ON account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_userid ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_startdate ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_createdby ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_campusid ON calendar_events(campus_id);
CREATE INDEX IF NOT EXISTS idx_timetable_classid ON timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacherid ON timetable(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_timetables_teacherid ON teacher_timetables(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assessments_studentid ON assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_classid ON assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subjectid ON assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_classid ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacherid ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignmentid ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_studentid ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_studentid ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_campusid ON fee_structures(campus_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_gradelevel ON fee_structures(grade_level);
CREATE INDEX IF NOT EXISTS idx_library_borrowings_resourceid ON library_borrowings(resource_id);
CREATE INDEX IF NOT EXISTS idx_library_borrowings_studentid ON library_borrowings(student_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_campusid ON admissions(campus_id);
CREATE INDEX IF NOT EXISTS idx_messages_senderid ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_userid ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_vora_content_subject ON vora_content(subject);
CREATE INDEX IF NOT EXISTS idx_vora_content_gradelevel ON vora_content(grade_level);
CREATE INDEX IF NOT EXISTS idx_vora_content_uploadedby ON vora_content(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_vora_content_campusid ON vora_content(campus_id);
CREATE INDEX IF NOT EXISTS idx_vora_content_ispublic ON vora_content(is_public);
CREATE INDEX IF NOT EXISTS idx_saved_videos_userid ON saved_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_videos_videoid ON saved_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_conversations_userid ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updatedat ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversationid ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_joy_user_preferences_userid ON joy_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_joy_analytics_userid ON joy_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_joy_actions_userid ON joy_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_studentid ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_classid ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_character_reports_studentid ON character_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_study_streaks_studentid ON study_streaks(student_id);
CREATE INDEX IF NOT EXISTS idx_values_badges_studentid ON values_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_mark_sheets_teacherid ON teacher_mark_sheets(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_mark_sheets_classid ON teacher_mark_sheets(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_registers_teacherid ON teacher_registers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_registers_classid ON teacher_registers(class_id);
CREATE INDEX IF NOT EXISTS idx_mark_sheet_templates_createdby ON mark_sheet_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_class_subjects_classid ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subjectid ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_campusid ON classes(campus_id);
CREATE INDEX IF NOT EXISTS idx_classes_classteacherid ON classes(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_admin_recovery_log_adminid ON admin_recovery_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_recovery_log_targetuserid ON admin_recovery_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_vora_attempts_studentid ON vora_attempts(student_id);

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
    WHEN 'parent' THEN 'parent'
    WHEN 'teacher' THEN 'staff'
    WHEN 'class_prefect' THEN 'staff'
    WHEN 'bursar' THEN 'staff'
    WHEN 'librarian' THEN 'staff'
    WHEN 'principal' THEN 'admin'
    WHEN 'super_admin' THEN 'admin'
    WHEN 'admin' THEN 'admin'
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
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'updated_at') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
      EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
    END IF;
  END LOOP;
END $$;



-- ============================================
-- RLS POLICIES
-- ============================================

-- account_lockouts
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "account_lockouts_admin" ON account_lockouts;
CREATE POLICY "account_lockouts_admin" ON account_lockouts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- admin_recovery_log
ALTER TABLE admin_recovery_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_recovery_log_admin" ON admin_recovery_log;
CREATE POLICY "admin_recovery_log_admin" ON admin_recovery_log FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- admissions
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admissions_admin" ON admissions;
CREATE POLICY "admissions_admin" ON admissions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assessments_read" ON assessments;
DROP POLICY IF EXISTS "assessments_admin" ON assessments;
CREATE POLICY "assessments_read" ON assessments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "assessments_admin" ON assessments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- assignment_submissions
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignment_submissions_read" ON assignment_submissions;
DROP POLICY IF EXISTS "assignment_submissions_admin" ON assignment_submissions;
CREATE POLICY "assignment_submissions_read" ON assignment_submissions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "assignment_submissions_admin" ON assignment_submissions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignments_read" ON assignments;
DROP POLICY IF EXISTS "assignments_admin" ON assignments;
CREATE POLICY "assignments_read" ON assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "assignments_admin" ON assignments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_read" ON attendance;
DROP POLICY IF EXISTS "attendance_admin" ON attendance;
CREATE POLICY "attendance_read" ON attendance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "attendance_admin" ON attendance FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_admin" ON audit_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calendar_events_read" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_admin" ON calendar_events;
CREATE POLICY "calendar_events_read" ON calendar_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "calendar_events_admin" ON calendar_events FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- campuses
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campuses_public" ON campuses;
DROP POLICY IF EXISTS "campuses_admin" ON campuses;
CREATE POLICY "campuses_public" ON campuses FOR SELECT USING (true);
CREATE POLICY "campuses_admin" ON campuses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- character_reports
ALTER TABLE character_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "character_reports_read" ON character_reports;
DROP POLICY IF EXISTS "character_reports_admin" ON character_reports;
CREATE POLICY "character_reports_read" ON character_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "character_reports_admin" ON character_reports FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- class_subjects
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "class_subjects_public" ON class_subjects;
DROP POLICY IF EXISTS "class_subjects_admin" ON class_subjects;
CREATE POLICY "class_subjects_public" ON class_subjects FOR SELECT USING (true);
CREATE POLICY "class_subjects_admin" ON class_subjects FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- classes
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classes_public" ON classes;
DROP POLICY IF EXISTS "classes_admin" ON classes;
CREATE POLICY "classes_public" ON classes FOR SELECT USING (true);
CREATE POLICY "classes_admin" ON classes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- cms_pages
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cms_pages_admin" ON cms_pages;
CREATE POLICY "cms_pages_admin" ON cms_pages FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- conversation_messages
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversation_messages_admin" ON conversation_messages;
CREATE POLICY "conversation_messages_admin" ON conversation_messages FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_own" ON conversations;
CREATE POLICY "conversations_own" ON conversations FOR ALL USING (user_id = auth.uid());

-- fee_payments
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fee_payments_read" ON fee_payments;
DROP POLICY IF EXISTS "fee_payments_admin" ON fee_payments;
CREATE POLICY "fee_payments_read" ON fee_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "fee_payments_admin" ON fee_payments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- fee_structures
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fee_structures_read" ON fee_structures;
DROP POLICY IF EXISTS "fee_structures_admin" ON fee_structures;
CREATE POLICY "fee_structures_read" ON fee_structures FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "fee_structures_admin" ON fee_structures FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- file_uploads
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "file_uploads_own" ON file_uploads;
CREATE POLICY "file_uploads_own" ON file_uploads FOR ALL USING (user_id = auth.uid());

-- homepage_carousel
ALTER TABLE homepage_carousel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "homepage_carousel_public" ON homepage_carousel;
DROP POLICY IF EXISTS "homepage_carousel_admin" ON homepage_carousel;
CREATE POLICY "homepage_carousel_public" ON homepage_carousel FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_carousel_admin" ON homepage_carousel FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- homepage_director_message
ALTER TABLE homepage_director_message ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "homepage_director_message_public" ON homepage_director_message;
DROP POLICY IF EXISTS "homepage_director_message_admin" ON homepage_director_message;
CREATE POLICY "homepage_director_message_public" ON homepage_director_message FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_director_message_admin" ON homepage_director_message FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- homepage_footer_links
ALTER TABLE homepage_footer_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "homepage_footer_links_public" ON homepage_footer_links;
DROP POLICY IF EXISTS "homepage_footer_links_admin" ON homepage_footer_links;
CREATE POLICY "homepage_footer_links_public" ON homepage_footer_links FOR SELECT USING (true);
CREATE POLICY "homepage_footer_links_admin" ON homepage_footer_links FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- homepage_grade_levels
ALTER TABLE homepage_grade_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "homepage_grade_levels_public" ON homepage_grade_levels;
DROP POLICY IF EXISTS "homepage_grade_levels_admin" ON homepage_grade_levels;
CREATE POLICY "homepage_grade_levels_public" ON homepage_grade_levels FOR SELECT USING (true);
CREATE POLICY "homepage_grade_levels_admin" ON homepage_grade_levels FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- homepage_news
ALTER TABLE homepage_news ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "homepage_news_public" ON homepage_news;
DROP POLICY IF EXISTS "homepage_news_admin" ON homepage_news;
CREATE POLICY "homepage_news_public" ON homepage_news FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_news_admin" ON homepage_news FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- homepage_notices
ALTER TABLE homepage_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "homepage_notices_public" ON homepage_notices;
DROP POLICY IF EXISTS "homepage_notices_admin" ON homepage_notices;
CREATE POLICY "homepage_notices_public" ON homepage_notices FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_notices_admin" ON homepage_notices FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- homepage_quick_links
ALTER TABLE homepage_quick_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "homepage_quick_links_public" ON homepage_quick_links;
DROP POLICY IF EXISTS "homepage_quick_links_admin" ON homepage_quick_links;
CREATE POLICY "homepage_quick_links_public" ON homepage_quick_links FOR SELECT USING (true);
CREATE POLICY "homepage_quick_links_admin" ON homepage_quick_links FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- homepage_social_links
ALTER TABLE homepage_social_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "homepage_social_links_public" ON homepage_social_links;
DROP POLICY IF EXISTS "homepage_social_links_admin" ON homepage_social_links;
CREATE POLICY "homepage_social_links_public" ON homepage_social_links FOR SELECT USING (true);
CREATE POLICY "homepage_social_links_admin" ON homepage_social_links FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- homepage_stats
ALTER TABLE homepage_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "homepage_stats_public" ON homepage_stats;
DROP POLICY IF EXISTS "homepage_stats_admin" ON homepage_stats;
CREATE POLICY "homepage_stats_public" ON homepage_stats FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_stats_admin" ON homepage_stats FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- joy_actions
ALTER TABLE joy_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "joy_actions_own" ON joy_actions;
CREATE POLICY "joy_actions_own" ON joy_actions FOR ALL USING (user_id = auth.uid());

-- joy_analytics
ALTER TABLE joy_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "joy_analytics_admin" ON joy_analytics;
CREATE POLICY "joy_analytics_admin" ON joy_analytics FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- joy_user_preferences
ALTER TABLE joy_user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "joy_user_preferences_own" ON joy_user_preferences;
CREATE POLICY "joy_user_preferences_own" ON joy_user_preferences FOR ALL USING (user_id = auth.uid());

-- library_borrowings
ALTER TABLE library_borrowings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_borrowings_read" ON library_borrowings;
DROP POLICY IF EXISTS "library_borrowings_admin" ON library_borrowings;
CREATE POLICY "library_borrowings_read" ON library_borrowings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "library_borrowings_admin" ON library_borrowings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- library_resources
ALTER TABLE library_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_resources_public" ON library_resources;
DROP POLICY IF EXISTS "library_resources_admin" ON library_resources;
CREATE POLICY "library_resources_public" ON library_resources FOR SELECT USING (true);
CREATE POLICY "library_resources_admin" ON library_resources FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- login_attempts
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_attempts_admin" ON login_attempts;
CREATE POLICY "login_attempts_admin" ON login_attempts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- login_audit
ALTER TABLE login_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_audit_admin" ON login_audit;
CREATE POLICY "login_audit_admin" ON login_audit FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- mark_sheet_templates
ALTER TABLE mark_sheet_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mark_sheet_templates_own" ON mark_sheet_templates;
DROP POLICY IF EXISTS "mark_sheet_templates_admin" ON mark_sheet_templates;
CREATE POLICY "mark_sheet_templates_own" ON mark_sheet_templates FOR ALL USING (created_by = auth.uid());
CREATE POLICY "mark_sheet_templates_admin" ON mark_sheet_templates FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_own" ON messages;
CREATE POLICY "messages_own" ON messages FOR ALL USING (sender_id = auth.uid());

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- parent_children
ALTER TABLE parent_children ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent_children_read" ON parent_children;
DROP POLICY IF EXISTS "parent_children_admin" ON parent_children;
CREATE POLICY "parent_children_read" ON parent_children FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "parent_children_admin" ON parent_children FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- parent_students
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent_students_read" ON parent_students;
DROP POLICY IF EXISTS "parent_students_admin" ON parent_students;
CREATE POLICY "parent_students_read" ON parent_students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "parent_students_admin" ON parent_students FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- password_history
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "password_history_own" ON password_history;
CREATE POLICY "password_history_own" ON password_history FOR ALL USING (user_id = auth.uid());

-- permission_categories
ALTER TABLE permission_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permission_categories_admin" ON permission_categories;
CREATE POLICY "permission_categories_admin" ON permission_categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- permissions
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissions_admin" ON permissions;
CREATE POLICY "permissions_admin" ON permissions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (id = auth.uid());

-- saved_videos
ALTER TABLE saved_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_videos_own" ON saved_videos;
CREATE POLICY "saved_videos_own" ON saved_videos FOR ALL USING (user_id = auth.uid());

-- staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_public" ON staff;
DROP POLICY IF EXISTS "staff_admin" ON staff;
CREATE POLICY "staff_public" ON staff FOR SELECT USING (true);
CREATE POLICY "staff_admin" ON staff FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- staff_permissions
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_permissions_own" ON staff_permissions;
DROP POLICY IF EXISTS "staff_permissions_admin" ON staff_permissions;
CREATE POLICY "staff_permissions_own" ON staff_permissions FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "staff_permissions_admin" ON staff_permissions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- staff_roles
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_roles_read" ON staff_roles;
DROP POLICY IF EXISTS "staff_roles_admin" ON staff_roles;
CREATE POLICY "staff_roles_read" ON staff_roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "staff_roles_admin" ON staff_roles FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_public" ON students;
DROP POLICY IF EXISTS "students_admin" ON students;
CREATE POLICY "students_public" ON students FOR SELECT USING (true);
CREATE POLICY "students_admin" ON students FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- study_streaks
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "study_streaks_own" ON study_streaks;
CREATE POLICY "study_streaks_own" ON study_streaks FOR ALL USING (student_id = auth.uid());

-- subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_public" ON subjects;
DROP POLICY IF EXISTS "subjects_admin" ON subjects;
CREATE POLICY "subjects_public" ON subjects FOR SELECT USING (true);
CREATE POLICY "subjects_admin" ON subjects FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- suggestions
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suggestions_own" ON suggestions;
CREATE POLICY "suggestions_own" ON suggestions FOR ALL USING (user_id = auth.uid());

-- teacher_mark_sheets
ALTER TABLE teacher_mark_sheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher_mark_sheets_own" ON teacher_mark_sheets;
DROP POLICY IF EXISTS "teacher_mark_sheets_admin" ON teacher_mark_sheets;
CREATE POLICY "teacher_mark_sheets_own" ON teacher_mark_sheets FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "teacher_mark_sheets_admin" ON teacher_mark_sheets FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- teacher_registers
ALTER TABLE teacher_registers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher_registers_own" ON teacher_registers;
DROP POLICY IF EXISTS "teacher_registers_admin" ON teacher_registers;
CREATE POLICY "teacher_registers_own" ON teacher_registers FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "teacher_registers_admin" ON teacher_registers FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- teacher_timetables
ALTER TABLE teacher_timetables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher_timetables_own" ON teacher_timetables;
DROP POLICY IF EXISTS "teacher_timetables_admin" ON teacher_timetables;
CREATE POLICY "teacher_timetables_own" ON teacher_timetables FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "teacher_timetables_admin" ON teacher_timetables FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- timetable
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timetable_read" ON timetable;
DROP POLICY IF EXISTS "timetable_admin" ON timetable;
CREATE POLICY "timetable_read" ON timetable FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "timetable_admin" ON timetable FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_sessions_own" ON user_sessions;
CREATE POLICY "user_sessions_own" ON user_sessions FOR ALL USING (user_id = auth.uid());

-- values_badges
ALTER TABLE values_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "values_badges_own" ON values_badges;
CREATE POLICY "values_badges_own" ON values_badges FOR ALL USING (student_id = auth.uid());

-- vora_attempts
ALTER TABLE vora_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vora_attempts_own" ON vora_attempts;
CREATE POLICY "vora_attempts_own" ON vora_attempts FOR ALL USING (student_id = auth.uid());

-- vora_content
ALTER TABLE vora_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vora_content_public" ON vora_content;
DROP POLICY IF EXISTS "vora_content_own" ON vora_content;
DROP POLICY IF EXISTS "vora_content_admin" ON vora_content;
CREATE POLICY "vora_content_public" ON vora_content FOR SELECT USING (is_public = true);
CREATE POLICY "vora_content_own" ON vora_content FOR ALL USING (uploaded_by = auth.uid());
CREATE POLICY "vora_content_admin" ON vora_content FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- vora_quizzes
ALTER TABLE vora_quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vora_quizzes_admin" ON vora_quizzes;
CREATE POLICY "vora_quizzes_admin" ON vora_quizzes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin'));

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