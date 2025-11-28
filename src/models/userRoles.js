const { executeQuery } = require("../config/database");

/**
 * Get all active roles for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of role objects
 */
const getUserRoles = async (userId) => {
	return await executeQuery(
		`
    SELECT ur.*, r.name as role_name, r.description as role_description
    FROM user_roles ur
    LEFT JOIN role r ON ur.role_id = r.id
    WHERE ur.user_id = ? AND ur.is_active = TRUE
    ORDER BY r.id DESC;
    `,
		[userId],
	);
};

/**
 * Get all active role names for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} Array of role names
 */
const getUserRoleNames = async (userId) => {
	const roles = await getUserRoles(userId);
	return roles.map((role) => role.role_name);
};

/**
 * Check if user has a specific role (active)
 * @param {string} userId - User ID
 * @param {number} roleId - Role ID
 * @returns {Promise<boolean>} True if user has the role
 */
const userHasRole = async (userId, roleId) => {
	const [result] = await executeQuery(
		`
    SELECT COUNT(*) as count
    FROM user_roles
    WHERE user_id = ? AND role_id = ? AND is_active = TRUE;
    `,
		[userId, roleId],
	);
	return result.count > 0;
};

/**
 * Check if user can reassign a specific role
 * @param {string} userId - User ID
 * @param {number} roleId - Role ID
 * @returns {Promise<boolean>} True if the role can be reassigned
 */
const canReassignRole = async (userId, roleId) => {
	const [result] = await executeQuery(
		`
    SELECT can_reassign
    FROM user_roles
    WHERE user_id = ? AND role_id = ?
    ORDER BY assigned_at DESC
    LIMIT 1;
    `,
		[userId, roleId],
	);
	return result ? result.can_reassign : true;
};

/**
 * Add a role to a user
 * @param {string} userId - User ID
 * @param {number} roleId - Role ID
 * @param {string} assignedBy - User ID who is assigning the role
 * @param {boolean} canReassign - Whether this role can be reassigned if removed (default: true)
 * @returns {Promise<void>}
 */
const addUserRole = async (userId, roleId, assignedBy = null, canReassign = true) => {
	await executeQuery(
		`
    INSERT INTO user_roles (user_id, role_id, assigned_by, is_active, can_reassign)
    VALUES (?, ?, ?, TRUE, ?)
    ON DUPLICATE KEY UPDATE 
      is_active = TRUE,
      assigned_at = CURRENT_TIMESTAMP,
      assigned_by = VALUES(assigned_by),
      removed_at = NULL,
      removed_by = NULL;
    `,
		[userId, roleId, assignedBy, canReassign],
	);
};

/**
 * Remove a role from a user
 * @param {string} userId - User ID
 * @param {number} roleId - Role ID
 * @param {string} removedBy - User ID who is removing the role
 * @param {boolean} preventReassign - If true, sets can_reassign to false (default: false)
 * @returns {Promise<void>}
 */
const removeUserRole = async (userId, roleId, removedBy = null, preventReassign = false) => {
	if (preventReassign) {
		await executeQuery(
			`
      UPDATE user_roles
      SET is_active = FALSE,
          removed_at = CURRENT_TIMESTAMP,
          removed_by = ?,
          can_reassign = FALSE
      WHERE user_id = ? AND role_id = ?;
      `,
			[removedBy, userId, roleId],
		);
	} else {
		await executeQuery(
			`
      UPDATE user_roles
      SET is_active = FALSE,
          removed_at = CURRENT_TIMESTAMP,
          removed_by = ?
      WHERE user_id = ? AND role_id = ?;
      `,
			[removedBy, userId, roleId],
		);
	}
};

/**
 * Count active users with a specific role
 * @param {number} roleId - Role ID
 * @returns {Promise<number>} Count of users with the role
 */
const countUsersWithRole = async (roleId) => {
	const [result] = await executeQuery(
		`
    SELECT COUNT(DISTINCT ur.user_id) as count
    FROM user_roles ur
    LEFT JOIN user u ON ur.user_id = u.id
    WHERE ur.role_id = ? 
      AND ur.is_active = TRUE
      AND u.is_deleted = FALSE
      AND u.is_active = TRUE;
    `,
		[roleId],
	);
	return result.count;
};

/**
 * Count active users with a specific role, excluding a specific user
 * @param {number} roleId - Role ID
 * @param {string} excludeUserId - User ID to exclude from count
 * @returns {Promise<number>} Count of users with the role (excluding specified user)
 */
