-- Add address table and link to user
-- Run this migration to add address functionality

USE psfss;

-- Create address table
CREATE TABLE IF NOT EXISTS address (
    id CHAR(36) PRIMARY KEY,
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_city (city),
    INDEX idx_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add address_id column to user table (will error if exists, that's okay)
SET @column_exists := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'psfss' 
    AND TABLE_NAME = 'user' 
    AND COLUMN_NAME = 'address_id'
);

SET @sql := IF(
    @column_exists = 0,
    'ALTER TABLE user ADD COLUMN address_id CHAR(36) NULL AFTER business_id',
    'SELECT "Column address_id already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint (will error if exists, that's okay)
SET @fk_exists := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = 'psfss' 
    AND TABLE_NAME = 'user' 
    AND CONSTRAINT_NAME = 'fk_user_address'
);

SET @sql := IF(
    @fk_exists = 0,
    'ALTER TABLE user ADD CONSTRAINT fk_user_address FOREIGN KEY (address_id) REFERENCES address(id) ON DELETE SET NULL',
    'SELECT "Foreign key fk_user_address already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index (will error if exists, that's okay)
SET @idx_exists := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'psfss' 
    AND TABLE_NAME = 'user' 
    AND INDEX_NAME = 'idx_address_id'
);

SET @sql := IF(
    @idx_exists = 0,
    'CREATE INDEX idx_address_id ON user(address_id)',
    'SELECT "Index idx_address_id already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Address table migration completed successfully!' as message;

