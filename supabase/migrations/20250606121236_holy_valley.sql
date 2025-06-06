/*
  # Authentication and Admin System

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on admin_users table
    - Add policies for admin management
*/

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "Allow authenticated users to read admin_users" ON admin_users
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert admin_users" ON admin_users
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update admin_users" ON admin_users
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete admin_users" ON admin_users
  FOR DELETE 
  TO authenticated
  USING (true);

-- Insert a default admin user (you'll need to replace this with an actual user ID)
-- This is just a placeholder - you'll need to create a user first and then add them as admin
-- INSERT INTO admin_users (user_id, email, is_active) 
-- VALUES ('your-user-id-here', 'admin@example.com', true);