/*
  # Make email field optional in leads table

  1. Changes
    - Remove NOT NULL constraint from email column
    - Update existing data to handle any null emails
    - Ensure RLS policies still work correctly

  2. Security
    - Maintains existing RLS policies
    - No changes to user permissions
*/

-- Remove NOT NULL constraint from email column
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;

-- Update any existing records with empty emails to NULL (cleanup)
UPDATE leads SET email = NULL WHERE email = '';