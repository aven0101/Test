const jwt = require("jsonwebtoken");
const config = require("../config");
const userModel = require("../models/user");
const businessModel = require("../models/business");
const deviceSessionModel = require("../models/deviceSession");
const { Response } = require("../utils/controller");
const { ADMIN_ROLES } = require("../constants/roles");
const { extractDeviceInfo } = require("../utils/deviceInfo");

/**
 * Middleware to check if current device is blocked
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
			(session) => session.ip_address === deviceInfo.ipAddress && session.browser === deviceInfo.browser && session.os === deviceInfo.os,
		);

		// If session found and is blocked, deny access
		if (currentSession && currentSession.is_blocked) {
			return Response.error(
				"This device has been blocked from accessing this account. Please contact support or unblock from another device.",
				403,
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

const authenticateBusinessAdmin = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.replace("Bearer ", "");

		if (!token) {
			return Response.unauthorized().send(res);
		}

		const decoded = jwt.verify(token, config.jwtSecret);

		// Reject temporary tokens used for role selection
		if (decoded.temp) {
			return Response.error("Please complete role selection first", 401).send(res);
		}

		const user = await userModel.getById(decoded.id);

		if (!user) {
			return Response.unauthorized().send(res);
		}

		// Check if user is business account
		if (user.account_name !== "business") {
			return Response.error("Only business accounts can manage users", 403).send(res);
		}

		// Use the role from the token (which may be the selected role for super_admin)
		const effectiveRole = decoded.role;

		// Check if user has admin or super_admin role
		if (!ADMIN_ROLES.includes(effectiveRole)) {
			return Response.error("Only admins can manage business users", 403).send(res);
		}

		// Check if user has a business_id
		if (!user.business_id) {
			return Response.error("User must be associated with a business", 403).send(res);
		}

		// Verify business exists and is active
		const business = await businessModel.getById(user.business_id);
		if (!business || !business.is_active) {
			return Response.error("Business not found or inactive", 404).send(res);
		}

		// Add user and business info to request
		req.user = user;
		req.business = business;
		req.user_id = user.id;
		req.role = effectiveRole; // Use effective role from token
		req.business_id = user.business_id;

		// Check if device is blocked
		return checkDeviceBlocked(req, res, next);
	} catch (error) {
		return Response.error("Invalid token", 401).send(res);
	}
};

module.exports = {
	authenticateBusinessAdmin,
	checkDeviceBlocked,
};
