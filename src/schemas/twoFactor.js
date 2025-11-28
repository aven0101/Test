const z = require("zod");

// Authenticator schemas
const verifyAuthenticatorSchema = z.object({
	token: z
		.string()
		.length(6, "Code must be exactly 6 digits")
		.regex(/^\d{6}$/, "Code must contain only numbers"),
});

// One-time code schema
const verifyOneTimeCodeSchema = z.object({
	code: z
		.string()
		.length(6, "Code must be exactly 6 digits")
		.regex(/^\d{6}$/, "Code must contain only numbers"),
});

// Security questions schemas
const setupSecurityQuestionsSchema = z.object({
	questions: z
		.array(
			z.object({
				question: z.string().min(5, "Question must be at least 5 characters").max(500, "Question too long"),
				answer: z.string().min(2, "Answer must be at least 2 characters").max(200, "Answer too long"),
			}),
		)
		.min(3, "Must provide at least 3 security questions")
		.max(5, "Maximum 5 security questions allowed"),
});

const verifySecurityQuestionsSchema = z.object({
	answers: z
		.array(
			z.object({
				id: z.number().int().positive(),
				answer: z.string().min(1, "Answer is required"),
			}),
		)
		.min(1, "Must provide at least one answer")
		// Note: User can answer any one question from their set of security questions
		// Only one correct answer is required to pass verification
});

// 2FA verification during login
const verify2FASchema = z.object({
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

// Backup code schema
const verifyBackupCodeSchema = z.object({
	code: z.string().min(8, "Backup code must be at least 8 characters"),
});

module.exports = {
	verifyAuthenticatorSchema,
	verifyOneTimeCodeSchema,
	setupSecurityQuestionsSchema,
	verifySecurityQuestionsSchema,
	verify2FASchema,
	verifyBackupCodeSchema,
};
