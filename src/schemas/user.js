const z = require("zod");
const { BUSINESS_USER_ROLES } = require("../constants/roles");

// User update schema
const updateUserSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters long").max(50, "Name cannot exceed 50 characters").optional(),

	email: z.string().email("Please provide a valid email address").optional(),

	phone: z
		.string()
		.regex(/^[+]?[1-9][\d]{0,15}$/, "Please provide a valid phone number")
		.optional()
		.or(z.literal("")),

	bio: z.string().max(500, "Bio cannot exceed 500 characters").optional().or(z.literal("")),

	avatar: z.string().url("Avatar must be a valid URL").optional(),
});

// Change password schema
const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),

		newPassword: z
			.string()
			.min(8, "New password must be at least 8 characters long")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/,
				"New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
			),

		confirmNewPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: "Password confirmation must match new password",
		path: ["confirmNewPassword"],
	});

// User ID parameter schema
const userIdSchema = z.object({
	id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
});

// Query parameters schema for listing users
const listUsersSchema = z.object({
	page: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().int().min(1))
		.default("1"),

	limit: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().int().min(1).max(100))
		.default("10"),

	search: z.string().min(1, "Search term must be at least 1 character").max(100, "Search term cannot exceed 100 characters").optional(),

	role: z.enum(BUSINESS_USER_ROLES).optional(),

	sort: z.enum(["name", "email", "createdAt", "-name", "-email", "-createdAt"]).default("-createdAt"),
});

module.exports = {
	updateUserSchema,
	changePasswordSchema,
	userIdSchema,
	listUsersSchema,
};
