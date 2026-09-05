-- Migration: 011_joy_security_hardening
-- Phase 5A: Security Hardening for Joy AI
-- Created: 2026-09-06

-- ============================================
-- 1. joy_audit_log — Every AI action, tool call, and data access
-- ============================================
CREATE TABLE IF NOT EXISTS public.joy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_category TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'chat_message', 'tool_call', 'data_query', 'data_create', 
    'data_update', 'data_delete', 'guardrail_block', 'guardrail_flag',
    'page_assist', 'report_generate', 'notification_send'
  )),
  target_table TEXT,
  target_record_id TEXT,
  tool_name TEXT,
  query_text TEXT,
  ai_response_preview TEXT,
  permission_key TEXT,
  permission_granted BOOLEAN NOT NULL DEFAULT false,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_joy_audit_user ON public.joy_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_joy_audit_action ON public.joy_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_joy_audit_created ON public.joy_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_joy_audit_table ON public.joy_audit_log(target_table);

ALTER TABLE public.joy_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON public.joy_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON public.joy_audit_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_category = 'admin'
    )
  );

COMMENT ON TABLE public.joy_audit_log IS 'Immutable audit trail of all Joy AI actions and data access';

-- ============================================
-- 2. joy_conversation_analytics — Query patterns and performance
-- ============================================
CREATE TABLE IF NOT EXISTS public.joy_conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  query_category TEXT CHECK (query_category IN (
    'grades', 'attendance', 'timetable', 'fees', 'assignments',
    'general_info', 'navigation', 'report_generation', 'communication',
    'analytics', 'help', 'greeting', 'other', 'blocked'
  )),
  role TEXT,
  resolved BOOLEAN DEFAULT false,
  response_time_ms INTEGER,
  model_used TEXT,
  token_count INTEGER,
  tool_calls_used TEXT[],
  guardrail_triggered BOOLEAN DEFAULT false,
  guardrail_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_joy_analytics_user ON public.joy_conversation_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_joy_analytics_category ON public.joy_conversation_analytics(query_category);
CREATE INDEX IF NOT EXISTS idx_joy_analytics_created ON public.joy_conversation_analytics(created_at DESC);

ALTER TABLE public.joy_conversation_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all analytics"
  ON public.joy_conversation_analytics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_category = 'admin'
    )
  );

COMMENT ON TABLE public.joy_conversation_analytics IS 'Analytics for Joy AI usage patterns and performance';

-- ============================================
-- 3. joy_guardrail_violations — Blocked and flagged queries
-- ============================================
CREATE TABLE IF NOT EXISTS public.joy_guardrail_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL CHECK (violation_type IN (
    'sql_injection', 'prompt_injection', 'pii_exposure', 
    'unauthorized_data_access', 'harmful_content', 'jailbreak_attempt',
    'cross_user_access', 'blacklisted_table_access'
  )),
  query_preview TEXT NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT true,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_joy_violations_user ON public.joy_guardrail_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_joy_violations_type ON public.joy_guardrail_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_joy_violations_created ON public.joy_guardrail_violations(created_at DESC);

ALTER TABLE public.joy_guardrail_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all violations"
  ON public.joy_guardrail_violations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_category = 'admin'
    )
  );

COMMENT ON TABLE public.joy_guardrail_violations IS 'Log of all guardrail violations and blocked queries';

-- ============================================
-- 4. joy_knowledge_base — Admin-configurable school knowledge
-- ============================================
CREATE TABLE IF NOT EXISTS public.joy_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
    'motto', 'vision', 'mission', 'policies', 'fees', 'calendar',
    'contacts', 'procedures', 'rules', 'general'
  )),
  is_public BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_joy_kb_category ON public.joy_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_joy_kb_key ON public.joy_knowledge_base(key);

ALTER TABLE public.joy_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public knowledge"
  ON public.joy_knowledge_base FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Admins can manage knowledge base"
  ON public.joy_knowledge_base FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_category = 'admin'
    )
  );

COMMENT ON TABLE public.joy_knowledge_base IS 'Admin-configurable knowledge base for Joy AI responses';

-- Seed default knowledge
INSERT INTO public.joy_knowledge_base (key, content, category, is_public)
VALUES 
  ('school_name', 'Bishop Davis Joy Academy', 'general', true),
  ('school_motto', 'Prayer, Integrity, Discipline, Commitment, Respect, Excellence, Responsibility, Teamwork, Compassion', 'motto', true),
  ('welcome_message', 'Welcome to Bishop Davis Joy Academy! I am Joy, your AI assistant. How can I help you today?', 'general', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 5. joy_page_assistants — Context-aware page assistance
-- ============================================
CREATE TABLE IF NOT EXISTS public.joy_page_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_route TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  context_prompt TEXT NOT NULL,
  suggested_actions JSONB NOT NULL DEFAULT '[]',
  required_permission TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_joy_page_route ON public.joy_page_assistants(page_route);

ALTER TABLE public.joy_page_assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page assistants"
  ON public.joy_page_assistants FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage page assistants"
  ON public.joy_page_assistants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_category = 'admin'
    )
  );

-- Seed default page assistants
INSERT INTO public.joy_page_assistants (page_route, page_name, context_prompt, suggested_actions, required_permission)
VALUES 
  ('/dashboard/timetable', 'Timetable', 'You are on the Timetable page. You can help create, edit, or optimize class timetables. Suggest optimal layouts, detect conflicts, and balance teacher workload.', '[{"text":"Create a new timetable","action":"create_timetable"},{"text":"Check for conflicts","action":"check_conflicts"},{"text":"Optimize current timetable","action":"optimize_timetable"}]', 'timetable.manage'),
  ('/dashboard/grades', 'Grades', 'You are on the Grades page. You can help analyze grade patterns, identify at-risk students, and generate report cards. Provide insights on student performance trends.', '[{"text":"Analyze grade trends","action":"analyze_grades"},{"text":"Find at-risk students","action":"at_risk_students"},{"text":"Generate report card","action":"generate_report"}]', 'grades.manage'),
  ('/dashboard/attendance', 'Attendance', 'You are on the Attendance page. You can help mark attendance, analyze attendance patterns, and identify students with declining attendance. Suggest interventions.', '[{"text":"Mark attendance today","action":"mark_attendance"},{"text":"Analyze attendance trends","action":"analyze_attendance"},{"text":"Find frequent absentees","action":"find_absentees"}]', 'attendance.manage'),
  ('/dashboard/assignments', 'Assignments', 'You are on the Assignments page. You can help create assignments, set up auto-grading for objective questions, and provide feedback suggestions.', '[{"text":"Create new assignment","action":"create_assignment"},{"text":"Set up auto-grading","action":"setup_autograde"},{"text":"Review pending submissions","action":"review_submissions"}]', 'assignments.manage'),
  ('/dashboard/fees', 'Fees', 'You are on the Fees page. You can help track payments, identify likely defaulters, and send payment reminders. Analyze fee collection patterns.', '[{"text":"Check payment status","action":"check_payments"},{"text":"Identify likely defaulters","action":"predict_defaulters"},{"text":"Send payment reminders","action":"send_reminders"}]', 'fees.manage'),
  ('/dashboard/admin', 'Admin Dashboard', 'You are on the Admin Dashboard. You can help manage users, configure school settings, review analytics, and oversee all platform operations.', '[{"text":"Manage users","action":"manage_users"},{"text":"Review analytics","action":"review_analytics"},{"text":"Configure settings","action":"configure_settings"}]', 'admin.access')
ON CONFLICT (page_route) DO NOTHING;
