const z = require("zod");
const { SUPER_ADMIN_SELECTABLE_ROLES } = require("../constants/roles");

// Business owner registration schema
const registerSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters long").max(50, "Name cannot exceed 50 characters"),

		email: z.string().email("Please provide a valid email address"),

		password: z
			.string()
			.min(8, "Password must be at least 8 characters long")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/,
				"Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
			),

		confirmPassword: z.string(),

		phone: z
			.string()
			.regex(/^[+]?[1-9][\d]{0,15}$/, "Please provide a valid phone number")
			.optional(),

		// Business information
		businessName: z.string().min(2, "Business name must be at least 2 characters long").max(100, "Business name cannot exceed 100 characters"),
		businessDescription: z.string().optional(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Password confirmation must match password",
		path: ["confirmPassword"],
	});

const loginSchema = z.object({
	email: z.string().email("Please provide a valid email address"),

	password: z.string().min(1, "Password is required"),
});

const selectRoleSchema = z.object({
	selectedRole: z.enum(SUPER_ADMIN_SELECTABLE_ROLES, {
		errorMap: () => ({ message: "Role must be either 'admin' or 'super_admin'" }),
	}),
});

const forgotPasswordSchema = z.object({
	email: z.string().email("Please provide a valid email address"),
});

const resetPasswordSchema = z
	.object({
		token: z.string().min(1, "Reset token is required"),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters long")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/,
				"Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Password confirmation must match password",
		path: ["confirmPassword"],
	});

// OTP-based password reset schemas
const requestPasswordResetOTPSchema = z.object({
	email: z.string().email("Please provide a valid email address"),
});

const resetPasswordWithOTPSchema = z
	.object({
		email: z.string().email("Please provide a valid email address"),
		otp: z
			.string()
			.length(6, "OTP must be exactly 6 digits")
			.regex(/^\d{6}$/, "OTP must contain only numbers"),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters long")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/,
				"Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Password confirmation must match password",
		path: ["confirmPassword"],
	});

// Change email schema
const changeEmailSchema = z.object({
	currentPassword: z.string().min(1, "Current password is required"),
	newEmail: z.string().email("Please provide a valid email address"),
});

// Update password schema
const updatePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z
			.string()
			.min(8, "New password must be at least 8 characters long")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/,
				"New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Password confirmation must match new password",
		path: ["confirmPassword"],
	});

// 2FA verification during login
const verify2FALoginSchema = z.object({
	tempToken: z.string().min(1, "Temporary token is required"),
	method: z.enum(["authenticator", "one_time_code", "security_question", "backup_code"], {
		errorMap: () => ({ message: "Invalid 2FA method" }),
	}),
	code: z.string().optional(),
	answers: z
		.array(
			z.object({
				id: z.number().int().positive(),
				answer: z.string().min(1),
			}),
		)
		.optional(),
});

// Send 2FA code schema
const send2FACodeSchema = z.object({
	tempToken: z.string().min(1, "Temporary token is required"),
});

module.exports = {
	registerSchema,
	loginSchema,
	selectRoleSchema,
	forgotPasswordSchema,
	resetPasswordSchema,
	requestPasswordResetOTPSchema,
	resetPasswordWithOTPSchema,
	changeEmailSchema,
	updatePasswordSchema,
	verify2FALoginSchema,
	send2FACodeSchema,
};
