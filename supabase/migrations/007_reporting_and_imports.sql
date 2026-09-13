-- ============================================================
-- 007_reporting_and_imports
-- Reporting & data movement: report cards (with AI narrative support), per-subject entries, report templates, data exports, CSV import batches/rows.
--
-- BDJA Platform — Version 1.0.0
-- Consolidated from: 010 (AI columns folded in from 013), 013 (subject entries), 20250907 (templates / exports / CSV imports)
--
-- ORDER MATTERS: run 001 → 009 in sequence on a fresh database.
-- ============================================================

-- Migration: 010_add_report_cards_table
-- Stores generated report card metadata and signatures

CREATE TABLE IF NOT EXISTS public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  teacher_remarks TEXT,
  principal_remarks TEXT,
  parent_acknowledged BOOLEAN DEFAULT false,
  parent_acknowledged_at TIMESTAMPTZ,
  teacher_signature_url TEXT,
  principal_signature_url TEXT,
  parent_signature_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  pdf_url TEXT,
  ai_narrative TEXT,
  ai_generated_at TIMESTAMPTZ,
  ai_model_used TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  publish_method TEXT DEFAULT 'manual' CHECK (publish_method IN ('manual', 'scheduled', 'batch')),
  UNIQUE(student_id, academic_year, term)
);

COMMENT ON COLUMN public.report_cards.ai_narrative IS 'AI-generated full narrative report for the student';
COMMENT ON COLUMN public.report_cards.ai_generated_at IS 'When the AI narrative was generated';
COMMENT ON COLUMN public.report_cards.ai_model_used IS 'Which AI model generated the narrative';

-- Enable RLS
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can view own report cards"
ON public.report_cards FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Parents can view children's report cards"
ON public.report_cards FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_students ps
    WHERE ps.student_id = report_cards.student_id AND ps.parent_id = auth.uid()
  )
);

CREATE POLICY "Teachers can manage assigned class report cards"
ON public.report_cards FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = report_cards.class_id AND c.class_teacher_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all report cards"
ON public.report_cards FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_category = 'admin'
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_cards_student ON public.report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_term ON public.report_cards(academic_year, term);
CREATE INDEX IF NOT EXISTS idx_report_cards_class ON public.report_cards(class_id);

COMMENT ON TABLE public.report_cards IS 'Stores report card generation metadata, signatures, and publication status';


-- ============================================
-- PER-SUBJECT REPORT CARD ENTRIES
-- ============================================

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

-- ============================================
-- REPORT TEMPLATES / DATA EXPORTS / CSV IMPORTS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- REPORT TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('students', 'staff', 'parents', 'attendance', 'grades', 'fees', 'classes', 'custom')),
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_shared ON report_templates(is_shared) WHERE is_shared = TRUE;

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_templates_select_shared" ON report_templates
  FOR SELECT USING (
    is_shared = TRUE OR created_by = auth.uid()
  );

CREATE POLICY "report_templates_admin_all" ON report_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_category = 'admin'
    )
  );

-- ============================================================
-- DATA EXPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  export_type TEXT NOT NULL CHECK (export_type IN ('csv', 'json', 'pdf', 'excel')),
  table_name TEXT,
  filters JSONB,
  file_url TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_exports_created_by ON data_exports(created_by);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);
CREATE INDEX IF NOT EXISTS idx_data_exports_type ON data_exports(export_type);

ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_exports_select_own" ON data_exports
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "data_exports_admin_all" ON data_exports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_category = 'admin'
    )
  );

-- ============================================================
-- CSV IMPORT BATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS csv_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type TEXT NOT NULL CHECK (import_type IN ('students', 'staff', 'parents')),
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'importing', 'completed', 'failed')),
  error_summary JSONB,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csv_import_batches_created_by ON csv_import_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_csv_import_batches_status ON csv_import_batches(status);

ALTER TABLE csv_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csv_import_batches_select_own" ON csv_import_batches
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "csv_import_batches_admin_all" ON csv_import_batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_category = 'admin'
    )
  );

-- ============================================================
-- CSV IMPORT ROWS
-- ============================================================
CREATE TABLE IF NOT EXISTS csv_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES csv_import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'invalid', 'imported', 'failed')),
  validation_errors JSONB,
  imported_record_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csv_import_rows_batch ON csv_import_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_rows_status ON csv_import_rows(status);

ALTER TABLE csv_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csv_import_rows_select_own" ON csv_import_rows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM csv_import_batches
      WHERE csv_import_batches.id = csv_import_rows.batch_id
      AND csv_import_batches.created_by = auth.uid()
    )
  );

CREATE POLICY "csv_import_rows_admin_all" ON csv_import_rows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_category = 'admin'
    )
  );

-- ============================================================
-- TRIGGERS FOR updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_timetable_slots_updated_at ON timetable_slots;
CREATE TRIGGER update_timetable_slots_updated_at
  BEFORE UPDATE ON timetable_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_templates_updated_at ON report_templates;
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();