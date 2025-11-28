-- Quick fix to add admin role to user_roles table for standard22@tt.com
-- This will allow the super_admin to remove themselves from admin role

USE psfss;

-- First, let's check the current state
SELECT 'Before Fix:' as step;
SELECT 
    u.email,
    u.role_id as user_table_role_id,
    r.name as user_table_role_name,
    COUNT(ur.id) as user_roles_count
FROM user u
LEFT JOIN role r ON u.role_id = r.id
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
WHERE u.email IN ('waleed@test.com', 'standard22@tt.com')
GROUP BY u.email, u.role_id, r.name;

-- Add admin role to user_roles for standard22@tt.com
INSERT INTO user_roles (user_id, role_id, is_active, can_reassign, assigned_at)
SELECT 
    u.id,
    3 as role_id,  -- admin role
    TRUE as is_active,
    TRUE as can_reassign,
    CURRENT_TIMESTAMP as assigned_at
FROM user u
WHERE u.email = 'standard22@tt.com'
  AND NOT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = u.id AND ur.role_id = 3
  );

-- Verify the fix
SELECT 'After Fix:' as step;
SELECT 
    u.email,
    ur.role_id,
    r.name as role_name,
    ur.is_active,
    ur.can_reassign,
    u.business_id
FROM user u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN role r ON ur.role_id = r.id
WHERE u.email IN ('waleed@test.com', 'standard22@tt.com')
  AND ur.is_active = TRUE
ORDER BY u.email, ur.role_id;

-- Count admins per business (should show 2 admins for your business now)
SELECT 'Admin count per business:' as info;
SELECT 
    u.business_id,
    COUNT(DISTINCT ur.user_id) as admin_count,
    GROUP_CONCAT(u.email ORDER BY u.email) as admin_emails
FROM user_roles ur
LEFT JOIN user u ON ur.user_id = u.id
WHERE ur.role_id = 3  -- admin role
  AND ur.is_active = TRUE
  AND u.is_deleted = FALSE
  AND u.is_active = TRUE
GROUP BY u.business_id;

COMMIT;

