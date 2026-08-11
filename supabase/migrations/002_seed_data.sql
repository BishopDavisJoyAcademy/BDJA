-- ============================================================
-- BDJA Platform — Seed Data (v4.0)
-- Corrected to match the complete 61-table schema
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ============================================
-- PERMISSION CATEGORIES
-- ============================================

INSERT INTO permission_categories (key, name, icon, sort_order) VALUES
 ('admin', 'Administration', 'shield', 1),
 ('academics', 'Academics', 'book-open', 2),
 ('finance', 'Finance', 'dollar-sign', 3),
 ('communication', 'Communication', 'message-circle', 4),
 ('content', 'Content', 'file-text', 5),
 ('system', 'System', 'settings', 6)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- PERMISSIONS
-- ============================================

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
 ('suggestions.manage', 'Manage Suggestions', 'system', 'Manage user suggestions and feedback'),
 ('suggestions.view', 'View Suggestions', 'system', 'View suggestions'),
 ('impersonate', 'Impersonate Users', 'admin', 'Log in as another user for support'),
 ('god.mode', 'God Mode', 'admin', 'Full unrestricted access to all features'),
 ('vora.manage', 'Manage Vora', 'content', 'Manage Vora educational content')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- DEFAULT CAMPUS
-- ============================================

INSERT INTO campuses (name, location, phone, email)
VALUES ('Main Campus', 'Nairobi, Kenya', '+254 700 000000', 'info@bdja.ac.ke')
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT GRADE LEVELS
-- ============================================

INSERT INTO grade_levels (name, sort_order) VALUES
 ('Playgroup', 1),
 ('Pre-Primary 1', 2),
 ('Pre-Primary 2', 3),
 ('Grade 1', 4),
 ('Grade 2', 5),
 ('Grade 3', 6),
 ('Grade 4', 7),
 ('Grade 5', 8),
 ('Grade 6', 9),
 ('Grade 7', 10),
 ('Grade 8', 11),
 ('Grade 9', 12)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- DEFAULT SUBJECTS
-- ============================================

INSERT INTO subjects (name, code, description) VALUES
 ('Mathematics', 'MATH', 'Core mathematics subject'),
 ('English', 'ENG', 'English language and literature'),
 ('Kiswahili', 'KIS', 'Kiswahili language'),
 ('Science', 'SCI', 'General science'),
 ('Social Studies', 'SST', 'Social studies and geography'),
 ('Religious Education', 'RE', 'Christian religious education'),
 ('Creative Arts', 'ART', 'Art and craft'),
 ('Physical Education', 'PE', 'Physical education and sports'),
 ('Computer Studies', 'COMP', 'Computer literacy and programming')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- DEFAULT CMS PAGES
-- ============================================

INSERT INTO cms_pages (slug, title, content, meta_description, is_published) VALUES
 ('about', 'About BDJA', '<h2>About Bishop Davis Joy Academy</h2><p>Welcome to BDJA, a place of excellence in education.</p>', 'Learn about Bishop Davis Joy Academy', true),
 ('admissions', 'Admissions', '<h2>Admissions</h2><p>Join our family of learners. Apply today!</p>', 'Apply to Bishop Davis Joy Academy', true),
 ('contact', 'Contact Us', '<h2>Contact Us</h2><p>Email: info@bdja.ac.ke<br>Phone: +254 700 000000</p>', 'Contact Bishop Davis Joy Academy', true),
 ('policies', 'School Policies', '<h2>School Policies</h2><p>Our policies ensure a safe learning environment.</p>', 'School policies at BDJA', true),
 ('faqs', 'FAQs', '<h2>Frequently Asked Questions</h2><p>Find answers to common questions here.</p>', 'Frequently asked questions about BDJA', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- DEFAULT HOMEPAGE CONTENT
-- ============================================

INSERT INTO homepage_stats (label, value, icon, sort_order, is_active) VALUES
 ('Students', '500+', 'users', 1, true),
 ('Teachers', '50+', 'graduation-cap', 2, true),
 ('Years of Excellence', '10+', 'award', 3, true),
 ('Subjects', '15+', 'book-open', 4, true)
ON CONFLICT DO NOTHING;

INSERT INTO homepage_carousel (title, subtitle, image_url, button_text, button_link, sort_order, is_active) VALUES
 ('Welcome to BDJA', 'Excellence in Education', NULL, 'Learn More', '/about', 1, true),
 ('Join Our Family', 'Admissions Open', NULL, 'Apply Now', '/admissions', 2, true)
ON CONFLICT DO NOTHING;

INSERT INTO homepage_director_message (director_name, title, message, is_active) VALUES
 ('Director Name', 'A Message from the Director', 'Welcome to Bishop Davis Joy Academy...', true)
ON CONFLICT DO NOTHING;

INSERT INTO homepage_notices (title, content, priority, is_active) VALUES
 ('Welcome to the New Term', 'The new academic term begins soon. Get ready!', 1, true),
 ('School Fees Reminder', 'Please ensure all fees are paid by the deadline.', 2, true)
ON CONFLICT DO NOTHING;
