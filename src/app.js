const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const config = require("./config");
const logger = require("./config/logger");
const { globalErrorHandler, AppError } = require("./middleware/errorHandler");

const routes = require("./routes");

const app = express();

// Trust proxy for accurate IP addresses
app.set("trust proxy", 1);

// Add request timing middleware
app.use((req, res, next) => {
	req.startTime = Date.now();
	next();
});

// Security middleware
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
				fontSrc: ["'self'", "https://fonts.gstatic.com"],
				imgSrc: ["'self'", "data:", "https:"],
				scriptSrc: ["'self'"],
			},
		},
		crossOriginEmbedderPolicy: false,
	}),
);

// CORS configuration
const corsOptions = {
	origin: function (origin, callback) {
		// Allow requests with no origin (mobile apps, curl, etc.)
		if (!origin) return callback(null, true);

		if (config.ALLOWED_ORIGINS.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			callback(new AppError("Not allowed by CORS", 403));
		}
	},
	credentials: true,
	optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
	windowMs: config.RATE_LIMIT_WINDOW_MS,
	max: config.RATE_LIMIT_MAX_REQUESTS,
	message: {
		status: "error",
		message: "Too many requests from this IP, please try again later.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
if (config.NODE_ENV === "development") {
	app.use(morgan("dev"));
} else {
	app.use(
		morgan("combined", {
			stream: {
				write: (message) => logger.info(message.trim()),
			},
		}),
	);
}

// Swagger documentation setup
const swaggerOptions = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "PSFSS API",
			version: "1.0.0",
			description: "A comprehensive API for the PSFSS platform",
			contact: {
				name: "PSFSS Team",
				email: "api@psfss.com",
			},
		},
		servers: [
			{
				url: `http://${config.HOST}:${config.PORT}/api/v1`,
				description: "Development server",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
		},
	},
	apis: ["./src/routes/*.js", "./src/models/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use(
	"/api-docs",
	swaggerUi.serve,
	swaggerUi.setup(swaggerSpec, {
		explorer: true,
		customCss: ".swagger-ui .topbar { display: none }",
		customSiteTitle: "PSFSS API Documentation",
	}),
);

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({
		status: "success",
		message: "Server is running!",
		timestamp: new Date().toISOString(),
		// uptime: process.uptime(),
		environment: config.NODE_ENV,
	});
});

// API routes
app.use(routes);

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Handle undefined routes
app.all("*", (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
