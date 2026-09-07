-- Phase 7F + 7G: Timetable, Reports, Import, and Backup Tables
-- Run this in your Supabase SQL Editor

-- ============================================================
-- TIMETABLE SLOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  room TEXT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 5),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_class ON timetable_slots(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_teacher ON timetable_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_day ON timetable_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_year_term ON timetable_slots(academic_year, term);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_active ON timetable_slots(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timetable_slots_select_all" ON timetable_slots
  FOR SELECT USING (true);

CREATE POLICY "timetable_slots_admin_all" ON timetable_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_category = 'admin'
    )
  );

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
