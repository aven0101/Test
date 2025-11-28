-- Add is_active column to user table if it doesn't exist
-- Run this migration if you get "Unknown column 'u.is_active'" error

USE psfss;

-- Add is_active column if it doesn't exist
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE AFTER assigned_to;

-- Add is_deleted column if it doesn't exist
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE AFTER is_active;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_is_active ON user(is_active);
CREATE INDEX IF NOT EXISTS idx_is_deleted ON user(is_deleted);

-- Update any NULL values to default
UPDATE user SET is_active = TRUE WHERE is_active IS NULL;
UPDATE user SET is_deleted = FALSE WHERE is_deleted IS NULL;

SELECT 'Migration completed successfully!' as message;

