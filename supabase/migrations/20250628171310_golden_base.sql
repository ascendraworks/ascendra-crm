/*
  # Fix Duplicate Policy Error

  This migration safely handles the case where policies might already exist
  by checking for their existence before attempting to create them.

  1. Check and create table if needed
  2. Enable RLS if not already enabled
  3. Create policies only if they don't exist
  4. Create indexes and triggers
*/

-- Ensure the leads table exists
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  deal_value decimal(12,2) DEFAULT 0,
  stage text NOT NULL DEFAULT 'New' CHECK (stage IN ('New', 'Contacted', 'Qualified', 'Closed Won', 'Closed Lost')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'leads' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies only if they don't exist
DO $$
BEGIN
  -- Policy for reading own leads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'leads' 
    AND policyname = 'Users can read own leads'
  ) THEN
    CREATE POLICY "Users can read own leads"
      ON leads
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for inserting own leads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'leads' 
    AND policyname = 'Users can insert own leads'
  ) THEN
    CREATE POLICY "Users can insert own leads"
      ON leads
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for updating own leads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'leads' 
    AND policyname = 'Users can update own leads'
  ) THEN
    CREATE POLICY "Users can update own leads"
      ON leads
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for deleting own leads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'leads' 
    AND policyname = 'Users can delete own leads'
  ) THEN
    CREATE POLICY "Users can delete own leads"
      ON leads
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for performance (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON leads(user_id);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads(stage);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);

-- Create or replace function to update updated_at column
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_leads_updated_at_trigger ON leads;
CREATE TRIGGER update_leads_updated_at_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();