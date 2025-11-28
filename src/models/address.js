const { executeQuery } = require("../config/database");
const { v4: uuidv4 } = require("uuid");

/**
 * Create a new address
 * @param {object} data - Address data
 * @returns {Promise<object>} Created address
 */
const create = async (data) => {
	const addressId = uuidv4();

	await executeQuery(
		`
        INSERT INTO address (id, line1, line2, city, state, zip, country)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
		[addressId, data.line1, data.line2 || null, data.city, data.state, data.zip, data.country],
	);

	return getById(addressId);
};

/**
 * Get address by ID
 * @param {string} id - Address ID
 * @returns {Promise<object|null>} Address or null
 */
const getById = async (id) => {
	const [address] = await executeQuery("SELECT * FROM address WHERE id = ?", [id]);
	return address || null;
};

/**
 * Update address
 * @param {string} id - Address ID
 * @param {object} data - Address data to update
 * @returns {Promise<void>}
 */
const update = async (id, data) => {
	const updates = [];
	const values = [];

	if (data.line1 !== undefined) {
		updates.push("line1 = ?");
		values.push(data.line1);
	}
	if (data.line2 !== undefined) {
		updates.push("line2 = ?");
		values.push(data.line2);
	}
	if (data.city !== undefined) {
		updates.push("city = ?");
		values.push(data.city);
	}
	if (data.state !== undefined) {
		updates.push("state = ?");
		values.push(data.state);
	}
	if (data.zip !== undefined) {
		updates.push("zip = ?");
		values.push(data.zip);
	}
	if (data.country !== undefined) {
		updates.push("country = ?");
		values.push(data.country);
	}

	if (updates.length === 0) {
		return;
	}

	updates.push("updated_at = CURRENT_TIMESTAMP");
	values.push(id);

	await executeQuery(`UPDATE address SET ${updates.join(", ")} WHERE id = ?`, values);
};

/**
 * Delete address
 * @param {string} id - Address ID
 * @returns {Promise<void>}
 */
const deleteAddress = async (id) => {
	await executeQuery("DELETE FROM address WHERE id = ?", [id]);
};

/**
 * Link address to user
 * @param {string} userId - User ID
 * @param {string} addressId - Address ID
 * @returns {Promise<void>}
 */
const linkToUser = async (userId, addressId) => {
	await executeQuery("UPDATE user SET address_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [addressId, userId]);
};

module.exports = {
	create,
	getById,
	update,
	deleteAddress,
	linkToUser,
};
