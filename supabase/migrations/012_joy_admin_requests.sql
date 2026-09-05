-- Migration: 012_joy_admin_requests
-- Phase 5B: Admin Request System for Joy AI
-- Created: 2026-09-06

-- ============================================
-- joy_admin_requests — When Joy lacks info, she asks admin
-- ============================================
CREATE TABLE IF NOT EXISTS public.joy_admin_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_category TEXT NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  context TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'answered', 'dismissed')),
  admin_response TEXT,
  responded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'fees', 'policies', 'calendar', 'academic', 'technical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_joy_admin_requests_user ON public.joy_admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_joy_admin_requests_status ON public.joy_admin_requests(status);
CREATE INDEX IF NOT EXISTS idx_joy_admin_requests_created ON public.joy_admin_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_joy_admin_requests_priority ON public.joy_admin_requests(priority);

ALTER TABLE public.joy_admin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON public.joy_admin_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all requests"
  ON public.joy_admin_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_category = 'admin'
    )
  );

CREATE POLICY "Users can create requests"
  ON public.joy_admin_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.joy_admin_requests IS 'Admin request system for Joy AI — when Joy lacks info, users ask admin';

-- ============================================
-- joy_page_interactions — Track page-aware assistance usage
-- ============================================
CREATE TABLE IF NOT EXISTS public.joy_page_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_route TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  assistant_suggestion TEXT,
  successful BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_joy_page_interactions_user ON public.joy_page_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_joy_page_interactions_route ON public.joy_page_interactions(page_route);
CREATE INDEX IF NOT EXISTS idx_joy_page_interactions_created ON public.joy_page_interactions(created_at DESC);

ALTER TABLE public.joy_page_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions"
  ON public.joy_page_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all interactions"
  ON public.joy_page_interactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_category = 'admin'
    )
  );

COMMENT ON TABLE public.joy_page_interactions IS 'Tracks usage of Joy page-aware assistance features';
