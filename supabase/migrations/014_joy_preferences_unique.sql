-- Migration: 014_joy_preferences_unique
-- Fixes: joy_user_preferences missing UNIQUE constraint on user_id

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

CREATE INDEX IF NOT EXISTS idx_joy_user_preferences_user_id
ON public.joy_user_preferences(user_id);
