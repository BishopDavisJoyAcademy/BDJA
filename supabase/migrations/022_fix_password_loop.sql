-- ============================================================
-- BDJA Migration 022: Fix password_changed loop + backfill
-- ============================================================

-- Ensure password_changed column exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='password_changed') THEN
    ALTER TABLE public.profiles ADD COLUMN password_changed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Backfill: existing users (created > 1 hour ago) who already have passwords
UPDATE profiles
SET password_changed = true
WHERE password_changed IS NULL
  AND created_at < NOW() - INTERVAL '1 hour';

-- For any remaining NULLs, set to false so they get prompted
UPDATE profiles
SET password_changed = false
WHERE password_changed IS NULL;
