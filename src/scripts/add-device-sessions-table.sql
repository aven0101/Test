-- Migration: Add device sessions table for tracking logged-in devices
-- Run this script to add device session tracking functionality

USE psfss;

-- Create Device Sessions Table
CREATE TABLE IF NOT EXISTS device_session (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    browser_version VARCHAR(50),
    os VARCHAR(100),
    os_version VARCHAR(50),
    ip_address VARCHAR(45),
    country VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_blocked BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_is_blocked (is_blocked),
    INDEX idx_last_active (last_active),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Device sessions table created successfully!' AS status;

