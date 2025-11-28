const { executeQuery } = require("../config/database"),
	{ v4: uuidv4 } = require("uuid");
const { buildPaginationClause, paginatedQuery } = require("../utils/pagination");
const { buildOrderByClause } = require("../utils/sort");
const { buildFiltersClause, optional, contains, equal, searchAcross } = require("../utils/filters");

const getByEmail = async (email) => {
	const [user] = await executeQuery(
		`
		SELECT u.*, r.name as role, b.name as business_name 
		FROM user u 
		LEFT JOIN role r ON u.role_id = r.id
		LEFT JOIN business b ON u.business_id = b.id 
		WHERE u.email = ?;`,
		[email],
	);
	return user;
};

const getById = async (id) => {
	const [user] = await executeQuery(
		`
		SELECT u.*, r.name as role, b.name as business_name 
		FROM user u 
		LEFT JOIN role r ON u.role_id = r.id
		LEFT JOIN business b ON u.business_id = b.id 
		WHERE u.id=?;`,
		[id],
	);
	return user;
};

// Alias for getById
const findById = getById;

/**
 * @param {object} data new user info
 * @returns user id
 */
const create = async (data) => {
	const { email, password, name, phone, role_id = 1, account_name = "individual", business_id = null, assigned_to = null } = data;
	const userId = uuidv4();

	// Split name into first_name and last_name
	const nameParts = name.trim().split(" ");
	const first_name = nameParts[0];
	const last_name = nameParts.slice(1).join(" ") || "";

	await executeQuery(
		`
    INSERT into user (id, email, password, first_name, last_name, phone, role_id, account_name, business_id, assigned_to, is_active, is_deleted)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?);`,
		[userId, email, password, first_name, last_name, phone, role_id, account_name, business_id, assigned_to, true, false],
	);

	return { userId };
};

const get = async () => {
	return await executeQuery(
		`
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role_id, r.name as role, u.account_name, u.business_id, u.assigned_to, u.is_active, u.created_at, u.updated_at, u.last_login, b.name as business_name,
           assigned_admin.first_name as assigned_admin_first_name, assigned_admin.last_name as assigned_admin_last_name, assigned_admin.email as assigned_admin_email
    FROM user u
    LEFT JOIN role r ON u.role_id = r.id
    LEFT JOIN business b ON u.business_id = b.id
    LEFT JOIN user assigned_admin ON u.assigned_to = assigned_admin.id
    WHERE 
        u.is_deleted IS false
        AND u.is_active IS true;
    `,
	);
};

/**
 * Set the `last_login` field of a user by the given `id` to
 * CURRENT_TIMESTAMP.
 *
 * This is used for "active user" classification in our analytics.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
const updateLastLoggedIn = async (id) => {
	await executeQuery(
		`
      UPDATE user SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
		[id],
	);
};

const updateRole = async (id, role_id) => {
	await executeQuery(
		`
      UPDATE user SET role_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
		[role_id, id],
	);
};

const deleteUser = async (id) => {
	await executeQuery(
		`
      UPDATE user SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
		[id],
	);
};

const updateBusinessId = async (id, businessId) => {
	await executeQuery(
		`
      UPDATE user SET business_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
		[businessId, id],
	);
};

/**
 * Get all manager users for assignment dropdown
 * @param {string} businessId - Business ID to filter managers
 * @returns {Array} List of manager users
 */
const getManagersForAssignment = async (businessId) => {
	return await executeQuery(
		`
    SELECT u.id, u.first_name, u.last_name, u.email, r.name as role
    FROM user u
    LEFT JOIN role r ON u.role_id = r.id
    WHERE 
        u.business_id = ?
        AND r.name = 'manager'
        AND u.is_deleted IS false
        AND u.is_active IS true
    ORDER BY u.first_name, u.last_name;
    `,
		[businessId],
	);
};

/**
 * Get business users with pagination, filtering, and sorting
 * Returns one entry per active role (users with multiple roles appear multiple times)
 * @param {string} businessId - Business ID
 * @param {object} options - Query options (page, pageSize, search, role, status, orderBy, order)
 * @returns {Promise<Paginated>} Paginated result with users
 */
