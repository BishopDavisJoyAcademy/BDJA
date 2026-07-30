-- BDJA Platform Security & Feature Updates
-- Run this migration after 001_initial_schema.sql and 002_seed_super_admin.sql

-- Add temp_password_hash for secure temporary password storage
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS temp_password_hash TEXT,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE;

-- Add saved_videos table for Joy AI recommendations
CREATE TABLE IF NOT EXISTS saved_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  grade_level TEXT,
  youtube_url TEXT NOT NULL,
  summary TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  difficulty TEXT,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS on saved_videos
ALTER TABLE saved_videos ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own saved videos
CREATE POLICY "Users can view own saved videos"
  ON saved_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved videos"
  ON saved_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved videos"
  ON saved_videos FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_saved_videos_user_id ON saved_videos(user_id);

-- Add index on profiles for active checks
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON profiles(role, is_active);

-- Add index on students for admission number lookups
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number);

-- Update audit_logs to include IP and user agent if not present
ALTER TABLE IF EXISTS audit_logs
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Ensure RLS is enabled on all critical tables (idempotent)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['profiles', 'students', 'classes', 'subjects', 'timetable', 
                         'calendar_events', 'attendance', 'assessments', 'assignments',
                         'assignment_submissions', 'vora_content', 'vora_quizzes',
                         'vora_attempts', 'library_resources', 'library_borrowings',
                         'fee_structures', 'fee_payments', 'admissions', 'messages',
                         'notifications', 'character_reports', 'values_badges',
                         'study_streaks', 'campuses', 'parent_children', 'class_subjects',
                         'staff_roles', 'audit_logs'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;
