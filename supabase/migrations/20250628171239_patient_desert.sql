/*
  # Fix Supabase Setup - Database Structure Only

  1. New Tables
    - `leads`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, required)
      - `email` (text, required)
      - `phone` (text, optional)
      - `deal_value` (decimal, default 0)
      - `stage` (text, required, default 'New')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `leads` table
    - Add policies for users to manage their own leads only

  3. Indexes
    - Index on user_id for performance
    - Index on stage for filtering
    - Index on created_at for sorting

  Note: Demo user creation removed to avoid auth constraints.
  Users should be created through Supabase Auth UI or sign-up flow.
*/

-- Create leads table
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

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON leads(user_id);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads(stage);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);

-- Create function to update updated_at column
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