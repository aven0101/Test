const { executeQuery } = require("../config/database");

/**
 * Get role by ID
 */
const getById = async (id) => {
	const [role] = await executeQuery(`SELECT * FROM role WHERE id = ?;`, [id]);
	return role;
};

/**
 * Get role by name
 */
const getByName = async (name) => {
	const [role] = await executeQuery(`SELECT * FROM role WHERE name = ?;`, [name]);
	return role;
};

/**
 * Get all roles
 */
const getAll = async () => {
	return await executeQuery(`SELECT * FROM role ORDER BY id ASC;`);
};

/**
 * Get role ID by name
 */
const getIdByName = async (name) => {
	const role = await getByName(name);
	return role ? role.id : null;
};

/**
 * Get role name by ID
 */
const getNameById = async (id) => {
	const role = await getById(id);
	return role ? role.name : null;
};

module.exports = {
	getById,
	getByName,
	getAll,
	getIdByName,
	getNameById,
};
