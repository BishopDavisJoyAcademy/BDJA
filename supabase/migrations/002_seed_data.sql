-- Seed default permission categories and permissions
INSERT INTO permission_categories (key, name, icon, sort_order) VALUES
  ('admin', 'Administration', 'shield', 1),
  ('academics', 'Academics', 'book-open', 2),
  ('finance', 'Finance', 'dollar-sign', 3),
  ('communication', 'Communication', 'message-circle', 4),
  ('content', 'Content', 'file-text', 5),
  ('system', 'System', 'settings', 6)
ON CONFLICT (key) DO NOTHING;

INSERT INTO permissions (key, name, category, description) VALUES
  ('admin.access', 'Full Admin Access', 'admin', 'Complete platform administration'),
  ('staff.manage', 'Manage Staff', 'admin', 'Create, edit, and deactivate staff accounts'),
  ('students.manage', 'Manage Students', 'admin', 'Create, edit, and manage student records'),
  ('parents.manage', 'Manage Parents', 'admin', 'Manage parent accounts and links'),
  ('grades.manage', 'Manage Grades', 'academics', 'Enter and edit student grades'),
  ('grades.view', 'View Grades', 'academics', 'View student grade reports'),
  ('attendance.manage', 'Manage Attendance', 'academics', 'Record and edit attendance'),
  ('attendance.view', 'View Attendance', 'academics', 'View attendance records'),
  ('timetable.manage', 'Manage Timetables', 'academics', 'Create and edit timetables'),
  ('timetable.view', 'View Timetables', 'academics', 'View class timetables'),
  ('assignments.manage', 'Manage Assignments', 'academics', 'Create and grade assignments'),
  ('assignments.view', 'View Assignments', 'academics', 'View and submit assignments'),
  ('calendar.manage', 'Manage Calendar', 'academics', 'Add and edit calendar events'),
  ('calendar.view', 'View Calendar', 'academics', 'View school calendar'),
  ('fees.manage', 'Manage Fees', 'finance', 'Record and manage fee payments'),
  ('fees.view', 'View Fees', 'finance', 'View fee statements'),
  ('library.manage', 'Manage Library', 'system', 'Add and manage library books'),
  ('library.view', 'View Library', 'system', 'Browse library catalog'),
  ('admissions.manage', 'Manage Admissions', 'admin', 'Process admission applications'),
  ('admissions.view', 'View Admissions', 'admin', 'View admission status'),
  ('messages.send', 'Send Messages', 'communication', 'Send messages to users'),
  ('messages.view', 'View Messages', 'communication', 'Read received messages'),
  ('notifications.send', 'Send Notifications', 'communication', 'Send platform notifications'),
  ('notifications.view', 'View Notifications', 'communication', 'View notifications'),
  ('analytics.view', 'View Analytics', 'admin', 'View platform analytics and reports'),
  ('audit.view', 'View Audit Logs', 'admin', 'View security audit logs'),
  ('content.manage', 'Manage Content', 'content', 'Manage Vora educational content'),
  ('content.view', 'View Content', 'content', 'View educational content'),
  ('pages.edit', 'Edit Pages', 'content', 'Edit CMS pages'),
  ('pages.view', 'View Pages', 'content', 'View CMS pages'),
  ('suggestions.manage', 'Manage Suggestions', 'system', 'Review and respond to suggestions'),
  ('suggestions.view', 'View Suggestions', 'system', 'View suggestions'),
  ('settings.manage', 'Manage Settings', 'system', 'Configure platform settings'),
  ('settings.view', 'View Settings', 'system', 'View platform settings'),
  ('impersonate.users', 'Impersonate Users', 'admin', 'Impersonate other user accounts'),
  ('campuses.manage', 'Manage Campuses', 'admin', 'Add and manage school campuses'),
  ('subjects.manage', 'Manage Subjects', 'academics', 'Add and manage subjects'),
  ('classes.manage', 'Manage Classes', 'academics', 'Add and manage classes')
ON CONFLICT (key) DO NOTHING;

-- Create default campus
INSERT INTO campuses (name, location) VALUES
  ('Main Campus', 'Nairobi, Kenya')
ON CONFLICT DO NOTHING;
