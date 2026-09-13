-- ============================================================
-- 006_academic_operations
-- Academic operations: timetable configuration, admission custom fields, timetable slots, fee reminders, library fines, class/subject indexes.
--
-- BDJA Platform — Version 1.0.0
-- Consolidated from: 20240907_dynamic (config/custom fields), phase7d (indexes), phase7e (fee reminders / library fines), 20250907 (timetable_slots)
--
-- ORDER MATTERS: run 001 → 009 in sequence on a fresh database.
-- ============================================================

-- ============================================
-- 2. Create timetable_config table
-- ============================================
CREATE TABLE IF NOT EXISTS public.timetable_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_days text[] NOT NULL DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'],
  time_slots text[] NOT NULL DEFAULT ARRAY['08:00','08:40','09:20','10:00','10:40','11:20','12:00','12:40','13:20','14:00','14:40','15:20'],
  lesson_duration_minutes integer NOT NULL DEFAULT 40,
  terms text[] NOT NULL DEFAULT ARRAY['Term 1','Term 2','Term 3'],
  academic_year text,
  start_time text DEFAULT '08:00',
  end_time text DEFAULT '15:20',
  grade_levels text[] DEFAULT ARRAY['Playgroup','PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only one config row allowed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'timetable_config' AND indexname = 'idx_timetable_config_single'
  ) THEN
    CREATE UNIQUE INDEX idx_timetable_config_single ON public.timetable_config ((true));
  END IF;
END $$;

COMMENT ON TABLE public.timetable_config IS 'School-wide timetable configuration: days, time slots, terms, grade levels';

-- ============================================
-- 3. Insert default config if missing
-- ============================================
INSERT INTO public.timetable_config (school_days, time_slots, lesson_duration_minutes, terms, academic_year)
SELECT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'], 
       ARRAY['08:00','08:40','09:20','10:00','10:40','11:20','12:00','12:40','13:20','14:00','14:40','15:20'],
       40, ARRAY['Term 1','Term 2','Term 3'], '2025-2026'
WHERE NOT EXISTS (SELECT 1 FROM public.timetable_config);

-- ============================================
-- 6. Create admission_custom_fields table for admin configurability
-- ============================================
CREATE TABLE IF NOT EXISTS public.admission_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  field_key text NOT NULL UNIQUE,
  field_type text NOT NULL DEFAULT 'text',
  options text[],
  required boolean NOT NULL DEFAULT false,
  section text NOT NULL DEFAULT 'other',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.admission_custom_fields IS 'Admin-configurable extra fields for the admission form';

-- ============================================
-- 7. Enable RLS on new tables
-- ============================================
ALTER TABLE public.timetable_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_custom_fields ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS Policies (using DO blocks for idempotency)
-- ============================================

-- timetable_config: readable by all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timetable_config' AND policyname = 'timetable_config_select_all'
  ) THEN
    CREATE POLICY "timetable_config_select_all"
      ON public.timetable_config FOR SELECT TO authenticated, anon USING (true);
  END IF;
END $$;

-- timetable_config: writable by admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timetable_config' AND policyname = 'timetable_config_admin_all'
  ) THEN
    CREATE POLICY "timetable_config_admin_all"
      ON public.timetable_config FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));
  END IF;
END $$;

-- admission_custom_fields: readable by all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admission_custom_fields' AND policyname = 'admission_custom_fields_select_all'
  ) THEN
    CREATE POLICY "admission_custom_fields_select_all"
      ON public.admission_custom_fields FOR SELECT TO authenticated, anon USING (true);
  END IF;
END $$;

-- admission_custom_fields: writable by admin only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admission_custom_fields' AND policyname = 'admission_custom_fields_admin_all'
  ) THEN
    CREATE POLICY "admission_custom_fields_admin_all"
      ON public.admission_custom_fields FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));
  END IF;
END $$;

-- admissions: public can insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admissions' AND policyname = 'admissions_public_insert'
  ) THEN
    CREATE POLICY "admissions_public_insert"
      ON public.admissions FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- admissions: admin can select
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admissions' AND policyname = 'admissions_select_admin'
  ) THEN
    CREATE POLICY "admissions_select_admin"
      ON public.admissions FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));
  END IF;
END $$;

-- admissions: admin can update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admissions' AND policyname = 'admissions_update_admin'
  ) THEN
    CREATE POLICY "admissions_update_admin"
      ON public.admissions FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));
  END IF;
END $$;

-- admissions: admin can delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admissions' AND policyname = 'admissions_delete_admin'
  ) THEN
    CREATE POLICY "admissions_delete_admin"
      ON public.admissions FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));
  END IF;
END $$;

-- ============================================
-- CLASS & SUBJECT INDEXES
-- ============================================

-- Add index for class teacher lookups
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(class_teacher_id);

-- Add index for class campus lookups
CREATE INDEX IF NOT EXISTS idx_classes_campus ON classes(campus_id);

-- Add index for class_subjects lookups
CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher ON class_subjects(teacher_id);

-- ============================================
-- FEE REMINDERS & LIBRARY FINES
-- ============================================

-- Fee Reminders Table
CREATE TABLE IF NOT EXISTS fee_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('upcoming', 'overdue', 'final')),
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_reminders_structure ON fee_reminders(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_reminders_student ON fee_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_reminders_status ON fee_reminders(status);

-- Library Fines Table
CREATE TABLE IF NOT EXISTS library_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id UUID NOT NULL REFERENCES library_borrowings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_fines_borrowing ON library_fines(borrowing_id);
CREATE INDEX IF NOT EXISTS idx_library_fines_paid ON library_fines(paid);

-- ============================================
-- TIMETABLE SLOTS
-- ============================================

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