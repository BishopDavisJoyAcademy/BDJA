-- BDJA Migration 008: Permissions System v2 (FIXED)
-- Uses user_id (not recipient_id) to match 001_initial_schema

-- ============================================
-- 1. Permission Categories
-- ============================================
CREATE TABLE IF NOT EXISTS permission_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Permissions
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES permission_categories(key) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. Staff Permissions (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, permission_id)
);

-- ============================================
-- 4. Enable RLS
-- ============================================
ALTER TABLE permission_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies
-- ============================================
CREATE POLICY "Anyone can read permission categories" ON permission_categories
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read permissions" ON permissions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage staff permissions" ON staff_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.user_category = 'admin'
    )
  );

CREATE POLICY "Staff can view own permissions" ON staff_permissions
  FOR SELECT USING (profile_id = auth.uid());

-- ============================================
-- 6. Helper Functions (FIXED: use user_id not recipient_id)
-- ============================================
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins always have all permissions
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin') THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 
    FROM staff_permissions sp
    JOIN permissions p ON p.id = sp.permission_id
    WHERE sp.profile_id = p_user_id AND p.key = p_permission_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_key TEXT) AS $$
BEGIN
  -- Admins get all permission keys
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND user_category = 'admin') THEN
    RETURN QUERY SELECT p.key FROM permissions p;
  END IF;
  RETURN QUERY
  SELECT p.key 
  FROM staff_permissions sp
  JOIN permissions p ON p.id = sp.permission_id
  WHERE sp.profile_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Notification trigger (FIXED: use user_id)
-- ============================================
CREATE OR REPLACE FUNCTION notify_user_on_permission_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, read, created_at)
  VALUES (
    NEW.profile_id,
    'Permission Updated',
    'Your access permissions have been updated by an administrator.',
    'permission',
    false,
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_permission_change_notification ON staff_permissions;
CREATE TRIGGER trg_permission_change_notification
  AFTER INSERT OR UPDATE ON staff_permissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_permission_change();

-- ============================================
-- 8. Seed default permission categories
-- ============================================
INSERT INTO permission_categories (key, name, icon, sort_order) VALUES
  ('academic', 'Academic', 'GraduationCap', 1),
  ('administration', 'Administration', 'Shield', 2),
  ('finance', 'Finance', 'Wallet', 3),
  ('library', 'Library', 'Library', 4),
  ('content', 'Content', 'FileText', 5),
  ('communication', 'Communication', 'MessageSquare', 6)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 9. Seed default permissions
-- ============================================
INSERT INTO permissions (key, name, category, description) VALUES
  ('grades.view', 'View Grades', 'academic', 'View student grades'),
  ('grades.manage', 'Manage Grades', 'academic', 'Enter and edit student grades'),
  ('attendance.view', 'View Attendance', 'academic', 'View attendance records'),
  ('attendance.manage', 'Manage Attendance', 'academic', 'Mark and edit attendance'),
  ('timetable.view', 'View Timetable', 'academic', 'View class schedules'),
  ('timetable.manage', 'Manage Timetable', 'academic', 'Create and edit timetables'),
  ('assignments.view', 'View Assignments', 'academic', 'View assignments'),
  ('assignments.manage', 'Manage Assignments', 'academic', 'Create and manage assignments'),
  ('admin.access', 'Admin Access', 'administration', 'Full admin dashboard access'),
  ('staff.manage', 'Manage Staff', 'administration', 'Create and manage staff accounts'),
  ('students.manage', 'Manage Students', 'administration', 'Create and manage student accounts'),
  ('analytics.view', 'View Analytics', 'administration', 'View school analytics'),
  ('audit.view', 'View Audit Logs', 'administration', 'View system audit logs'),
  ('settings.manage', 'Manage Settings', 'administration', 'Configure platform settings'),
  ('fees.view', 'View Fees', 'finance', 'View fee records'),
  ('fees.manage', 'Manage Fees', 'finance', 'Manage fee payments and balances'),
  ('payments.verify', 'Verify Payments', 'finance', 'Verify and confirm payments'),
  ('library.view', 'View Library', 'library', 'View library catalog'),
  ('library.manage', 'Manage Library', 'library', 'Manage library books and borrowing'),
  ('vora.view', 'View VORA', 'content', 'View learning videos'),
  ('vora.manage', 'Manage VORA', 'content', 'Manage VORA content'),
  ('calendar.view', 'View Calendar', 'content', 'View school calendar'),
  ('calendar.manage', 'Manage Calendar', 'content', 'Manage calendar events'),
  ('pages.edit', 'Edit Pages', 'content', 'Edit CMS pages'),
  ('content.manage', 'Manage Content', 'content', 'Manage platform content'),
  ('admissions.view', 'View Admissions', 'administration', 'View admission applications'),
  ('admissions.manage', 'Manage Admissions', 'administration', 'Process admission applications'),
  ('messages.send', 'Send Messages', 'communication', 'Send internal messages'),
  ('impersonate.users', 'Impersonate Users', 'administration', 'Preview portals as other users (God Mode)'),
  ('suggestions.manage', 'Manage Suggestions', 'administration', 'Review and manage user suggestions')
ON CONFLICT (key) DO NOTHING;
