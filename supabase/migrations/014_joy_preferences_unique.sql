-- Migration: 014_joy_preferences_unique
-- Fixes: joy_user_preferences missing UNIQUE constraint on user_id
-- causing upsert with onConflict: "user_id" to fail with 500

-- First, deduplicate existing rows (keep the most recent)
DELETE FROM public.joy_user_preferences
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.joy_user_preferences
  ORDER BY user_id, updated_at DESC
);

-- Add UNIQUE constraint (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'joy_user_preferences_user_id_unique'
    AND conrelid = 'public.joy_user_preferences'::regclass
  ) THEN
    ALTER TABLE public.joy_user_preferences
    ADD CONSTRAINT joy_user_preferences_user_id_unique
    UNIQUE (user_id);
  END IF;
END $$;

-- Add foreign key (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'joy_user_preferences_user_id_fkey'
    AND conrelid = 'public.joy_user_preferences'::regclass
  ) THEN
    ALTER TABLE public.joy_user_preferences
    ADD CONSTRAINT joy_user_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_joy_user_preferences_user_id
ON public.joy_user_preferences(user_id);

COMMENT ON TABLE public.joy_user_preferences IS 'User preferences for Joy AI chat — one row per user';
