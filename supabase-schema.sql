-- Supabase Database Schema for MITOU Optimizer

-- DRAFTS table to store user draft application data
-- This replaces the Cloudflare KV MEMORIES_KV namespace

CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT drafts_user_id_unique UNIQUE (user_id)
);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);

-- Create an index on updated_at for potential future queries
CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only read their own drafts
CREATE POLICY "Users can view their own drafts"
  ON drafts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own drafts
CREATE POLICY "Users can insert their own drafts"
  ON drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own drafts
CREATE POLICY "Users can update their own drafts"
  ON drafts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own drafts
CREATE POLICY "Users can delete their own drafts"
  ON drafts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row update
CREATE TRIGGER update_drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (service_role has full access by default)
-- These grants ensure the service_role key can perform all operations
GRANT ALL ON drafts TO service_role;
GRANT ALL ON drafts TO authenticated;

-- ESQUISSE_SESSIONS table to store esquisse conversation sessions
-- This replaces the Cloudflare KV MEMORIES_KV namespace for esquisse data

CREATE TABLE IF NOT EXISTS esquisse_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approach TEXT NOT NULL CHECK (approach IN ('forward', 'backward')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT esquisse_sessions_user_id_unique UNIQUE (user_id)
);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_esquisse_sessions_user_id ON esquisse_sessions(user_id);

-- Create an index on updated_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_esquisse_sessions_updated_at ON esquisse_sessions(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE esquisse_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only read their own esquisse sessions
CREATE POLICY "Users can view their own esquisse sessions"
  ON esquisse_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own esquisse sessions
CREATE POLICY "Users can insert their own esquisse sessions"
  ON esquisse_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own esquisse sessions
CREATE POLICY "Users can update their own esquisse sessions"
  ON esquisse_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own esquisse sessions
CREATE POLICY "Users can delete their own esquisse sessions"
  ON esquisse_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to automatically update updated_at on row update
CREATE TRIGGER update_esquisse_sessions_updated_at
  BEFORE UPDATE ON esquisse_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON esquisse_sessions TO service_role;
GRANT ALL ON esquisse_sessions TO authenticated;
