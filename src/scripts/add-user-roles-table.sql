-- Migration script to add user_roles table for supporting multiple roles per user
-- This enables super_admins to have both super_admin and admin roles simultaneously

USE psfss;

-- Create user_roles table to support multiple roles per user
CREATE TABLE IF NOT EXISTS user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36) NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by CHAR(36) NULL COMMENT 'User ID who assigned this role',
    is_active BOOLEAN DEFAULT TRUE,
    can_reassign BOOLEAN DEFAULT TRUE COMMENT 'If false, this role cannot be reassigned once removed',
    removed_at TIMESTAMP NULL,
    removed_by CHAR(36) NULL COMMENT 'User ID who removed this role',
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id),
    INDEX idx_is_active (is_active),
    UNIQUE KEY unique_user_role (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_by) REFERENCES user(id) ON DELETE SET NULL,
    FOREIGN KEY (removed_by) REFERENCES user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing users to user_roles table
-- This will create entries for all existing users based on their current role_id
INSERT INTO user_roles (user_id, role_id, assigned_at, is_active, can_reassign)
SELECT 
    id as user_id,
    role_id,
    created_at as assigned_at,
    TRUE as is_active,
    TRUE as can_reassign
FROM user
WHERE is_deleted = FALSE
ON DUPLICATE KEY UPDATE is_active = TRUE;

-- For super_admins, also add admin role by default
-- This allows them to choose between super_admin and admin on login
INSERT INTO user_roles (user_id, role_id, assigned_at, is_active, can_reassign)
SELECT 
    id as user_id,
    3 as role_id, -- admin role_id
    created_at as assigned_at,
    TRUE as is_active,
    TRUE as can_reassign
FROM user
WHERE role_id = 4 -- super_admin role_id
  AND is_deleted = FALSE
ON DUPLICATE KEY UPDATE is_active = TRUE;

COMMIT;