const getBusinessUsers = async (businessId, options = {}) => {
	const { page = 1, pageSize = 10, search, role, status = "active", orderBy, order } = options;

	// Build base query - joins with user_roles to show one entry per active role
	const baseQuery = `
    SELECT 
      u.id, 
      u.email, 
      u.first_name, 
      u.last_name, 
      u.phone, 
      r.name as role, 
      ur.role_id,
      u.is_active, 
      u.created_at, 
      u.updated_at,
      u.assigned_to,
      assigned_admin.first_name as assigned_admin_first_name,
      assigned_admin.last_name as assigned_admin_last_name,
      assigned_admin.email as assigned_admin_email
    FROM user u
    INNER JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
    LEFT JOIN role r ON ur.role_id = r.id
    LEFT JOIN user assigned_admin ON u.assigned_to = assigned_admin.id
    WHERE 
      u.business_id = ?
      AND u.is_deleted = false
  `;

	// Build filters clause (no table aliases needed - filters applied after CTE)
	const filterSpec = {
		search: optional(searchAcross(["`first_name`", "`last_name`", "`email`"])),
		role: optional(equal({ column: "role" })),
	};

	let filtersClause = buildFiltersClause({ search, role }, filterSpec);

	// Add status filter (no table alias needed because it's applied after CTE)
	if (status === "active") {
		filtersClause = filtersClause === "true" ? "is_active = 1" : `${filtersClause} AND is_active = 1`;
	} else if (status === "inactive") {
		filtersClause = filtersClause === "true" ? "is_active = 0" : `${filtersClause} AND is_active = 0`;
	}
	// If status is 'all', don't add any status filter

	// Build order by clause
	const validOrderByColumns = ["first_name", "last_name", "email", "created_at", "role"];
	const orderByColumn = validOrderByColumns.includes(orderBy) ? orderBy : "created_at";
	const orderByClause = buildOrderByClause({ orderBy: orderByColumn, order: order || "desc" });

	// Build pagination clause
	const paginationClause = buildPaginationClause({ page, pageSize });

	// Execute paginated query
	return await paginatedQuery(baseQuery, {
		params: [businessId],
		paginationClause,
		orderByClause,
		filtersClause,
	});
};

/**
 * Update user password
 * @param {string} userId - User ID
 * @param {string} hashedPassword - New hashed password
 * @returns {Promise<void>}
 */
const updatePassword = async (userId, hashedPassword) => {
	await executeQuery(
		`
      UPDATE user SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
		[hashedPassword, userId],
	);
};

/**
 * Update user email
 * @param {string} userId - User ID
 * @param {string} newEmail - New email address
 * @returns {Promise<void>}
 */
const updateEmail = async (userId, newEmail) => {
	await executeQuery(
		`
      UPDATE user SET email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
		[newEmail, userId],
	);
};

/**
 * Update user active status
 * @param {string} userId - User ID
 * @param {boolean} isActive - Active status (true/false)
 * @returns {Promise<void>}
 */
const updateUserStatus = async (userId, isActive) => {
	await executeQuery(
		`
      UPDATE user SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
		[isActive, userId],
	);
};

/**
 * Update user profile fields
 * @param {string} userId - User ID
 * @param {object} data - Fields to update (first_name, last_name, email, phone)
 * @returns {Promise<void>}
 */
const updateProfile = async (userId, data) => {
	const updates = [];
	const values = [];

	if (data.first_name !== undefined) {
		updates.push("first_name = ?");
		values.push(data.first_name);
	}
	if (data.last_name !== undefined) {
		updates.push("last_name = ?");
		values.push(data.last_name);
	}
	if (data.email !== undefined) {
		updates.push("email = ?");
		values.push(data.email);
	}
	if (data.phone !== undefined) {
		updates.push("phone = ?");
		values.push(data.phone);
	}

	if (updates.length === 0) {
		return;
	}

	updates.push("updated_at = CURRENT_TIMESTAMP");
	values.push(userId);

	await executeQuery(`UPDATE user SET ${updates.join(", ")} WHERE id = ?`, values);
};

module.exports = {
	getByEmail,
	create,
	getById,
	findById,
	get,
	updateLastLoggedIn,
	updateRole,
	deleteUser,
	updateBusinessId,
	getManagersForAssignment,
	getBusinessUsers,
	updatePassword,
	updateEmail,
	updateUserStatus,
	updateProfile,
};
