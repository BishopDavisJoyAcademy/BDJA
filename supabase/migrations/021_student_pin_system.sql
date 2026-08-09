-- ============================================================
-- BDJA Migration 021: Student PIN System + Staff Table
-- 
-- 1. Ensure students table has all needed columns
-- 2. Ensure staff table exists (if not already created)
-- 3. Ensure profiles has temp_password_hash for PIN storage
-- ============================================================

-- Ensure students table columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='admission_number') THEN
    ALTER TABLE public.students ADD COLUMN admission_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='grade_level') THEN
    ALTER TABLE public.students ADD COLUMN grade_level TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='class_id') THEN
    ALTER TABLE public.students ADD COLUMN class_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='enrollment_date') THEN
    ALTER TABLE public.students ADD COLUMN enrollment_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='status') THEN
    ALTER TABLE public.students ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Ensure staff table exists
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  department TEXT DEFAULT 'General',
  designation TEXT DEFAULT 'Staff',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave','terminated')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_all" ON staff;
CREATE POLICY "staff_select_all" ON staff FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_admin_all" ON staff;
CREATE POLICY "staff_admin_all" ON staff FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_staff_updated_at') THEN
    CREATE TRIGGER update_staff_updated_at
      BEFORE UPDATE ON staff
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Ensure profiles has temp_password_hash
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='temp_password_hash') THEN
    ALTER TABLE public.profiles ADD COLUMN temp_password_hash TEXT;
  END IF;
END $$;
