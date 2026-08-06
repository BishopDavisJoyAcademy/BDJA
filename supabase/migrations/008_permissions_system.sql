-- ============================================================
-- BDJA Platform v4.0 — Permissions System
-- Migration 008: Database-Driven Permissions
-- ============================================================

-- ============================================
-- 1. PERMISSION CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS permission_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES permission_categories(key),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. STAFF PERMISSIONS (junction)
-- ============================================
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_permissions_profile ON staff_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_permission ON staff_permissions(permission_id);

-- ============================================
-- 4. STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  admission_number TEXT UNIQUE,
  grade_level TEXT,
  class_id UUID,
  enrollment_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade_level);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);

-- ============================================
-- 5. STAFF TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  department TEXT,
  designation TEXT,
  join_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_employee ON staff(employee_id);

-- ============================================
-- 6. PARENT-STUDENT LINKS
-- ============================================
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);

-- ============================================
-- 7. SEED PERMISSION CATEGORIES
-- ============================================
INSERT INTO permission_categories (key, name, icon, sort_order) VALUES
  ('academics', 'Academics', 'BookOpen', 1),
  ('finance', 'Finance', 'DollarSign', 2),
  ('communication', 'Communication', 'MessageSquare', 3),
  ('administration', 'Administration', 'Settings', 4),
  ('cms', 'CMS', 'FileText', 5)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 8. SEED PERMISSIONS
-- ============================================
INSERT INTO permissions (key, name, category, description) VALUES
  -- Academics
  ('students.view', 'View Students', 'academics', 'View student records'),
  ('students.manage', 'Manage Students', 'academics', 'Create, edit, and delete student records'),
  ('grades.view', 'View Grades', 'academics', 'View grade reports'),
  ('grades.manage', 'Manage Grades', 'academics', 'Enter and edit grades'),
  ('attendance.view', 'View Attendance', 'academics', 'View attendance records'),
  ('attendance.manage', 'Manage Attendance', 'academics', 'Mark and edit attendance'),
  ('timetable.view', 'View Timetable', 'academics', 'View class timetables'),
  ('timetable.manage', 'Manage Timetable', 'academics', 'Create and edit timetables'),
  ('assignments.view', 'View Assignments', 'academics', 'View assignments'),
  ('assignments.manage', 'Manage Assignments', 'academics', 'Create and grade assignments'),
  -- Finance
  ('fees.view', 'View Fees', 'finance', 'View fee structures and balances'),
  ('fees.manage', 'Manage Fees', 'finance', 'Create fee structures and record payments'),
  ('payments.verify', 'Verify Payments', 'finance', 'Verify and approve fee payments'),
  -- Communication
  ('announcements.broadcast', 'Broadcast Announcements', 'communication', 'Send announcements to users'),
  ('messages.send', 'Send Messages', 'communication', 'Send messages to students, parents, or staff'),
  -- Administration
  ('staff.view', 'View Staff', 'administration', 'View staff directory'),
  ('staff.manage', 'Manage Staff', 'administration', 'Create and manage staff accounts'),
  ('admissions.view', 'View Admissions', 'administration', 'View admission applications'),
  ('admissions.manage', 'Manage Admissions', 'administration', 'Process admission applications'),
  ('calendar.view', 'View Calendar', 'administration', 'View school calendar'),
  ('calendar.manage', 'Manage Calendar', 'administration', 'Create and edit calendar events'),
  ('library.view', 'View Library', 'administration', 'View library resources'),
  ('library.manage', 'Manage Library', 'administration', 'Manage library catalog and borrowings'),
  ('vora.view', 'View VORA', 'administration', 'View VORA learning resources'),
  ('vora.manage', 'Manage VORA', 'administration', 'Upload and manage VORA content'),
  ('analytics.view', 'View Analytics', 'administration', 'View system analytics and reports'),
  ('audit.view', 'View Audit Logs', 'administration', 'View system audit logs'),
  ('settings.manage', 'Manage Settings', 'administration', 'Configure system settings'),
  -- CMS
  ('pages.edit', 'Edit CMS Pages', 'cms', 'Edit public website pages')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 9. RLS FOR NEW TABLES
-- ============================================
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_public_read" ON permissions FOR SELECT USING (true);
CREATE POLICY "perm_categories_public_read" ON permission_categories FOR SELECT USING (true);

CREATE POLICY "staff_permissions_own" ON staff_permissions FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "staff_permissions_admin" ON staff_permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'super_admin'))
);

CREATE POLICY "students_own" ON students FOR SELECT USING (id = auth.uid());
CREATE POLICY "students_admin" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'super_admin', 'teacher'))
);

CREATE POLICY "staff_own" ON staff FOR SELECT USING (id = auth.uid());
CREATE POLICY "staff_admin" ON staff FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'super_admin'))
);

CREATE POLICY "parent_students_own" ON parent_students FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "parent_students_admin" ON parent_students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal', 'super_admin'))
);

-- ============================================
-- 10. GRANT SERVICE ROLE
-- ============================================
GRANT ALL ON permissions TO service_role;
GRANT ALL ON staff_permissions TO service_role;
GRANT ALL ON permission_categories TO service_role;
GRANT ALL ON students TO service_role;
GRANT ALL ON staff TO service_role;
GRANT ALL ON parent_students TO service_role;
