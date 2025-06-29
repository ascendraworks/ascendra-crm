/*
  # Create demo user for login

  1. New User
    - Creates a demo user with email `demo@ascendra.com`
    - Sets password to `demo123456`
    - Uses Supabase's proper auth functions
  
  2. Security
    - User is created using auth.users table properly
    - Password is hashed correctly
    - Email confirmation is handled properly
*/

-- First, clean up any existing demo user
DELETE FROM auth.identities WHERE provider = 'email' AND identity_data->>'email' = 'demo@ascendra.com';
DELETE FROM auth.users WHERE email = 'demo@ascendra.com';

-- Create the demo user with proper Supabase auth functions
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Insert user into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    phone_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change,
    email_change_token_new,
    email_change_token_current,
    confirmation_token,
    recovery_token,
    reauthentication_token,
    reauthentication_sent_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'demo@ascendra.com',
    crypt('demo123456', gen_salt('bf')),
    now(),
    null,
    null,
    null,
    null,
    null,
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    now(),
    now(),
    null,
    '',
    '',
    null,
    '',
    '',
    '',
    '',
    '',
    '',
    null
  ) RETURNING id INTO user_id;

  -- Insert identity
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    user_id,
    format('{"sub":"%s","email":"%s"}', user_id, 'demo@ascendra.com')::jsonb,
    'email',
    null,
    now(),
    now()
  );
END $$;