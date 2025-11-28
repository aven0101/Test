const z = require("zod");

require("dotenv").config();

const configSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().positive())
		.default("3000"),
	HOST: z.string().default("localhost"),

	// Database Configuration
	DB_HOST: z.string(),
	DB_PORT: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().positive()),
	DB_NAME: z.string(),
	DB_USER: z.string(),
	DB_PASSWORD: z.string(),
	DB_TEST_NAME: z.string().optional(),

	// JWT Configuration
	JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
	JWT_EXPIRES_IN: z.string().default("7d"),
	JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters long"),
	JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

	// Password Configuration
	SALT_ROUNDS: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().positive())
		.default("12"),

	// Email Configuration
	EMAIL_HOST: z.string().optional(),
	EMAIL_PORT: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().positive())
		.optional(),
	EMAIL_SECURE: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.optional(),
	EMAIL_USER: z.string().optional(),
	EMAIL_PASS: z.string().optional(),
	EMAIL_FROM: z.string().email().optional(),

	// Frontend Configuration
	FRONTEND_URL: z.string().url().optional(),

	// Cloudinary Configuration
	CLOUDINARY_CLOUD_NAME: z.string().optional(),
	CLOUDINARY_API_KEY: z.string().optional(),
	CLOUDINARY_API_SECRET: z.string().optional(),

	// Rate Limiting
	RATE_LIMIT_WINDOW_MS: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().positive())
		.default("900000"),
	RATE_LIMIT_MAX_REQUESTS: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().positive())
		.default("100"),

	// CORS Configuration
	ALLOWED_ORIGINS: z.string().optional(),

	// Redis Configuration
	REDIS_URL: z.string().optional(),
});

// Parse and validate environment variables
const parseResult = configSchema.safeParse(process.env);

if (!parseResult.success) {
	console.error("❌ Invalid environment configuration:");
	parseResult.error.errors.forEach((error) => {
		console.error(`  ${error.path.join(".")}: ${error.message}`);
	});
	process.exit(1);
}

const envConfig = parseResult.data;

// Create the final configuration object
const config = {
	// Server Configuration
	NODE_ENV: envConfig.NODE_ENV,
	PORT: envConfig.PORT,
	HOST: envConfig.HOST,

	// Database Configuration
	DB_HOST: envConfig.DB_HOST,
	DB_PORT: envConfig.DB_PORT,
	DB_NAME: envConfig.DB_NAME,
	DB_USER: envConfig.DB_USER,
	DB_PASSWORD: envConfig.DB_PASSWORD,
	DB_TEST_NAME: envConfig.DB_TEST_NAME || `${envConfig.DB_NAME}_test`,

	// JWT Configuration
	jwtSecret: envConfig.JWT_SECRET,
	JWT_SECRET: envConfig.JWT_SECRET,
	JWT_EXPIRES_IN: envConfig.JWT_EXPIRES_IN,
	JWT_REFRESH_SECRET: envConfig.JWT_REFRESH_SECRET,
	JWT_REFRESH_EXPIRES_IN: envConfig.JWT_REFRESH_EXPIRES_IN,

	// Password Configuration
	saltRounds: envConfig.SALT_ROUNDS,

	// Email Configuration
	EMAIL_HOST: envConfig.EMAIL_HOST || "smtp.gmail.com",
	EMAIL_PORT: envConfig.EMAIL_PORT || 587,
	EMAIL_SECURE: envConfig.EMAIL_SECURE !== undefined ? envConfig.EMAIL_SECURE : false,
	EMAIL_USER: envConfig.EMAIL_USER,
	EMAIL_PASS: envConfig.EMAIL_PASS,
	EMAIL_FROM: envConfig.EMAIL_FROM || "noreply@psfss.com",

	// Frontend Configuration
	FRONTEND_URL: envConfig.FRONTEND_URL || "http://localhost:3001",

	// Cloudinary Configuration
	CLOUDINARY_CLOUD_NAME: envConfig.CLOUDINARY_CLOUD_NAME,
	CLOUDINARY_API_KEY: envConfig.CLOUDINARY_API_KEY,
	CLOUDINARY_API_SECRET: envConfig.CLOUDINARY_API_SECRET,

	// Rate Limiting
	RATE_LIMIT_WINDOW_MS: envConfig.RATE_LIMIT_WINDOW_MS,
	RATE_LIMIT_MAX_REQUESTS: envConfig.RATE_LIMIT_MAX_REQUESTS,

	// CORS Configuration
	ALLOWED_ORIGINS: envConfig.ALLOWED_ORIGINS ? envConfig.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()) : ["http://localhost:3000"],

	// Redis Configuration
	REDIS_URL: envConfig.REDIS_URL,

	// File Upload Configuration (these are constants, not from env)
	MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
	ALLOWED_FILE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
};

// Log configuration status
console.log(`🚀 Configuration loaded for ${config.NODE_ENV} environment`);

module.exports = config;
