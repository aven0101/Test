const { executeQuery } = require("../config/database");
const crypto = require("crypto");

/**
 * Create a password reset token for a user
 * @param {string} userId - User ID
 * @returns {Promise<string>} - Reset token
 */
const createResetToken = async (userId) => {
	// Generate a secure random token
	const token = crypto.randomBytes(32).toString("hex");

	// Insert the token into the database
	await executeQuery(
		`
		INSERT INTO password_reset_token (user_id, token, created_at, expires_at, is_used)
		VALUES (?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 HOUR), FALSE);
		`,
		[userId, token],
	);

	return token;
};

/**
 * Get reset token details
 * @param {string} token - Reset token
 * @returns {Promise<Object|null>} - Token details or null if not found
 */
const getResetToken = async (token) => {
	const [tokenData] = await executeQuery(
		`
		SELECT prt.*, u.email, u.first_name, u.last_name, u.id as user_id
		FROM password_reset_token prt
		JOIN user u ON prt.user_id = u.id
		WHERE prt.token = ?
		AND prt.is_used = FALSE
		AND prt.expires_at > CURRENT_TIMESTAMP
		AND u.is_deleted = FALSE;
		`,
		[token],
	);

	return tokenData || null;
};

/**
 * Mark reset token as used
 * @param {string} token - Reset token
 * @returns {Promise<void>}
 */
const markTokenAsUsed = async (token) => {
	await executeQuery(
		`
		UPDATE password_reset_token
		SET is_used = TRUE
		WHERE token = ?;
		`,
		[token],
	);
};

/**
 * Delete all unused reset tokens for a user
 * (Used when password is successfully reset)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const deleteUserResetTokens = async (userId) => {
	await executeQuery(
		`
		DELETE FROM password_reset_token
		WHERE user_id = ?
		AND is_used = FALSE;
		`,
		[userId],
	);
};

/**
 * Clean up expired tokens (can be run periodically)
 * @returns {Promise<number>} - Number of deleted tokens
 */
const cleanupExpiredTokens = async () => {
	const result = await executeQuery(
		`
		DELETE FROM password_reset_token
		WHERE expires_at < CURRENT_TIMESTAMP
		OR is_used = TRUE;
		`,
	);

	return result.affectedRows || 0;
};

module.exports = {
	createResetToken,
	getResetToken,
	markTokenAsUsed,
	deleteUserResetTokens,
	cleanupExpiredTokens,
};

