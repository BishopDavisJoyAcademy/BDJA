-- Parent Experience Phase 4 Migration
-- Created: 2024-09-05

-- ============================================
-- 1. parent_teacher_messages table
-- For direct messaging between parents and teachers
-- ============================================
CREATE TABLE IF NOT EXISTS public.parent_teacher_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_by TEXT NOT NULL CHECK (sent_by IN ('parent', 'teacher')),
  read_by_parent BOOLEAN NOT NULL DEFAULT TRUE,
  read_by_teacher BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ptm_parent ON public.parent_teacher_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_ptm_teacher ON public.parent_teacher_messages(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ptm_student ON public.parent_teacher_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_ptm_created ON public.parent_teacher_messages(created_at DESC);

-- RLS policies
ALTER TABLE public.parent_teacher_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their own messages"
  ON public.parent_teacher_messages FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Teachers can view messages where they are the teacher"
  ON public.parent_teacher_messages FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Parents can send messages"
  ON public.parent_teacher_messages FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Teachers can send messages"
  ON public.parent_teacher_messages FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Parents can update read status on their side"
  ON public.parent_teacher_messages FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Teachers can update read status on their side"
  ON public.parent_teacher_messages FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ============================================
-- 2. announcements table
-- School-wide and class-specific announcements
-- ============================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'academic', 'sports', 'events', 'fees', 'safety', 'holiday')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'parents', 'staff', 'admin')),
  target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  target_grade_level TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON public.announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_class ON public.announcements(target_class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON public.announcements(expires_at);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published announcements"
  ON public.announcements FOR SELECT
  USING (published_at <= now() AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Staff can create announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category IN ('staff', 'admin')
  ));

CREATE POLICY "Staff can update their own announcements"
  ON public.announcements FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'
  ));

CREATE POLICY "Staff can delete their own announcements"
  ON public.announcements FOR DELETE
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_category = 'admin'
  ));

-- ============================================
-- 3. announcement_reads table (track who read what)
-- ============================================
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ar_user ON public.announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_announcement ON public.announcement_reads(announcement_id);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reads"
  ON public.announcement_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark announcements as read"
  ON public.announcement_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. Update trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_parent_teacher_messages_updated_at ON public.parent_teacher_messages;
CREATE TRIGGER update_parent_teacher_messages_updated_at
  BEFORE UPDATE ON public.parent_teacher_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. Make fee_structure_id nullable for payment claims
-- ============================================
ALTER TABLE public.fee_payments ALTER COLUMN fee_structure_id DROP NOT NULL;
