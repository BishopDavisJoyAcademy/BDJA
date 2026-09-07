-- Migration: Dynamic Timetable Configuration & Subject Colors
-- Created: 2024-09-07

-- ============================================
-- 1. Add color to subjects table
-- ============================================
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS color text;

COMMENT ON COLUMN public.subjects.color IS 'Hex color code for timetable display (e.g. #3b82f6)';

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_config_single ON public.timetable_config ((true));

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
-- 4. Expand admissions table with comprehensive fields
-- ============================================
ALTER TABLE public.admissions
ADD COLUMN IF NOT EXISTS previous_school text,
ADD COLUMN IF NOT EXISTS previous_grade text,
ADD COLUMN IF NOT EXISTS home_address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS county text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Kenya',
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
ADD COLUMN IF NOT EXISTS medical_conditions text,
ADD COLUMN IF NOT EXISTS allergies text,
ADD COLUMN IF NOT EXISTS special_needs text,
ADD COLUMN IF NOT EXISTS religion text,
ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Kenyan',
ADD COLUMN IF NOT EXISTS birth_certificate_no text,
ADD COLUMN IF NOT EXISTS passport_no text,
ADD COLUMN IF NOT EXISTS sibling_names text,
ADD COLUMN IF NOT EXISTS parent_occupation text,
ADD COLUMN IF NOT EXISTS parent_address text,
ADD COLUMN IF NOT EXISTS parent_id_number text,
ADD COLUMN IF NOT EXISTS admission_date date,
ADD COLUMN IF NOT EXISTS interview_date date,
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.admissions.custom_fields IS 'Admin-configurable extra fields stored as JSON';

-- ============================================
-- 5. Add subject_id to timetable_slots for unified lookups
-- ============================================
ALTER TABLE public.timetable_slots
ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;

-- ============================================
-- 6. Create admission_custom_fields table for admin configurability
-- ============================================
CREATE TABLE IF NOT EXISTS public.admission_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  field_key text NOT NULL UNIQUE,
  field_type text NOT NULL DEFAULT 'text', -- text, textarea, select, number, date, email, tel
  options text[], -- for select type
  required boolean NOT NULL DEFAULT false,
  section text NOT NULL DEFAULT 'other', -- student, parent, emergency, medical, other
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
-- 8. RLS Policies
-- ============================================

-- timetable_config: readable by all, writable by admin only
CREATE POLICY IF NOT EXISTS "timetable_config_select_all"
  ON public.timetable_config FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY IF NOT EXISTS "timetable_config_admin_all"
  ON public.timetable_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- admission_custom_fields: readable by all, writable by admin only
CREATE POLICY IF NOT EXISTS "admission_custom_fields_select_all"
  ON public.admission_custom_fields FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY IF NOT EXISTS "admission_custom_fields_admin_all"
  ON public.admission_custom_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));

-- admissions: public can insert, admin can manage
CREATE POLICY IF NOT EXISTS "admissions_public_insert"
  ON public.admissions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "admissions_select_admin"
  ON public.admissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));

CREATE POLICY IF NOT EXISTS "admissions_update_admin"
  ON public.admissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));

CREATE POLICY IF NOT EXISTS "admissions_delete_admin"
  ON public.admissions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'));
