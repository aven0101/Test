const rateLimit = require("express-rate-limit");
const config = require("../config");

/**
 * Strict rate limiter for login attempts
 * Prevents brute force attacks on authentication
 */
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 login attempts per IP per 15 minutes
	message: {
		status: "error",
		message: "Too many login attempts from this IP, please try again after 15 minutes.",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: false, // Count all requests, even successful ones
	skipFailedRequests: false,
});

/**
 * Strict rate limiter for registration
 * Prevents spam account creation
 */
const registerLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 3, // 3 registration attempts per IP per hour
	message: {
		status: "error",
		message: "Too many registration attempts from this IP, please try again after 1 hour.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

/**
 * Strict rate limiter for password reset requests
 * Prevents abuse of password reset functionality
 */
const passwordResetLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 3, // 3 password reset requests per IP per hour
	message: {
		status: "error",
		message: "Too many password reset attempts from this IP, please try again after 1 hour.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

/**
 * Strict rate limiter for 2FA verification
 * Prevents brute force on 2FA codes
 */
const twoFALimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 2FA verification attempts per IP per 15 minutes
	message: {
		status: "error",
		message: "Too many 2FA verification attempts from this IP, please try again after 15 minutes.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

/**
 * Moderate rate limiter for other auth endpoints
 * Less strict than login/register but still protected
 */
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // 10 requests per IP per 15 minutes
	message: {
		status: "error",
		message: "Too many requests from this IP, please try again later.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

module.exports = {
	loginLimiter,
	registerLimiter,
	passwordResetLimiter,
	twoFALimiter,
	authLimiter,
};
