-- Migration: Phase 7D - Subjects Upgrade (Grading Scales & Curriculum Strands)
-- Created: 2024-09-07

-- Add grading_scales JSONB column to subjects
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS grading_scales JSONB DEFAULT NULL;

-- Add curriculum_strands JSONB column to subjects
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS curriculum_strands JSONB DEFAULT NULL;

-- Add description column to subjects
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Add capacity column to classes
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT NULL;

-- Add room column to classes
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS room TEXT DEFAULT NULL;

-- Add is_active column to classes
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add index for class teacher lookups
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(class_teacher_id);

-- Add index for class campus lookups
CREATE INDEX IF NOT EXISTS idx_classes_campus ON classes(campus_id);

-- Add index for class_subjects lookups
CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher ON class_subjects(teacher_id);
