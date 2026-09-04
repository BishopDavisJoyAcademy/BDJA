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
  UNIQUE(student_id, academic_year, term)
);

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
