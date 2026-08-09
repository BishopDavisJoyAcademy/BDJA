-- ============================================================
-- BDJA Migration 023: First-login security hardening
-- ============================================================

-- Ensure password_changed exists and is not null
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='password_changed') THEN
    ALTER TABLE public.profiles ADD COLUMN password_changed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Backfill: users created before this system who already have real passwords
UPDATE profiles
SET password_changed = true
WHERE password_changed IS NULL
  AND created_at < NOW() - INTERVAL '1 hour';

-- Any remaining NULLs need to set password on next login
UPDATE profiles
SET password_changed = false
WHERE password_changed IS NULL;

-- Ensure temp_password_hash exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='temp_password_hash') THEN
    ALTER TABLE public.profiles ADD COLUMN temp_password_hash TEXT;
  END IF;
END $$;
