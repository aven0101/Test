const { z } = require("zod");
const { paginationQueryParams } = require("../utils/pagination");
const { orderByQueryParams } = require("../utils/sort");

// Query parameters schema for listing business users
const listBusinessUsersSchema = paginationQueryParams
	.merge(orderByQueryParams)
	.extend({
		search: z.string().optional(),
		role: z.enum(["super_admin", "admin", "manager", "standard_user"]).optional(),
		status: z.enum(["active", "inactive", "all"]).optional().default("active"),
	})
	.transform((data) => ({
		...data,
		page: data.page || 1,
		pageSize: data.pageSize || 10,
	}));

// Schema for updating business user
const updateBusinessUserSchema = z.object({
	first_name: z.string().min(2, "First name must be at least 2 characters").max(50, "First name must not exceed 50 characters").optional(),
	last_name: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name must not exceed 50 characters").optional(),
	email: z.string().email("Invalid email format").optional(),
	phone: z
		.string()
		.regex(/^[+]?[1-9][\d]{0,15}$/, "Invalid phone number format")
		.optional(),
});

module.exports = {
	listBusinessUsersSchema,
	updateBusinessUserSchema,
};
