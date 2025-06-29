/*
  # Add Notes Column to Leads Table

  1. Changes
    - Add `notes` column to `leads` table
    - Column is optional (nullable) text field
    - No breaking changes to existing data

  2. Security
    - Existing RLS policies automatically apply to new column
    - No additional security changes needed
*/

-- Add notes column to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'notes'
  ) THEN
    ALTER TABLE leads ADD COLUMN notes text;
  END IF;
END $$;