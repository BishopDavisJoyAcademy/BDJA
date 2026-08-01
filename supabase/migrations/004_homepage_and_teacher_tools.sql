-- Migration 004_homepage_and_teacher_tools.sql
-- Run this after the existing migrations

-- ============================================
-- HOMEPAGE CONTENT TABLES (Admin-managed)
-- ============================================

-- Carousel slides for hero section
CREATE TABLE IF NOT EXISTS homepage_carousel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image_url TEXT,
  button_text TEXT DEFAULT 'Discover More',
  button_link TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Director's message (single row, but versioned)
CREATE TABLE IF NOT EXISTS homepage_director_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  director_name TEXT NOT NULL,
  director_title TEXT NOT NULL DEFAULT 'Director',
  message TEXT NOT NULL,
  director_photo_url TEXT,
  signature_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notice board items
CREATE TABLE IF NOT EXISTS homepage_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  notice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  icon_type TEXT DEFAULT 'document',
  is_pinned BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Latest news
CREATE TABLE IF NOT EXISTS homepage_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  news_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT DEFAULT 'general',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- School stats counters
CREATE TABLE IF NOT EXISTS homepage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grade levels display config
CREATE TABLE IF NOT EXISTS homepage_grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon_filename TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quick links top bar
CREATE TABLE IF NOT EXISTS homepage_quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_name TEXT,
  target_audience TEXT DEFAULT 'all',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Footer links
CREATE TABLE IF NOT EXISTS homepage_footer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Social media links
CREATE TABLE IF NOT EXISTS homepage_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CAMPUS MANAGEMENT (Seed with initial data)
-- ============================================

-- Campuses table already exists in 001_initial_schema.sql
-- Seed initial campuses
INSERT INTO campuses (name, location, phone, email) VALUES
  ('Faiba Campus', 'Near Peaks Hotel, Nanyuki–Nturukuma, Kenya', '0708 449 158', 'bishopdavisjoyacademy@gmail.com'),
  ('Ngaridari Campus', 'Ngaridari, Meru, Kenya', '0708 449 158', 'bishopdavisjoyacademy@gmail.com')
ON CONFLICT DO NOTHING;

-- ============================================
-- TEACHER TOOLS — Flexible Timetables
-- ============================================

-- Teacher-created timetable layouts (flexible rows/columns)
CREATE TABLE IF NOT EXISTS teacher_timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  layout_config JSONB NOT NULL DEFAULT '{"rows":[],"columns":[],"slots":[]}',
  is_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Student registers (attendance registers)
CREATE TABLE IF NOT EXISTS teacher_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  register_date DATE NOT NULL DEFAULT CURRENT_DATE,
  layout_config JSONB NOT NULL DEFAULT '{"columns":[],"students":[]}',
  entries JSONB NOT NULL DEFAULT '[]',
  is_template BOOLEAN DEFAULT false,
  template_name TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mark sheets / grade books
CREATE TABLE IF NOT EXISTS teacher_mark_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  layout_config JSONB NOT NULL DEFAULT '{"columns":[],"students":[]}',
  entries JSONB NOT NULL DEFAULT '[]',
  max_score INTEGER DEFAULT 100,
  is_template BOOLEAN DEFAULT false,
  template_name TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mark sheet templates (created by headteacher/authorized staff)
CREATE TABLE IF NOT EXISTS mark_sheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  grade_levels TEXT[] NOT NULL,
  layout_config JSONB NOT NULL DEFAULT '{"columns":[]}',
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SEED HOMEPAGE DEFAULT DATA
-- ============================================

-- Seed default stats
INSERT INTO homepage_stats (label, value, icon_name, display_order) VALUES
  ('Happy Learners', '500+', 'users', 1),
  ('Dedicated Staff', '40+', 'user', 2),
  ('Years of Excellence', '10+', 'building', 3),
  ('Holistic Learning Approach', '', 'book-open', 4)
ON CONFLICT DO NOTHING;

-- Seed grade levels
INSERT INTO homepage_grade_levels (grade_key, display_name, icon_filename, description, display_order) VALUES
  ('playgroup', 'Playgroup', 'playgroup-icon.png', 'Ages 2-3', 1),
  ('pp1', 'Pre-Primary 1', 'pp1-icon.png', 'Ages 3-4', 2),
  ('pp2', 'Pre-Primary 2', 'pp2-icon.png', 'Ages 4-5', 3),
  ('grade1', 'Grade 1', 'grade1-icon.png', 'Ages 5-6', 4),
  ('grade2', 'Grade 2', 'grade2-icon.png', 'Ages 6-7', 5),
  ('grade3', 'Grade 3', 'grade3-icon.png', 'Ages 7-8', 6),
  ('grade4', 'Grade 4', 'grade4-icon.png', 'Ages 8-9', 7),
  ('grade5', 'Grade 5', 'grade5-icon.png', 'Ages 9-10', 8),
  ('grade6', 'Grade 6', 'grade6-icon.png', 'Ages 10-11', 9)
ON CONFLICT DO NOTHING;