const countOtherUsersWithRole = async (roleId, excludeUserId) => {
	const [result] = await executeQuery(
		`
    SELECT COUNT(DISTINCT ur.user_id) as count
    FROM user_roles ur
    LEFT JOIN user u ON ur.user_id = u.id
    WHERE ur.role_id = ? 
      AND ur.user_id != ?
      AND ur.is_active = TRUE
      AND u.is_deleted = FALSE
      AND u.is_active = TRUE;
    `,
		[roleId, excludeUserId],
	);
	return result.count;
};

/**
 * Count active users with a specific role in the same business, excluding a specific user
 * @param {number} roleId - Role ID
 * @param {string} excludeUserId - User ID to exclude from count
 * @param {string} businessId - Business ID to filter by
 * @returns {Promise<number>} Count of users with the role in the same business (excluding specified user)
 */
const countOtherUsersWithRoleInBusiness = async (roleId, excludeUserId, businessId) => {
	const [result] = await executeQuery(
		`
    SELECT COUNT(DISTINCT ur.user_id) as count
    FROM user_roles ur
    LEFT JOIN user u ON ur.user_id = u.id
    WHERE ur.role_id = ? 
      AND ur.user_id != ?
      AND u.business_id = ?
      AND ur.is_active = TRUE
      AND u.is_deleted = FALSE
      AND u.is_active = TRUE;
    `,
		[roleId, excludeUserId, businessId],
	);
	return result.count;
};

/**
 * Get all users with a specific role
 * @param {number} roleId - Role ID
 * @returns {Promise<Array>} Array of users with the role
 */
const getUsersWithRole = async (roleId) => {
	return await executeQuery(
		`
    SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.role_id
    FROM user_roles ur
    LEFT JOIN user u ON ur.user_id = u.id
    WHERE ur.role_id = ? 
      AND ur.is_active = TRUE
      AND u.is_deleted = FALSE
      AND u.is_active = TRUE;
    `,
		[roleId],
	);
};

/**
 * Initialize roles for a new user based on their primary role_id
 * @param {string} userId - User ID
 * @param {number} primaryRoleId - Primary role ID from user table
 * @returns {Promise<void>}
 */
const initializeUserRoles = async (userId, primaryRoleId) => {
	// Add primary role
	await addUserRole(userId, primaryRoleId, null, true);

	// If super_admin (role_id = 4), also add admin role (role_id = 3)
	if (primaryRoleId === 4) {
		await addUserRole(userId, 3, null, true);
	}
};

/**
 * Get role assignment history for a user
 * @param {string} userId - User ID
 * @param {number} roleId - Role ID (optional)
 * @returns {Promise<Array>} Array of role assignment records
 */
const getRoleHistory = async (userId, roleId = null) => {
	const query = roleId
		? `
    SELECT ur.*, r.name as role_name,
           assigner.first_name as assigned_by_first_name,
           assigner.last_name as assigned_by_last_name,
           remover.first_name as removed_by_first_name,
           remover.last_name as removed_by_last_name
    FROM user_roles ur
    LEFT JOIN role r ON ur.role_id = r.id
    LEFT JOIN user assigner ON ur.assigned_by = assigner.id
    LEFT JOIN user remover ON ur.removed_by = remover.id
    WHERE ur.user_id = ? AND ur.role_id = ?
    ORDER BY ur.assigned_at DESC;
    `
		: `
    SELECT ur.*, r.name as role_name,
           assigner.first_name as assigned_by_first_name,
           assigner.last_name as assigned_by_last_name,
           remover.first_name as removed_by_first_name,
           remover.last_name as removed_by_last_name
    FROM user_roles ur
    LEFT JOIN role r ON ur.role_id = r.id
    LEFT JOIN user assigner ON ur.assigned_by = assigner.id
    LEFT JOIN user remover ON ur.removed_by = remover.id
    WHERE ur.user_id = ?
    ORDER BY ur.assigned_at DESC;
    `;

	return await executeQuery(query, roleId ? [userId, roleId] : [userId]);
};

module.exports = {
	getUserRoles,
	getUserRoleNames,
	userHasRole,
	canReassignRole,
	addUserRole,
	removeUserRole,
	countUsersWithRole,
	countOtherUsersWithRole,
	countOtherUsersWithRoleInBusiness,
	getUsersWithRole,
	initializeUserRoles,
	getRoleHistory,
};

