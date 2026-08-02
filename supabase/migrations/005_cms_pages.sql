-- CMS Pages for editable public content
CREATE TABLE cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  meta_description TEXT,
  meta_keywords TEXT,
  is_published BOOLEAN DEFAULT true,
  last_edited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can read published pages
CREATE POLICY "cms_pages_public_read" ON cms_pages
  FOR SELECT USING (is_published = true);

-- Admins can manage all
CREATE POLICY "cms_pages_admin_all" ON cms_pages
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('principal', 'super_admin')
  ));

-- Insert default pages
INSERT INTO cms_pages (slug, title, content, meta_description, is_published) VALUES
('about', 'About Us', '<p>Welcome to Bishop Davis Joy Academy. We are committed to nurturing confident, curious and compassionate learners from Playgroup to Grade 6.</p>', 'Learn about Bishop Davis Joy Academy - our mission, vision, and values.', true),
('admissions', 'Admissions', '<p>Join Bishop Davis Joy Academy and give your child the gift of quality education. We accept admissions for Playgroup through Grade 6.</p><p>Contact us at 0708 449 158 or bishopdavisjoyacademy@gmail.com to schedule a school tour.</p>', 'Admission information for Bishop Davis Joy Academy - Playgroup to Grade 6.', true),
('contact', 'Contact Us', '<p>We would love to hear from you. Reach out to us through any of the channels below.</p><p><strong>Phone:</strong> 0708 449 158<br><strong>Email:</strong> bishopdavisjoyacademy@gmail.com<br><strong>Address:</strong> Near Peaks Hotel, Nanyuki, Kenya</p>', 'Contact Bishop Davis Joy Academy - phone, email, and location.', true),
('policies', 'School Policies', '<p>Our school policies ensure a safe, nurturing, and productive learning environment for all students.</p><p>Policies cover attendance, behavior, uniform, health & safety, and more.</p>', 'School policies at Bishop Davis Joy Academy.', true),
('faqs', 'Frequently Asked Questions', '<p><strong>What grades do you offer?</strong><br>We offer Playgroup, PP1, PP2, and Grade 1 through Grade 6.</p><p><strong>What curriculum do you follow?</strong><br>We follow the Competency Based Curriculum (CBC).</p><p><strong>How do I apply?</strong><br>Contact us at 0708 449 158 or visit our admissions office.</p>', 'Frequently asked questions about Bishop Davis Joy Academy.', true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_cms_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_pages_updated_at_trigger
  BEFORE UPDATE ON cms_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_pages_updated_at();
