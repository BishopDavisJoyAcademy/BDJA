-- Migration: Add max_score column to assignments table
-- Fixes TypeScript build errors where API routes select/insert max_score
-- that doesn't exist in the schema

-- Add max_score column with sensible default
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 100;

-- Update existing rows to have a default max_score
UPDATE public.assignments
SET max_score = 100
WHERE max_score IS NULL;

COMMENT ON COLUMN public.assignments.max_score IS 'Maximum score possible for this assignment';
