-- Create runtime_errors table for error capture system
CREATE TABLE IF NOT EXISTS runtime_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack TEXT,
  component TEXT,
  url TEXT NOT NULL DEFAULT 'unknown',
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  source TEXT NOT NULL DEFAULT 'client' CHECK (source IN ('client', 'server', 'api')),
  resolved BOOLEAN NOT NULL DEFAULT false,
  joy_analysis TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE runtime_errors ENABLE ROW LEVEL SECURITY;

-- Only admins can view errors
CREATE POLICY "Admins can view all errors" ON runtime_errors
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_category = 'admin'
  ));

-- Only admins can update errors
CREATE POLICY "Admins can update errors" ON runtime_errors
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_category = 'admin'
  ));

-- Only admins can delete errors
CREATE POLICY "Admins can delete errors" ON runtime_errors
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_category = 'admin'
  ));

-- Anyone can insert errors (for client-side error reporting)
CREATE POLICY "Anyone can insert errors" ON runtime_errors
  FOR INSERT WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_runtime_errors_timestamp ON runtime_errors(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_errors_resolved ON runtime_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_runtime_errors_source ON runtime_errors(source);
