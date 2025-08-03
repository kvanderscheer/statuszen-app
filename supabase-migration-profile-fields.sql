-- Migration: Add phone_number and timezone to user_profiles table
-- Run this in your Supabase SQL editor

-- Add phone_number column (nullable, for international phone numbers)
ALTER TABLE user_profiles 
ADD COLUMN phone_number VARCHAR(20);

-- Add timezone column with UTC as default
ALTER TABLE user_profiles 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL;

-- Add updated_at trigger to track profile updates
ALTER TABLE user_profiles 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_number ON user_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_timezone ON user_profiles(timezone);

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.phone_number IS 'User phone number in international format (E.164)';
COMMENT ON COLUMN user_profiles.timezone IS 'User timezone in IANA format (e.g., America/New_York, Europe/London)';