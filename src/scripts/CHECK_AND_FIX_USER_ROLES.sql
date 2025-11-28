-- Check and fix user_roles for both users
USE psfss;

-- Step 1: Check business_id for both users
SELECT 
    'Step 1: Business IDs' as info,
    email,
    business_id,
    role_id,
    (SELECT name FROM role WHERE id = u.role_id) as role_name
FROM user u
WHERE email IN ('waleeds@testing.com', 'stasndardss2s2@tt.com');

-- Step 2: Check user_roles entries
SELECT 
    'Step 2: Current user_roles entries' as info,
    u.email,
    u.business_id,
    ur.role_id,
    r.name as role_name,
    ur.is_active,
    ur.can_reassign
FROM user u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN role r ON ur.role_id = r.id
WHERE u.email IN ('waleeds@testing.com', 'stasndardss2s2@tt.com')
ORDER BY u.email, ur.role_id;

-- Step 3: Check if both users are in the same business
SELECT 
    'Step 3: Same business check' as info,
    COUNT(DISTINCT business_id) as unique_business_count,
    GROUP_CONCAT(DISTINCT business_id) as business_ids
FROM user
WHERE email IN ('waleeds@testing.com', 'stasndardss2s2@tt.com');

-- Step 4: Count admins in the business BEFORE fix
SELECT 
    'Step 4: Admin count BEFORE fix' as info,
    u.business_id,
    COUNT(DISTINCT ur.user_id) as admin_count,
    GROUP_CONCAT(u.email) as admin_emails
FROM user_roles ur
INNER JOIN user u ON ur.user_id = u.id
WHERE ur.role_id = 3 
  AND ur.is_active = TRUE
  AND u.is_deleted = FALSE
  AND u.is_active = TRUE
  AND u.business_id = (SELECT business_id FROM user WHERE email = 'waleeds@testing.com')
GROUP BY u.business_id;

-- Step 5: FIX - Add admin role to user_roles for stasndardss2s2@tt.com
INSERT INTO user_roles (user_id, role_id, is_active, can_reassign, assigned_at)
SELECT 
    u.id as user_id,
    u.role_id as role_id,
    TRUE as is_active,
    TRUE as can_reassign,
    CURRENT_TIMESTAMP as assigned_at
FROM user u
WHERE u.email = 'stasndardss2s2@tt.com'
  AND NOT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = u.id AND ur.role_id = u.role_id
  );

-- Step 6: Count admins in the business AFTER fix
SELECT 
    'Step 6: Admin count AFTER fix' as info,
    u.business_id,
    COUNT(DISTINCT ur.user_id) as admin_count,
    GROUP_CONCAT(u.email) as admin_emails
FROM user_roles ur
INNER JOIN user u ON ur.user_id = u.id
WHERE ur.role_id = 3 
  AND ur.is_active = TRUE
  AND u.is_deleted = FALSE
  AND u.is_active = TRUE
  AND u.business_id = (SELECT business_id FROM user WHERE email = 'waleeds@testing.com')
GROUP BY u.business_id;

-- Step 7: Verify the fix - show all active roles for both users
SELECT 
    'Step 7: Final verification' as info,
    u.email,
    u.business_id,
    ur.role_id,
    r.name as role_name,
    ur.is_active,
    ur.assigned_at
FROM user u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
LEFT JOIN role r ON ur.role_id = r.id
WHERE u.email IN ('waleeds@testing.com', 'stasndardss2s2@tt.com')
ORDER BY u.email, ur.role_id;

COMMIT;

-- Expected result after fix:
-- - waleeds@testing.com should have 2 roles: super_admin (4) and admin (3)
-- - stasndardss2s2@tt.com should have 1 role: admin (3)
-- - Admin count for the business should be 2

