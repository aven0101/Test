const { executeQuery } = require("../config/database"),
	{ v4: uuidv4 } = require("uuid");

const create = async (data) => {
	const { name, description, owner_id } = data;
	const businessId = uuidv4();

	await executeQuery(
		`
    INSERT into business (id, name, description, owner_id)
    VALUES(?,?,?,?);`,
		[businessId, name, description, owner_id],
	);

	return { businessId };
};

const getById = async (id) => {
	const [business] = await executeQuery(`SELECT * FROM business WHERE id=?;`, [id]);
	return business;
};

const getByOwnerId = async (ownerId) => {
	const businesses = await executeQuery(`SELECT * FROM business WHERE owner_id=?;`, [ownerId]);
	return businesses;
};

const update = async (id, data) => {
	const { name, description } = data;

	await executeQuery(
		`
    UPDATE business 
    SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;`,
		[name, description, id],
	);
};

/**
 * Update business profile fields dynamically
 * @param {string} businessId - Business ID
 * @param {object} data - Fields to update (name, description)
 * @returns {Promise<void>}
 */
const updateProfile = async (businessId, data) => {
	const updates = [];
	const values = [];

	if (data.name !== undefined) {
		updates.push("name = ?");
		values.push(data.name);
	}
	if (data.description !== undefined) {
		updates.push("description = ?");
		values.push(data.description);
	}

	if (updates.length === 0) {
		return;
	}

	updates.push("updated_at = CURRENT_TIMESTAMP");
	values.push(businessId);

	await executeQuery(`UPDATE business SET ${updates.join(", ")} WHERE id = ?`, values);
};

const deleteBusiness = async (id) => {
	await executeQuery(`UPDATE business SET is_active = 0 WHERE id = ?;`, [id]);
};

const getUsersByBusinessId = async (businessId) => {
	return await executeQuery(
		`
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role_id, r.name as role, u.account_name, u.assigned_to, u.is_active, u.created_at, u.updated_at, u.last_login, b.name as business_name,
           CONCAT(assigned_admin.first_name, ' ', assigned_admin.last_name) as assigned_admin_name,
           assigned_admin.email as assigned_admin_email
    FROM user u
    LEFT JOIN role r ON u.role_id = r.id
    LEFT JOIN business b ON u.business_id = b.id
    LEFT JOIN user assigned_admin ON u.assigned_to = assigned_admin.id
    WHERE u.business_id = ? 
    AND u.is_deleted IS false
    AND u.is_active IS true;
    `,
		[businessId],
	);
};

module.exports = {
	create,
	getById,
	getByOwnerId,
	update,
	updateProfile,
	deleteBusiness,
	getUsersByBusinessId,
};
