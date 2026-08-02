-- Migration 006: Fix Service Role Permissions
-- ============================================
-- Problem: service_role lacks table-level privileges on public schema tables
-- Symptom: "permission denied for table profiles" (and potentially other tables)
-- Cause: Tables created via migrations/SQL Editor without explicit GRANT to service_role
-- Fix: Comprehensive privilege grants + default privileges for future tables
--
-- Run this in Supabase SQL Editor (New Query → Run)
-- Safe to run multiple times (idempotent)

-- ============================================
-- 1. GRANT SCHEMA USAGE
-- ============================================
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA auth TO service_role;

-- ============================================
-- 2. GRANT ON ALL EXISTING TABLES
-- ============================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role;', tbl);
  END LOOP;
END $$;

-- ============================================
-- 3. GRANT ON ALL EXISTING SEQUENCES
-- ============================================
DO $$
DECLARE
  seq TEXT;
BEGIN
  FOR seq IN
    SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT ALL PRIVILEGES ON SEQUENCE public.%I TO service_role;', seq);
  END LOOP;
END $$;

-- ============================================
-- 4. DEFAULT PRIVILEGES (future tables/sequences auto-granted)
-- ============================================
-- For tables/sequences created by the postgres role (default Supabase owner)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- Also set for auth schema if any custom functions/tables are created there
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO service_role;

-- ============================================
-- 5. ENSURE RLS IS ENABLED BUT service_role BYPASSES IT
-- ============================================
-- service_role automatically bypasses RLS, but we enforce it explicitly
-- for all tables that should have RLS (re-run from 003_security_updates.sql)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'students', 'classes', 'subjects', 'timetable',
    'calendar_events', 'attendance', 'assessments', 'assignments',
    'assignment_submissions', 'vora_content', 'vora_quizzes',
    'vora_attempts', 'library_resources', 'library_borrowings',
    'fee_structures', 'fee_payments', 'admissions', 'messages',
    'notifications', 'character_reports', 'values_badges',
    'study_streaks', 'campuses', 'parent_children', 'class_subjects',
    'staff_roles', 'audit_logs', 'saved_videos',
    'homepage_carousel', 'homepage_director_message', 'homepage_notices',
    'homepage_news', 'homepage_stats', 'homepage_grade_levels',
    'homepage_quick_links', 'homepage_footer_links', 'homepage_social_links',
    'teacher_timetables', 'teacher_registers', 'teacher_mark_sheets',
    'mark_sheet_templates', 'cms_pages'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXCEPTION WHEN undefined_table THEN
      -- Table doesn't exist yet, skip
      RAISE NOTICE 'Table % does not exist, skipping RLS enable.', tbl;
    END;
  END LOOP;
END $$;

-- ============================================
-- 6. VERIFY (optional - returns grant status)
-- ============================================
-- Uncomment the line below to verify grants were applied:
-- SELECT grantee, table_schema, table_name, privilege_type
-- FROM information_schema.table_privileges
-- WHERE grantee = 'service_role' AND table_schema = 'public';
