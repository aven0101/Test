-- PSFSS Database Initialization Script
-- This script creates the database structure with proper role definitions

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS psfss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE psfss;

-- Drop tables if exist (for clean re-initialization)
-- Uncomment the lines below if you want to reset the database
-- DROP TABLE IF EXISTS otp;
-- DROP TABLE IF EXISTS user;
-- DROP TABLE IF EXISTS business;
-- DROP TABLE IF EXISTS role;

-- Role Table (Master table for user roles)
CREATE TABLE IF NOT EXISTS role (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert predefined roles
INSERT IGNORE INTO role (id, name, description) VALUES 
(1, 'standard_user', 'Standard user with basic permissions'),
(2, 'manager', 'Manager who can create and manage standard users'),
(3, 'admin', 'Administrator who can create managers and standard users'),
(4, 'super_admin', 'Super administrator who can create admins');

-- Business Table
CREATE TABLE IF NOT EXISTS business (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id CHAR(36) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owner_id (owner_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Table with Role ID (Foreign Key)
CREATE TABLE IF NOT EXISTS user (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50),
    phone VARCHAR(20),
    role_id INT NOT NULL DEFAULT 1,
    account_name ENUM('individual', 'business') NOT NULL DEFAULT 'individual',
    business_id CHAR(36),
    assigned_to CHAR(36) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_business_id (business_id),
    INDEX idx_role_id (role_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_is_active (is_active),
    INDEX idx_is_deleted (is_deleted),
    FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE RESTRICT,
    FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP Table for email verification
CREATE TABLE IF NOT EXISTS otp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 10 MINUTE),
    is_used BOOLEAN DEFAULT FALSE,
    INDEX idx_email (email),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_used (is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password Reset Token Table
CREATE TABLE IF NOT EXISTS password_reset_token (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 HOUR),
    is_used BOOLEAN DEFAULT FALSE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_used (is_used),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraint for business owner (if not exists)
-- Note: This constraint is added after user table creation
-- ALTER TABLE business 
-- ADD CONSTRAINT IF NOT EXISTS fk_business_owner 
-- FOREIGN KEY (owner_id) REFERENCES user(id) ON DELETE CASCADE;

COMMIT;

