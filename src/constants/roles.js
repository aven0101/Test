/**
 * User Role Constants
 *
 * Centralized definition of all user roles in the system.
 * These match the role table in the database.
 *
 * Role Hierarchy:
 * 1. super_admin - Can create admins
 * 2. admin - Can create managers and standard_users
 * 3. manager - Can create standard_users (auto-assigned to manager)
 * 4. standard_user - Regular users
 */

// Role IDs (matches role table primary keys)
const ROLE_IDS = {
	STANDARD_USER: 1,
	MANAGER: 2,
	ADMIN: 3,
	SUPER_ADMIN: 4,
};

// Role Names (for string comparison)
const ROLES = {
	STANDARD_USER: "standard_user",
	MANAGER: "manager",
	ADMIN: "admin",
	SUPER_ADMIN: "super_admin",
};

// Map role names to IDs
const ROLE_NAME_TO_ID = {
	[ROLES.STANDARD_USER]: ROLE_IDS.STANDARD_USER,
	[ROLES.MANAGER]: ROLE_IDS.MANAGER,
	[ROLES.ADMIN]: ROLE_IDS.ADMIN,
	[ROLES.SUPER_ADMIN]: ROLE_IDS.SUPER_ADMIN,
};

// Map role IDs to names
const ROLE_ID_TO_NAME = {
	[ROLE_IDS.STANDARD_USER]: ROLES.STANDARD_USER,
	[ROLE_IDS.MANAGER]: ROLES.MANAGER,
	[ROLE_IDS.ADMIN]: ROLES.ADMIN,
	[ROLE_IDS.SUPER_ADMIN]: ROLES.SUPER_ADMIN,
};

// Array of all roles (for validation)
const ALL_ROLES = [ROLES.STANDARD_USER, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN];
const ALL_ROLE_IDS = [ROLE_IDS.STANDARD_USER, ROLE_IDS.MANAGER, ROLE_IDS.ADMIN, ROLE_IDS.SUPER_ADMIN];

// Regular user roles (non-management)
const REGULAR_USER_ROLES = [ROLES.STANDARD_USER];
const REGULAR_USER_ROLE_IDS = [ROLE_IDS.STANDARD_USER];

// Management roles (can manage users)
const MANAGEMENT_ROLES = [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN];
const MANAGEMENT_ROLE_IDS = [ROLE_IDS.MANAGER, ROLE_IDS.ADMIN, ROLE_IDS.SUPER_ADMIN];

// Admin roles (for middleware authentication)
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER];
const ADMIN_ROLE_IDS = [ROLE_IDS.ADMIN, ROLE_IDS.SUPER_ADMIN, ROLE_IDS.MANAGER];

// Roles that super_admin can select when logging in
const SUPER_ADMIN_SELECTABLE_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
const SUPER_ADMIN_SELECTABLE_ROLE_IDS = [ROLE_IDS.ADMIN, ROLE_IDS.SUPER_ADMIN];

// Roles that super_admin mode can create
const SUPER_ADMIN_CAN_CREATE = [ROLES.ADMIN];
const SUPER_ADMIN_CAN_CREATE_IDS = [ROLE_IDS.ADMIN];

// Roles that admin mode can create
const ADMIN_CAN_CREATE = [ROLES.MANAGER, ROLES.STANDARD_USER];
const ADMIN_CAN_CREATE_IDS = [ROLE_IDS.MANAGER, ROLE_IDS.STANDARD_USER];

// Roles that manager can create
const MANAGER_CAN_CREATE = [ROLES.STANDARD_USER];
const MANAGER_CAN_CREATE_IDS = [ROLE_IDS.STANDARD_USER];

// Roles that can be assigned when creating business users
const BUSINESS_USER_ROLES = [ROLES.STANDARD_USER, ROLES.ADMIN, ROLES.MANAGER];
const BUSINESS_USER_ROLE_IDS = [ROLE_IDS.STANDARD_USER, ROLE_IDS.ADMIN, ROLE_IDS.MANAGER];

module.exports = {
	ROLES,
	ROLE_IDS,
	ROLE_NAME_TO_ID,
	ROLE_ID_TO_NAME,
	ALL_ROLES,
	ALL_ROLE_IDS,
	REGULAR_USER_ROLES,
	REGULAR_USER_ROLE_IDS,
	MANAGEMENT_ROLES,
	MANAGEMENT_ROLE_IDS,
	ADMIN_ROLES,
	ADMIN_ROLE_IDS,
	SUPER_ADMIN_SELECTABLE_ROLES,
	SUPER_ADMIN_SELECTABLE_ROLE_IDS,
	SUPER_ADMIN_CAN_CREATE,
	SUPER_ADMIN_CAN_CREATE_IDS,
	ADMIN_CAN_CREATE,
	ADMIN_CAN_CREATE_IDS,
	MANAGER_CAN_CREATE,
	MANAGER_CAN_CREATE_IDS,
	BUSINESS_USER_ROLES,
	BUSINESS_USER_ROLE_IDS,
};
