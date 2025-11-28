const { executeQuery } = require("../config/database");
const { v4: uuidv4 } = require("uuid");

/**
 * Create a new device session
 * @param {Object} sessionData - Device session data
 * @returns {Promise<string>} - Session ID
 */
const createSession = async (sessionData) => {
	const {
		userId,
		deviceName,
		deviceType,
		browser,
		browserVersion,
		os,
		osVersion,
		ipAddress,
		country,
		city,
		latitude,
		longitude,
	} = sessionData;

	const sessionId = uuidv4();

	await executeQuery(
		`
		INSERT INTO device_session (
			id, user_id, device_name, device_type, browser, browser_version,
			os, os_version, ip_address, country, city, latitude, longitude,
			is_blocked, last_active, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`,
		[
			sessionId,
			userId,
			deviceName,
			deviceType,
			browser,
			browserVersion,
			os,
			osVersion,
			ipAddress,
			country,
			city,
			latitude,
			longitude,
		],
	);

	return sessionId;
};

/**
 * Get all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of sessions
 */
const getUserSessions = async (userId) => {
	return await executeQuery(
		`
		SELECT 
			id, user_id, device_name, device_type, browser, browser_version,
			os, os_version, ip_address, country, city, latitude, longitude,
			is_blocked, last_active, created_at
		FROM device_session
		WHERE user_id = ?
		ORDER BY last_active DESC
		`,
		[userId],
	);
};

/**
 * Get session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} - Session data
 */
const getSessionById = async (sessionId) => {
	const [session] = await executeQuery(
		`
		SELECT 
			id, user_id, device_name, device_type, browser, browser_version,
			os, os_version, ip_address, country, city, latitude, longitude,
			is_blocked, last_active, created_at
		FROM device_session
		WHERE id = ?
		`,
		[sessionId],
	);

	return session || null;
};

/**
 * Update session last active time
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
const updateLastActive = async (sessionId) => {
	await executeQuery(
		`
		UPDATE device_session
		SET last_active = CURRENT_TIMESTAMP
		WHERE id = ?
		`,
		[sessionId],
	);
};

/**
 * Block a device session
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
const blockSession = async (sessionId) => {
	await executeQuery(
		`
		UPDATE device_session
		SET is_blocked = TRUE
		WHERE id = ?
		`,
		[sessionId],
	);
};

/**
 * Unblock a device session
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
const unblockSession = async (sessionId) => {
	await executeQuery(
		`
		UPDATE device_session
		SET is_blocked = FALSE
		WHERE id = ?
		`,
		[sessionId],
	);
};

/**
 * Delete a device session
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
const deleteSession = async (sessionId) => {
	await executeQuery(
		`
		DELETE FROM device_session
		WHERE id = ?
		`,
		[sessionId],
	);
};

/**
 * Check if session is blocked
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} - True if blocked
 */
const isSessionBlocked = async (sessionId) => {
	const [session] = await executeQuery(
		`
		SELECT is_blocked
		FROM device_session
		WHERE id = ?
		`,
		[sessionId],
	);

	return session ? session.is_blocked : false;
};

/**
 * Delete all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const deleteAllUserSessions = async (userId) => {
	await executeQuery(
		`
		DELETE FROM device_session
		WHERE user_id = ?
		`,
		[userId],
	);
};

/**
 * Clean up old inactive sessions (older than 30 days)
 * @returns {Promise<number>} - Number of deleted sessions
 */
const cleanupOldSessions = async () => {
	const result = await executeQuery(
		`
		DELETE FROM device_session
		WHERE last_active < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)
		`,
	);

	return result.affectedRows || 0;
};

module.exports = {
	createSession,
	getUserSessions,
	getSessionById,
	updateLastActive,
	blockSession,
	unblockSession,
	deleteSession,
	isSessionBlocked,
	deleteAllUserSessions,
	cleanupOldSessions,
};

