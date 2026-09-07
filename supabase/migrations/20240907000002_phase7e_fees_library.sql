-- Migration: Phase 7E - Fee Reminders & Library Fines
-- Created: 2024-09-07

-- Fee Reminders Table
CREATE TABLE IF NOT EXISTS fee_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('upcoming', 'overdue', 'final')),
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_reminders_structure ON fee_reminders(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_reminders_student ON fee_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_reminders_status ON fee_reminders(status);

-- Library Fines Table
CREATE TABLE IF NOT EXISTS library_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id UUID NOT NULL REFERENCES library_borrowings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_fines_borrowing ON library_fines(borrowing_id);
CREATE INDEX IF NOT EXISTS idx_library_fines_paid ON library_fines(paid);

-- Add barcode column to library_resources
ALTER TABLE library_resources
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Add category column to library_resources
ALTER TABLE library_resources
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add publisher column to library_resources
ALTER TABLE library_resources
ADD COLUMN IF NOT EXISTS publisher TEXT;

-- Add publication_year column to library_resources
ALTER TABLE library_resources
ADD COLUMN IF NOT EXISTS publication_year INTEGER;

-- Add location column to library_resources
ALTER TABLE library_resources
ADD COLUMN IF NOT EXISTS location TEXT;
