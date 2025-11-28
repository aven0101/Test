const mysql = require("mysql2");
const z = require("zod");

const buildOrderByClause = ({ order, orderBy }) => {
	if (!order || !orderBy) {
		return "";
	}

	if (!["asc", "desc"].includes(order)) {
		return "";
	}

	return `ORDER BY ${mysql.escapeId(orderBy)} ${order}`;
};

const orderByQueryParams = z.object({
	orderBy: z.string().optional(),
	order: z.enum(["asc", "desc"]).optional(),
});

module.exports = {
	buildOrderByClause,
	orderByQueryParams,
};
