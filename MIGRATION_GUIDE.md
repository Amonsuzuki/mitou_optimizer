# Migration Guide: Multi-Session Esquisse Support

This guide explains how to migrate the database to support multiple esquisse sessions per user.

## Overview

The migration updates the `esquisse_sessions` table to allow multiple sessions per user instead of just one. This enables users to:
- Create multiple esquisse conversations (esquisse, esquisse2, etc.)
- View and resume past sessions
- Keep all their esquisse history

## Database Changes

### Before Migration
- One session per user (UNIQUE constraint on `user_id`)
- No session names
- No active/inactive tracking

### After Migration
- Multiple sessions per user
- Each session has a unique name (UNIQUE constraint on `user_id, session_name`)
- Active session tracking with `is_active` field

## Migration Steps

### Step 1: Backup Existing Data

Before making any changes, backup your existing esquisse sessions:

```sql
-- Export existing sessions to a backup table
CREATE TABLE esquisse_sessions_backup AS 
SELECT * FROM esquisse_sessions;
```

### Step 2: Drop Existing Table (if needed)

If you're starting fresh or want to recreate the table:

```sql
-- Drop the existing table and all related objects
DROP TABLE IF EXISTS esquisse_sessions CASCADE;
```

### Step 3: Create New Table Schema

Run the updated schema from `supabase-schema.sql`:

```sql
-- Create the new esquisse_sessions table
CREATE TABLE IF NOT EXISTS esquisse_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  approach TEXT NOT NULL CHECK (approach IN ('forward', 'backward')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT esquisse_sessions_user_session_unique UNIQUE (user_id, session_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_esquisse_sessions_user_id ON esquisse_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_esquisse_sessions_session_name ON esquisse_sessions(session_name);
CREATE INDEX IF NOT EXISTS idx_esquisse_sessions_is_active ON esquisse_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_esquisse_sessions_updated_at ON esquisse_sessions(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE esquisse_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own esquisse sessions"
  ON esquisse_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own esquisse sessions"
  ON esquisse_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own esquisse sessions"
  ON esquisse_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own esquisse sessions"
  ON esquisse_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic updated_at
CREATE TRIGGER update_esquisse_sessions_updated_at
  BEFORE UPDATE ON esquisse_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON esquisse_sessions TO service_role;
GRANT ALL ON esquisse_sessions TO authenticated;
```

### Step 4: Migrate Existing Data (Optional)

If you have existing sessions you want to preserve:

```sql
-- Migrate existing sessions, giving them the default 'esquisse' name
INSERT INTO esquisse_sessions (
  user_id, 
  session_name, 
  approach, 
  messages, 
  current_step, 
  completed, 
  is_active,
  updated_at, 
  created_at
)
SELECT 
  user_id,
  'esquisse' as session_name,
  approach,
  messages,
  current_step,
  completed,
  true as is_active,
  updated_at,
  created_at
FROM esquisse_sessions_backup;
```

### Step 5: Verify Migration

Check that the migration was successful:

```sql
-- Count sessions before and after
SELECT COUNT(*) as backup_count FROM esquisse_sessions_backup;
SELECT COUNT(*) as new_count FROM esquisse_sessions;

-- Verify schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'esquisse_sessions'
ORDER BY ordinal_position;

-- Verify unique constraint
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'esquisse_sessions';
```

### Step 6: Clean Up

Once you've verified everything works:

```sql
-- Remove backup table (only after confirming everything works!)
-- DROP TABLE esquisse_sessions_backup;
```

## Testing

After migration, test the following:

1. **Create a new session**: Start a new esquisse conversation
2. **Create multiple sessions**: Start another esquisse conversation (should create esquisse2)
3. **List sessions**: Verify the session list shows all sessions
4. **Resume session**: Click on a past session to resume it
5. **Switch sessions**: Switch between different sessions
6. **Complete session**: Complete a session and verify it's marked as completed
7. **Apply to form**: Apply a completed session to the form

## Rollback Plan

If you need to rollback:

```sql
-- Restore from backup
DROP TABLE IF EXISTS esquisse_sessions;
CREATE TABLE esquisse_sessions AS SELECT * FROM esquisse_sessions_backup;

-- Recreate the old unique constraint
ALTER TABLE esquisse_sessions 
ADD CONSTRAINT esquisse_sessions_user_id_unique UNIQUE (user_id);
```

## Support

If you encounter issues during migration:
1. Check the Supabase logs for any error messages
2. Verify that the `update_updated_at_column()` function exists
3. Ensure RLS policies are properly configured
4. Check that all indexes were created successfully