-- Seed quick links
INSERT INTO homepage_quick_links (label, url, icon_name, target_audience, display_order) VALUES
  ('Student/Staff Email', 'https://mail.google.com', 'mail', 'all', 1),
  ('VORA', '/vora', 'book-open', 'all', 2),
  ('Student Portal', '/login?portal=student', 'graduation-cap', 'students', 3),
  ('Staff Portal', '/login?portal=staff', 'users', 'staff', 4),
  ('Library', '/library', 'library', 'all', 5),
  ('Help Desk', '/help', 'help-circle', 'all', 6),
  ('Downloads', '/downloads', 'download', 'all', 7)
ON CONFLICT DO NOTHING;

-- Seed footer links
INSERT INTO homepage_footer_links (section, label, url, display_order) VALUES
  ('QUICK LINKS', 'About Us', '/about', 1),
  ('QUICK LINKS', 'Academics', '/academics', 2),
  ('QUICK LINKS', 'Admissions', '/admissions', 3),
  ('QUICK LINKS', 'Students', '/students', 4),
  ('QUICK LINKS', 'News & Events', '/news-events', 5),
  ('QUICK LINKS', 'Contact Us', '/contact', 6),
  ('STUDENT PORTAL', 'VORA', '/vora', 1),
  ('STUDENT PORTAL', 'Student Email', 'https://mail.google.com', 2),
  ('STUDENT PORTAL', 'Student Portal', '/login?portal=student', 3),
  ('STUDENT PORTAL', 'Library', '/library', 4),
  ('STUDENT PORTAL', 'Help Desk', '/help', 5),
  ('STUDENT PORTAL', 'Downloads', '/downloads', 6),
  ('RESOURCES', 'Downloads', '/downloads', 1),
  ('RESOURCES', 'Policies', '/policies', 2),
  ('RESOURCES', 'Calendar', '/calendar', 3),
  ('RESOURCES', 'Photo Gallery', '/gallery', 4),
  ('RESOURCES', 'FAQs', '/faqs', 5)
ON CONFLICT DO NOTHING;

-- Seed social links
INSERT INTO homepage_social_links (platform, url, display_order) VALUES
  ('facebook', 'https://facebook.com/bdja', 1),
  ('twitter', 'https://twitter.com/bdja', 2),
  ('instagram', 'https://instagram.com/bdja', 3),
  ('youtube', 'https://youtube.com/bdja', 4)
ON CONFLICT DO NOTHING;

-- Seed default director message
INSERT INTO homepage_director_message (director_name, director_title, message, is_active) VALUES
  ('Mr. John Doe', 'Director', 'Welcome to Bishop Davis Joy Academy Playgroup to Grade 6. We are committed to nurturing confident, curious and compassionate learners.', true)
ON CONFLICT DO NOTHING;

-- Seed default carousel
INSERT INTO homepage_carousel (title, subtitle, description, button_text, button_link, display_order, is_active) VALUES
  ('A Happy Beginning', 'for a Bright Future', 'Providing a safe, nurturing and stimulating environment where children grow, learn and shine.', 'Discover More', '/about', 1, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

ALTER TABLE homepage_carousel ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_director_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_quick_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_footer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_mark_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mark_sheet_templates ENABLE ROW LEVEL SECURITY;

-- Public read policies for homepage content
CREATE POLICY "Public read homepage_carousel" ON homepage_carousel FOR SELECT USING (is_active = true);
CREATE POLICY "Public read director_message" ON homepage_director_message FOR SELECT USING (is_active = true);
CREATE POLICY "Public read notices" ON homepage_notices FOR SELECT USING (is_active = true);
CREATE POLICY "Public read news" ON homepage_news FOR SELECT USING (is_active = true);
CREATE POLICY "Public read stats" ON homepage_stats FOR SELECT USING (is_active = true);
CREATE POLICY "Public read grade_levels" ON homepage_grade_levels FOR SELECT USING (is_active = true);
CREATE POLICY "Public read quick_links" ON homepage_quick_links FOR SELECT USING (is_active = true);
CREATE POLICY "Public read footer_links" ON homepage_footer_links FOR SELECT USING (is_active = true);
CREATE POLICY "Public read social_links" ON homepage_social_links FOR SELECT USING (is_active = true);

-- Admin write policies
CREATE POLICY "Admin manage homepage_carousel" ON homepage_carousel FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);
CREATE POLICY "Admin manage director_message" ON homepage_director_message FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);
CREATE POLICY "Admin manage notices" ON homepage_notices FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);
CREATE POLICY "Admin manage news" ON homepage_news FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);
CREATE POLICY "Admin manage stats" ON homepage_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);
CREATE POLICY "Admin manage grade_levels" ON homepage_grade_levels FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);
CREATE POLICY "Admin manage quick_links" ON homepage_quick_links FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);
CREATE POLICY "Admin manage footer_links" ON homepage_footer_links FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);
CREATE POLICY "Admin manage social_links" ON homepage_social_links FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);

-- Teacher tools policies
CREATE POLICY "Teachers manage own timetables" ON teacher_timetables FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "Teachers manage own registers" ON teacher_registers FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "Teachers manage own mark_sheets" ON teacher_mark_sheets FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "Public read mark_templates" ON mark_sheet_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Headteacher manage templates" ON mark_sheet_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('principal','super_admin'))
);

-- Cross-campus access for super_admin
CREATE POLICY "Super admin cross-campus" ON campuses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
