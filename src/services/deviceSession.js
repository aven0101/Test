const deviceSessionModel = require("../models/deviceSession");
const { Response } = require("../utils/controller");
const { getDeviceDescription, isCurrentDevice } = require("../utils/deviceInfo");

/**
 * Get all device sessions for the authenticated user
 * @param {string} userId - User ID
 * @param {Object} req - Request object to identify current device
 * @returns {Promise<Object>} - Response with sessions list
 */
const getMySessions = async (userId, req) => {
	try {
		const sessions = await deviceSessionModel.getUserSessions(userId);

		// Mark current device and add friendly descriptions
		const sessionsWithDetails = sessions.map((session) => ({
			id: session.id,
			deviceName: session.device_name,
			deviceType: session.device_type,
			browser: session.browser,
			browserVersion: session.browser_version,
			os: session.os,
			osVersion: session.os_version,
			location: {
				country: session.country,
				city: session.city,
				latitude: session.latitude,
				longitude: session.longitude,
			},
			ipAddress: session.ip_address,
			isBlocked: session.is_blocked,
			isCurrent: req ? isCurrentDevice(req, session) : false,
			description: getDeviceDescription(session),
			lastActive: session.last_active,
			createdAt: session.created_at,
		}));

		return Response.ok({
			sessions: sessionsWithDetails,
			totalCount: sessionsWithDetails.length,
		});
	} catch (error) {
		console.error("Get sessions error:", error);
		throw error;
	}
};

/**
 * Block a device session
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID to block
 * @param {Object} req - Request object to prevent blocking current device
 * @returns {Promise<Object>} - Response
 */
const blockDevice = async (userId, sessionId, req) => {
	try {
		// Get session details
		const session = await deviceSessionModel.getSessionById(sessionId);

		if (!session) {
			return Response.error("Device session not found", 404);
		}

		// Verify session belongs to user
		if (session.user_id !== userId) {
			return Response.error("Unauthorized to block this device", 403);
		}

		// Prevent blocking current device
		if (req && isCurrentDevice(req, session)) {
			return Response.error("Cannot block your current device", 400);
		}

		// Block the session
		await deviceSessionModel.blockSession(sessionId);

		return Response.okMessage("Device blocked successfully. This device can no longer access your account.");
	} catch (error) {
		console.error("Block device error:", error);
		throw error;
	}
};

/**
 * Unblock a device session
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID to unblock
 * @returns {Promise<Object>} - Response
 */
const unblockDevice = async (userId, sessionId) => {
	try {
		// Get session details
		const session = await deviceSessionModel.getSessionById(sessionId);

		if (!session) {
			return Response.error("Device session not found", 404);
		}

		// Verify session belongs to user
		if (session.user_id !== userId) {
			return Response.error("Unauthorized to unblock this device", 403);
		}

		// Unblock the session
		await deviceSessionModel.unblockSession(sessionId);

		return Response.okMessage("Device unblocked successfully. This device can now access your account again.");
	} catch (error) {
		console.error("Unblock device error:", error);
		throw error;
	}
};

/**
 * Revoke/delete a device session
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID to revoke
 * @param {Object} req - Request object to prevent revoking current device
 * @returns {Promise<Object>} - Response
 */
const revokeDevice = async (userId, sessionId, req) => {
	try {
		// Get session details
		const session = await deviceSessionModel.getSessionById(sessionId);

		if (!session) {
			return Response.error("Device session not found", 404);
		}

		// Verify session belongs to user
		if (session.user_id !== userId) {
			return Response.error("Unauthorized to revoke this device", 403);
		}

		// Prevent revoking current device
		if (req && isCurrentDevice(req, session)) {
			return Response.error("Cannot revoke your current device session", 400);
		}

		// Delete the session
		await deviceSessionModel.deleteSession(sessionId);

		return Response.okMessage("Device session revoked successfully. This device has been logged out.");
	} catch (error) {
		console.error("Revoke device error:", error);
		throw error;
	}
};

/**
 * Revoke all other device sessions (except current)
 * @param {string} userId - User ID
 * @param {Object} req - Request object to identify current device
 * @returns {Promise<Object>} - Response
 */
const revokeAllOtherDevices = async (userId, req) => {
	try {
		const sessions = await deviceSessionModel.getUserSessions(userId);
		
		let revokedCount = 0;
		for (const session of sessions) {
			// Skip current device
			if (req && !isCurrentDevice(req, session)) {
				await deviceSessionModel.deleteSession(session.id);
				revokedCount++;
			}
		}

		return Response.ok({
			message: `Successfully logged out ${revokedCount} device(s)`,
			revokedCount,
		});
	} catch (error) {
		console.error("Revoke all devices error:", error);
		throw error;
	}
};

module.exports = {
	getMySessions,
	blockDevice,
	unblockDevice,
	revokeDevice,
	revokeAllOtherDevices,
};

