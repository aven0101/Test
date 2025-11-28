-- Debug script to check admin role assignments
-- Run this to see what's happening with your admin roles

USE psfss;

-- 1. Check both users and their business_ids
SELECT 
    id,
    email,
    first_name,
    last_name,
    role_id,
    business_id,
    is_active,
    is_deleted
FROM user
WHERE email IN ('waleed@test.com', 'standard22@tt.com');

-- 2. Check user_roles table for both users
SELECT 
    ur.id,
    ur.user_id,
    u.email,
    ur.role_id,
    r.name as role_name,
    ur.is_active,
    ur.can_reassign,
    ur.assigned_at,
    u.business_id
FROM user_roles ur
LEFT JOIN user u ON ur.user_id = u.id
LEFT JOIN role r ON ur.role_id = r.id
WHERE u.email IN ('waleed@test.com', 'standard22@tt.com')
ORDER BY u.email, ur.role_id;

-- 3. Count admins in each business
SELECT 
    u.business_id,
    COUNT(DISTINCT ur.user_id) as admin_count,
    GROUP_CONCAT(u.email) as admin_emails
FROM user_roles ur
LEFT JOIN user u ON ur.user_id = u.id
WHERE ur.role_id = 3  -- admin role
  AND ur.is_active = TRUE
  AND u.is_deleted = FALSE
  AND u.is_active = TRUE
GROUP BY u.business_id;

-- 4. Check if standard22@tt.com has admin role in user_roles
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM user_roles ur 
            LEFT JOIN user u ON ur.user_id = u.id
            WHERE u.email = 'standard22@tt.com' 
              AND ur.role_id = 3 
              AND ur.is_active = TRUE
        ) 
        THEN 'YES - standard22@tt.com has admin role in user_roles'
        ELSE 'NO - standard22@tt.com does NOT have admin role in user_roles'
    END as status;

-- 5. FIX: If the admin role is missing from user_roles, run this:
-- (Uncomment the lines below if you need to add the role)

-- Get the user_id for standard22@tt.com
-- SET @user_id = (SELECT id FROM user WHERE email = 'standard22@tt.com');

-- Add admin role to user_roles table
-- INSERT INTO user_roles (user_id, role_id, is_active, can_reassign, assigned_at)
-- VALUES (@user_id, 3, TRUE, TRUE, CURRENT_TIMESTAMP)
-- ON DUPLICATE KEY UPDATE is_active = TRUE, assigned_at = CURRENT_TIMESTAMP;

-- Verify it was added
-- SELECT * FROM user_roles WHERE user_id = @user_id;

