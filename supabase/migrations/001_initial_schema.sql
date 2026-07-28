-- Enable RLS

-- Campuses
CREATE TABLE campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (profiles linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('student','parent','teacher','class_prefect','bursar','librarian','principal','super_admin')),
  campus_id UUID REFERENCES campuses(id),
  is_active BOOLEAN DEFAULT true,
  password_changed BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Staff Roles & Permissions
CREATE TABLE staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher','class_prefect','bursar','librarian','principal','super_admin')),
  campus_id UUID REFERENCES campuses(id),
  permissions JSONB NOT NULL DEFAULT '{}',
  assigned_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Classes / Streams
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL CHECK (grade_level IN ('playgroup','pp1','pp2','grade1','grade2','grade3','grade4','grade5','grade6')),
  stream TEXT,
  class_teacher_id UUID REFERENCES profiles(id),
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admission_number TEXT NOT NULL UNIQUE,
  class_id UUID NOT NULL REFERENCES classes(id),
  campus_id UUID NOT NULL REFERENCES campuses(id),
  house_team TEXT,
  barcode TEXT,
  date_of_birth DATE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','transferred','graduated')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parent-Child Links
CREATE TABLE parent_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'guardian',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  grade_levels TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Class-Subject assignments
CREATE TABLE class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id),
  UNIQUE(class_id, subject_id)
);

-- Timetable (staff-editable, no hardcoded data)
CREATE TABLE timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID REFERENCES profiles(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  topic TEXT,
  campus_id UUID NOT NULL REFERENCES campuses(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar Events (staff-editable)
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  event_type TEXT NOT NULL CHECK (event_type IN ('academic','sports','religious','meeting','holiday','examination','announcement')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','students','parents','staff','specific_grade')),
  target_grade TEXT,
  campus_id UUID REFERENCES campuses(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  marked_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, class_id, subject_id, date)
);

-- CBC Assessments / Grades
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  strand TEXT NOT NULL,
  sub_strand TEXT NOT NULL,
  specific_learning_outcome TEXT,
  performance_level TEXT NOT NULL CHECK (performance_level IN ('beginning','developing','competent','exceeds')),
  score NUMERIC,
  max_score NUMERIC DEFAULT 100,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  assessed_by UUID NOT NULL REFERENCES profiles(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assignments
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  attachments JSONB DEFAULT '[]',
  due_date TIMESTAMPTZ,
  rubric JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assignment Submissions
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content TEXT,
  attachments JSONB DEFAULT '[]',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('pending','submitted','graded','late')),
  grade JSONB,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMPTZ,
  UNIQUE(assignment_id, student_id)
);

-- VORA Content
CREATE TABLE vora_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  transcript TEXT,
  summary TEXT,
  captions JSONB DEFAULT '[]',
  grade_level TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  strand TEXT,
  sub_strand TEXT,
  specific_learning_outcome TEXT,
  visibility TEXT DEFAULT 'class' CHECK (visibility IN ('class','campus','cross_campus')),
  class_id UUID REFERENCES classes(id),
  campus_id UUID NOT NULL REFERENCES campuses(id),
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- VORA Checkpoint Quizzes
CREATE TABLE vora_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vora_id UUID NOT NULL REFERENCES vora_content(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- VORA Quiz Attempts
CREATE TABLE vora_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vora_id UUID NOT NULL REFERENCES vora_content(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score INTEGER,
  answers JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Library Resources
CREATE TABLE library_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf','epub','audio','video','image','physical')),
  file_url TEXT,
  cover_url TEXT,
  subject_id UUID REFERENCES subjects(id),
  grade_levels TEXT[],
  campus_id UUID REFERENCES campuses(id),
  available_copies INTEGER DEFAULT 1,
  total_copies INTEGER DEFAULT 1,
  borrowed_by JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Library Borrowings
CREATE TABLE library_borrowings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES library_resources(id),
  student_id UUID REFERENCES students(id),
  staff_id UUID REFERENCES profiles(id),
  borrowed_at TIMESTAMPTZ DEFAULT now(),
  due_date DATE NOT NULL,
  returned_at TIMESTAMPTZ,
  status TEXT DEFAULT 'borrowed' CHECK (status IN ('borrowed','returned','overdue'))
);

-- Fee Structures (total is regular column, not generated)
CREATE TABLE fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID NOT NULL REFERENCES campuses(id),
  grade_level TEXT NOT NULL,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  tuition NUMERIC NOT NULL DEFAULT 0,
  activity_fees NUMERIC DEFAULT 0,
  uniform NUMERIC DEFAULT 0,
  transport NUMERIC DEFAULT 0,
  other_fees JSONB DEFAULT '[]',
  total NUMERIC DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fee Payments
CREATE TABLE fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank','mpesa','cash','other')),
  transaction_ref TEXT,
  receipt_number TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admissions
CREATE TABLE admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  grade_applied TEXT NOT NULL,
  campus_id UUID NOT NULL REFERENCES campuses(id),
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  documents JSONB DEFAULT '[]',
  status TEXT DEFAULT 'received' CHECK (status IN ('received','review','interview','accepted','enrolled','rejected')),
  admission_number TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  subject TEXT,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL CHECK (type IN ('general','academic','fee','attendance','assignment','calendar','emergency')),
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Character Reports / Values
CREATE TABLE character_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  integrity TEXT CHECK (integrity IN ('beginning','developing','competent','exceeds')),
  discipline TEXT CHECK (discipline IN ('beginning','developing','competent','exceeds')),
  respect TEXT CHECK (respect IN ('beginning','developing','competent','exceeds')),
  responsibility TEXT CHECK (responsibility IN ('beginning','developing','competent','exceeds')),
  teamwork TEXT CHECK (teamwork IN ('beginning','developing','competent','exceeds')),
  compassion TEXT CHECK (compassion IN ('beginning','developing','competent','exceeds')),
  commitment TEXT CHECK (commitment IN ('beginning','developing','competent','exceeds')),
  excellence TEXT CHECK (excellence IN ('beginning','developing','competent','exceeds')),
  teacher_notes TEXT,
  assessed_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Values Badges
CREATE TABLE values_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('integrity','discipline','respect','responsibility','teamwork','compassion','commitment','excellence')),
  awarded_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Study Streaks
CREATE TABLE study_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_campus ON profiles(campus_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_admission ON students(admission_number);
CREATE INDEX idx_timetable_class ON timetable(class_id);
CREATE INDEX idx_timetable_day ON timetable(day_of_week);
CREATE INDEX idx_calendar_dates ON calendar_events(start_date, end_date);
CREATE INDEX idx_attendance_student ON attendance(student_id, date);
CREATE INDEX idx_assessments_student ON assessments(student_id, term, academic_year);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, read);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vora_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_reports ENABLE ROW LEVEL SECURITY;

-- Basic RLS: users see own campus data (simplified; app-level filtering for complex cases)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "students_select" ON students FOR SELECT USING (true);
CREATE POLICY "students_insert" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "students_update" ON students FOR UPDATE USING (true);

CREATE POLICY "timetable_select" ON timetable FOR SELECT USING (true);
CREATE POLICY "timetable_insert" ON timetable FOR INSERT WITH CHECK (true);
CREATE POLICY "timetable_update" ON timetable FOR UPDATE USING (true);

CREATE POLICY "calendar_select" ON calendar_events FOR SELECT USING (true);
CREATE POLICY "calendar_insert" ON calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "calendar_update" ON calendar_events FOR UPDATE USING (true);

CREATE POLICY "assessments_select" ON assessments FOR SELECT USING (true);
CREATE POLICY "assessments_insert" ON assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "assessments_update" ON assessments FOR UPDATE USING (true);

CREATE POLICY "assignments_select" ON assignments FOR SELECT USING (true);
CREATE POLICY "assignments_insert" ON assignments FOR INSERT WITH CHECK (true);

CREATE POLICY "assignment_submissions_select" ON assignment_submissions FOR SELECT USING (true);
CREATE POLICY "assignment_submissions_insert" ON assignment_submissions FOR INSERT WITH CHECK (true);

CREATE POLICY "vora_select" ON vora_content FOR SELECT USING (true);
CREATE POLICY "vora_insert" ON vora_content FOR INSERT WITH CHECK (true);

CREATE POLICY "library_select" ON library_resources FOR SELECT USING (true);
CREATE POLICY "library_insert" ON library_resources FOR INSERT WITH CHECK (true);

CREATE POLICY "fee_payments_select" ON fee_payments FOR SELECT USING (true);
CREATE POLICY "fee_payments_insert" ON fee_payments FOR INSERT WITH CHECK (true);

CREATE POLICY "messages_select" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "character_select" ON character_reports FOR SELECT USING (true);
CREATE POLICY "character_insert" ON character_reports FOR INSERT WITH CHECK (true);

-- Function: auto-generate admission number (FIXED)
CREATE OR REPLACE FUNCTION generate_admission_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX((SPLIT_PART(admission_number, '/', 3))::INTEGER), 0) + 1
  INTO next_num
  FROM admissions
  WHERE admission_number LIKE 'BDJA/' || year_str || '/%';

  NEW.admission_number := 'BDJA/' || year_str || '/' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admission_number
