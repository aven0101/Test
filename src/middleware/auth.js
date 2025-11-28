const jwt = require("jsonwebtoken");
const config = require("../config");
const userModel = require("../models/user");
const deviceSessionModel = require("../models/deviceSession");
const { Response } = require("../utils/controller");
const { ROLES } = require("../constants/roles");
const { extractDeviceInfo } = require("../utils/deviceInfo");

/**
 * Middleware to check if current device is blocked
 * This should be called after authentication
 */
const checkDeviceBlocked = async (req, res, next) => {
	try {
		// Only check if user is authenticated
		if (!req.user || !req.user.id) {
			return next();
		}

		// Get current device info
		const deviceInfo = extractDeviceInfo(req);
		
		// Get all user sessions
		const sessions = await deviceSessionModel.getUserSessions(req.user.id);
		
		// Find matching session by IP and browser
		const currentSession = sessions.find(
			(session) =>
				session.ip_address === deviceInfo.ipAddress &&
				session.browser === deviceInfo.browser &&
				session.os === deviceInfo.os
		);

		// If session found and is blocked, deny access
		if (currentSession && currentSession.is_blocked) {
			return Response.error(
				"This device has been blocked from accessing this account. Please contact support or unblock from another device.",
				403
			).send(res);
		}

		// Update last active time if session exists
		if (currentSession) {
			await deviceSessionModel.updateLastActive(currentSession.id);
		}

		next();
	} catch (error) {
		console.error("Check device blocked error:", error);
		// Don't fail the request if check fails, just continue
		next();
	}
};

/**
 * Middleware to authenticate any logged-in user
 * Verifies JWT token
 */
const authenticate = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.replace("Bearer ", "");

		if (!token) {
			return Response.error("Authentication required. Please log in.", 401).send(res);
		}

		const decoded = jwt.verify(token, config.jwtSecret);

		// Reject temporary tokens used for role selection or 2FA
		if (decoded.temp || decoded.temp2FA) {
			return Response.error("Please complete authentication process first", 401).send(res);
		}

		const user = await userModel.getById(decoded.id);

		if (!user || user.is_deleted) {
			return Response.error("User not found or account deactivated", 401).send(res);
		}

		// Check if user is active
		if (!user.is_active) {
			return Response.error("Account is inactive", 403).send(res);
		}

		// Use the role from the token (which may be the selected role for super_admin)
		const effectiveRole = decoded.role;

		// Add user info to request
		req.user = user;
		req.user_id = user.id;
		req.role = effectiveRole;

		// Check if device is blocked
		return checkDeviceBlocked(req, res, next);
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return Response.error("Token expired. Please log in again.", 401).send(res);
		}
		if (error.name === "JsonWebTokenError") {
			return Response.error("Invalid token. Please log in again.", 401).send(res);
		}
		return Response.error("Authentication failed", 401).send(res);
	}
};

/**
 * Middleware to authenticate super_admin users
 * Verifies JWT token and ensures user is super_admin
 */
const authenticateSuperAdmin = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.replace("Bearer ", "");

		if (!token) {
			return Response.error("Authentication required. Please log in.", 401).send(res);
		}

		const decoded = jwt.verify(token, config.jwtSecret);

		// Reject temporary tokens used for role selection
		if (decoded.temp) {
			return Response.error("Please complete role selection first", 401).send(res);
		}

		const user = await userModel.getById(decoded.id);

		if (!user || user.is_deleted) {
			return Response.error("User not found or account deactivated", 401).send(res);
		}

		// Check if user is active
		if (!user.is_active) {
			return Response.error("Account is inactive", 403).send(res);
		}

		// Use the role from the token (which may be the selected role for super_admin)
		const effectiveRole = decoded.role;

		// Only super_admin can access this route
		if (effectiveRole !== ROLES.SUPER_ADMIN) {
			return Response.error("Only super admin can perform this action", 403).send(res);
		}

		// Add user info to request
		req.user = user;
		req.user_id = user.id;
		req.role = effectiveRole;

		// Check if device is blocked
		return checkDeviceBlocked(req, res, next);
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return Response.error("Token expired. Please log in again.", 401).send(res);
		}
		if (error.name === "JsonWebTokenError") {
			return Response.error("Invalid token. Please log in again.", 401).send(res);
		}
		return Response.error("Authentication failed", 401).send(res);
	}
};

module.exports = {
	authenticate,
	authenticateSuperAdmin,
	checkDeviceBlocked,
};
