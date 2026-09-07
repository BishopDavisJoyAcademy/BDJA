-- ============================================================
-- BDJA Phase 7C: Staff & Student Power-ups
-- New table: staff_activity_logs
-- Date: 2026-09-07
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_staff_id ON staff_activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_created_at ON staff_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE staff_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: admins can view all
CREATE POLICY "Admins can view all staff activity logs"
  ON staff_activity_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_category = 'admin'
  ));

-- Policy: staff can view their own
CREATE POLICY "Staff can view their own activity logs"
  ON staff_activity_logs FOR SELECT
  USING (staff_id = auth.uid());

-- Add guardian columns to students if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'guardian_name') THEN
    ALTER TABLE students ADD COLUMN guardian_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'guardian_phone') THEN
    ALTER TABLE students ADD COLUMN guardian_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'guardian_email') THEN
    ALTER TABLE students ADD COLUMN guardian_email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'enrollment_date') THEN
    ALTER TABLE students ADD COLUMN enrollment_date DATE;
  END IF;
END $$;