BEFORE INSERT ON admissions
FOR EACH ROW
WHEN (NEW.admission_number IS NULL)
EXECUTE FUNCTION generate_admission_number();

-- Function: update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_timetable_updated_at BEFORE UPDATE ON timetable FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_calendar_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_vora_updated_at BEFORE UPDATE ON vora_content FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON fee_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_admissions_updated_at BEFORE UPDATE ON admissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default campuses
INSERT INTO campuses (name, location) VALUES
('BDJA Nanyuki', 'Nanyuki, Laikipia County'),
('BDJA Ngaridari', 'Ngaridari, Meru County');

-- Insert default subjects
INSERT INTO subjects (name, code, grade_levels) VALUES
('Mathematics', 'MATH', ARRAY['playgroup','pp1','pp2','grade1','grade2','grade3','grade4','grade5','grade6']),
('English', 'ENG', ARRAY['playgroup','pp1','pp2','grade1','grade2','grade3','grade4','grade5','grade6']),
('Kiswahili', 'KIS', ARRAY['playgroup','pp1','pp2','grade1','grade2','grade3','grade4','grade5','grade6']),
('Science & Technology', 'SCI', ARRAY['grade1','grade2','grade3','grade4','grade5','grade6']),
('Social Studies', 'SST', ARRAY['grade1','grade2','grade3','grade4','grade5','grade6']),
('CRE', 'CRE', ARRAY['playgroup','pp1','pp2','grade1','grade2','grade3','grade4','grade5','grade6']),
('Creative Arts', 'ART', ARRAY['playgroup','pp1','pp2','grade1','grade2','grade3','grade4','grade5','grade6']),
('Physical Education', 'PE', ARRAY['playgroup','pp1','pp2','grade1','grade2','grade3','grade4','grade5','grade6']),
('Home Science', 'HS', ARRAY['grade4','grade5','grade6']),
('Agriculture', 'AGR', ARRAY['grade4','grade5','grade6']),
('Indigenous Languages', 'IL', ARRAY['playgroup','pp1','pp2','grade1','grade2','grade3','grade4','grade5','grade6']);
