-- BDJA Migration 014: Joy AI System — Conversations, Preferences, Analytics

-- ============================================
-- 1. Conversations
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- ============================================
-- 2. Conversation Messages
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created ON conversation_messages(created_at);

-- ============================================
-- 3. Joy User Preferences (Themes, Personality, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS joy_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light',
  personality_mode TEXT NOT NULL DEFAULT 'auto',
  language_preference TEXT NOT NULL DEFAULT 'auto',
  show_timestamps BOOLEAN DEFAULT true,
  enable_sound BOOLEAN DEFAULT true,
  enable_streaming BOOLEAN DEFAULT true,
  font_size TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- 4. Joy Analytics (Admin Insights)
-- ============================================
CREATE TABLE IF NOT EXISTS joy_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  role TEXT,
  resolved BOOLEAN DEFAULT false,
  response_time_ms INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_joy_analytics_user ON joy_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_joy_analytics_category ON joy_analytics(category);
CREATE INDEX IF NOT EXISTS idx_joy_analytics_created ON joy_analytics(created_at DESC);

-- ============================================
-- 5. Joy Actions Log (Audit trail for admin actions via Joy)
-- ============================================
CREATE TABLE IF NOT EXISTS joy_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_joy_actions_user ON joy_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_joy_actions_type ON joy_actions(action_type);

-- ============================================
-- 6. RLS Policies
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE joy_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE joy_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE joy_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own conversations" ON conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own messages" ON conversation_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users own preferences" ON joy_user_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins view analytics" ON joy_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
  );

CREATE POLICY "Admins view actions" ON joy_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_category = 'admin')
  );

-- ============================================
-- 7. Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversations_updated ON conversations;
CREATE TRIGGER trg_conversations_updated
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_joy_prefs_updated ON joy_user_preferences;
CREATE TRIGGER trg_joy_prefs_updated
  BEFORE UPDATE ON joy_user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
