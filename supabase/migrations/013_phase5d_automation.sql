-- Migration: 013_phase5d_automation
-- Adds AI-generated report card content, assignment auto-grading, and parent communication tables

-- ============================================================
-- EXTEND report_cards: AI generation tracking
-- ============================================================
ALTER TABLE public.report_cards
ADD COLUMN IF NOT EXISTS ai_narrative TEXT,
ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_model_used TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS publish_method TEXT DEFAULT 'manual' CHECK (publish_method IN ('manual', 'scheduled', 'batch'));

COMMENT ON COLUMN public.report_cards.ai_narrative IS 'AI-generated full narrative report for the student';
COMMENT ON COLUMN public.report_cards.ai_generated_at IS 'When the AI narrative was generated';
COMMENT ON COLUMN public.report_cards.ai_model_used IS 'Which AI model generated the narrative';

-- ============================================================
-- TABLE: report_card_subject_entries
-- Per-subject AI-generated comments and metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_card_subject_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  narrative_comment TEXT,
  strengths TEXT,
  improvement_areas TEXT,
  grade_average NUMERIC(5,2),
  attendance_rate NUMERIC(5,2),
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence NUMERIC(4,3),
  teacher_override TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_card_id, subject_id)
);

ALTER TABLE public.report_card_subject_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own report card entries"
ON public.report_card_subject_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.report_cards rc
    WHERE rc.id = report_card_subject_entries.report_card_id AND rc.student_id = auth.uid()
  )
);

CREATE POLICY "Parents can view children's report card entries"
ON public.report_card_subject_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.report_cards rc
    JOIN public.parent_students ps ON ps.student_id = rc.student_id
    WHERE rc.id = report_card_subject_entries.report_card_id AND ps.parent_id = auth.uid()
  )
);

CREATE POLICY "Teachers can manage assigned class report card entries"
ON public.report_card_subject_entries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.report_cards rc
    JOIN public.classes c ON c.id = rc.class_id
    WHERE rc.id = report_card_subject_entries.report_card_id AND c.class_teacher_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all report card entries"
ON public.report_card_subject_entries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_category = 'admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_rcse_report_card ON public.report_card_subject_entries(report_card_id);
CREATE INDEX IF NOT EXISTS idx_rcse_subject ON public.report_card_subject_entries(subject_id);

-- ============================================================
-- TABLE: parent_communication_drafts
-- AI-drafted parent messages with tone/history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parent_communication_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  tone TEXT DEFAULT 'professional' CHECK (tone IN ('formal', 'professional', 'casual', 'urgent', 'encouraging')),
  language TEXT DEFAULT 'english' CHECK (language IN ('english', 'kiswahili', 'both')),
  ai_drafted BOOLEAN DEFAULT true,
  ai_model_used TEXT,
  teacher_edited BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  sent_via TEXT CHECK (sent_via IN ('app', 'email', 'sms', 'whatsapp')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.parent_communication_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
ON public.parent_communication_drafts FOR SELECT
TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "Users can manage own drafts"
ON public.parent_communication_drafts FOR ALL
TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "Admins can manage all communication drafts"
ON public.parent_communication_drafts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_category = 'admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_pcd_sender ON public.parent_communication_drafts(sender_id);
CREATE INDEX IF NOT EXISTS idx_pcd_status ON public.parent_communication_drafts(status);
CREATE INDEX IF NOT EXISTS idx_pcd_scheduled ON public.parent_communication_drafts(scheduled_for);

-- ============================================================
-- TABLE: assignment_submissions
-- For auto-grading feature
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}',
  written_response TEXT,
  score NUMERIC(6,2),
  max_score NUMERIC(6,2),
  ai_graded BOOLEAN DEFAULT false,
  ai_feedback TEXT,
  ai_rubric_scores JSONB DEFAULT '{}',
  teacher_override_score NUMERIC(6,2),
  teacher_override_feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'ai_graded', 'teacher_reviewed', 'finalized')),
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own submissions"
ON public.assignment_submissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = assignment_submissions.student_id AND s.profile_id = auth.uid()
  )
);

CREATE POLICY "Teachers can manage submissions for their classes"
ON public.assignment_submissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.class_subjects cs ON cs.subject_id = a.subject_id
    JOIN public.classes c ON c.id = cs.class_id
    WHERE a.id = assignment_submissions.assignment_id
    AND cs.teacher_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all submissions"
ON public.assignment_submissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_category = 'admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_as_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_as_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_as_status ON public.assignment_submissions(status);

-- ============================================================
-- TABLE: timetable_suggestions
-- AI-generated timetable optimization suggestions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.timetable_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('conflict_resolution', 'workload_balance', 'room_optimization', 'break_optimization')),
  current_layout JSONB NOT NULL,
  suggested_layout JSONB NOT NULL,
  reasoning TEXT NOT NULL,
  impact_score NUMERIC(4,2),
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.timetable_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view timetable suggestions"
ON public.timetable_suggestions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_category IN ('admin', 'teacher', 'staff')
  )
);

CREATE POLICY "Admins can manage timetable suggestions"
ON public.timetable_suggestions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_category = 'admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_ts_campus ON public.timetable_suggestions(campus_id);
CREATE INDEX IF NOT EXISTS idx_ts_type ON public.timetable_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ts_applied ON public.timetable_suggestions(applied);

COMMENT ON TABLE public.report_card_subject_entries IS 'Per-subject AI-generated report card comments and metrics';
COMMENT ON TABLE public.parent_communication_drafts IS 'AI-drafted parent communications with tone and language options';
COMMENT ON TABLE public.assignment_submissions IS 'Student assignment submissions with AI auto-grading support';
COMMENT ON TABLE public.timetable_suggestions IS 'AI-generated timetable optimization suggestions';
