/*
  # Verify and ensure leads table is properly set up

  1. Check if leads table exists and create if needed
  2. Ensure all required columns are present
  3. Verify RLS policies are in place
  4. Add any missing indexes

  This migration is idempotent and safe to run multiple times.
*/

-- Ensure the leads table exists with all required columns
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
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'leads' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Policy for reading own leads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'leads' 
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
    WHERE tablename = 'leads' 
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
    WHERE tablename = 'leads' 
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
    WHERE tablename = 'leads' 
    AND policyname = 'Users can delete own leads'
  ) THEN
    CREATE POLICY "Users can delete own leads"
      ON leads
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for performance if they don't exist
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

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at_trigger ON leads;
CREATE TRIGGER update_leads_updated_at_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Insert some sample data for the demo user if it doesn't exist
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Get the demo user ID
  SELECT id INTO demo_user_id 
  FROM auth.users 
  WHERE email = 'demo@ascendra.com' 
  LIMIT 1;

  -- Only insert sample data if demo user exists and no leads exist for them
  IF demo_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM leads WHERE user_id = demo_user_id
  ) THEN
    INSERT INTO leads (user_id, name, email, phone, deal_value, stage) VALUES
    (demo_user_id, 'John Smith', 'john.smith@example.com', '+1-555-0123', 5000.00, 'New'),
    (demo_user_id, 'Sarah Johnson', 'sarah.j@company.com', '+1-555-0124', 12000.00, 'Contacted'),
    (demo_user_id, 'Mike Chen', 'mike.chen@startup.io', '+1-555-0125', 8500.00, 'Qualified'),
    (demo_user_id, 'Emily Davis', 'emily@business.com', '+1-555-0126', 15000.00, 'Closed Won'),
    (demo_user_id, 'Robert Wilson', 'rwilson@corp.com', '+1-555-0127', 3000.00, 'Closed Lost'),
    (demo_user_id, 'Lisa Anderson', 'lisa.a@enterprise.com', '+1-555-0128', 25000.00, 'Qualified'),
    (demo_user_id, 'David Brown', 'david.brown@tech.com', '+1-555-0129', 7500.00, 'Contacted'),
    (demo_user_id, 'Jennifer Taylor', 'j.taylor@solutions.com', '+1-555-0130', 18000.00, 'New');
  END IF;
END $$;