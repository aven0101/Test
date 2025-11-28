const { executeQuery } = require("../config/database");
const crypto = require("crypto");

// ============= 2FA Settings =============

/**
 * Get user 2FA settings
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - 2FA settings
 */
const get2FASettings = async (userId) => {
	const [settings] = await executeQuery(
		`
		SELECT * FROM user_2fa_settings
		WHERE user_id = ?
		`,
		[userId],
	);

	return settings || null;
};

/**
 * Create or update 2FA settings
 * @param {string} userId - User ID
 * @param {Object} settings - Settings object
 * @returns {Promise<void>}
 */
const upsert2FASettings = async (userId, settings) => {
	const { authenticator_enabled, passkey_enabled, one_time_code_enabled, security_question_enabled } = settings;

	// Check if any method is enabled
	const is_2fa_enabled = authenticator_enabled || passkey_enabled || one_time_code_enabled || security_question_enabled;

	await executeQuery(
		`
		INSERT INTO user_2fa_settings 
		(user_id, authenticator_enabled, passkey_enabled, one_time_code_enabled, 
		 security_question_enabled, is_2fa_enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			authenticator_enabled = VALUES(authenticator_enabled),
			passkey_enabled = VALUES(passkey_enabled),
			one_time_code_enabled = VALUES(one_time_code_enabled),
			security_question_enabled = VALUES(security_question_enabled),
			is_2fa_enabled = VALUES(is_2fa_enabled),
			updated_at = CURRENT_TIMESTAMP
		`,
		[userId, authenticator_enabled, passkey_enabled, one_time_code_enabled, security_question_enabled, is_2fa_enabled],
	);
};

// ============= Authenticator (TOTP) =============

/**
 * Save authenticator secret
 * @param {string} userId - User ID
 * @param {string} secret - TOTP secret
 * @returns {Promise<void>}
 */
const saveAuthenticatorSecret = async (userId, secret) => {
	// Delete any existing secrets for this user first
	await executeQuery(
		`
		DELETE FROM user_authenticator
		WHERE user_id = ?
		`,
		[userId],
	);

	// Insert the new secret
	await executeQuery(
		`
		INSERT INTO user_authenticator (user_id, secret, is_verified)
		VALUES (?, ?, FALSE)
		`,
		[userId, secret],
	);
};

/**
 * Get authenticator secret
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Authenticator data
 */
const getAuthenticatorSecret = async (userId) => {
	const [auth] = await executeQuery(
		`
		SELECT * FROM user_authenticator
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT 1
		`,
		[userId],
	);

	return auth || null;
};

/**
 * Verify and enable authenticator
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const verifyAuthenticator = async (userId) => {
	await executeQuery(
		`
		UPDATE user_authenticator
		SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP
		WHERE user_id = ?
		`,
		[userId],
	);
};

/**
 * Delete authenticator
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const deleteAuthenticator = async (userId) => {
	await executeQuery(
		`
		DELETE FROM user_authenticator
		WHERE user_id = ?
		`,
		[userId],
	);
};

// ============= Passkeys (WebAuthn) =============

/**
 * Save passkey credential
 * @param {Object} passkeyData - Passkey data
 * @returns {Promise<void>}
 */
const savePasskey = async (passkeyData) => {
	const { id, userId, credentialId, publicKey, counter, deviceName } = passkeyData;

	await executeQuery(
		`
		INSERT INTO user_passkey (id, user_id, credential_id, public_key, counter, device_name)
		VALUES (?, ?, ?, ?, ?, ?)
		`,
		[id, userId, credentialId, publicKey, counter, deviceName],
	);
};

/**
 * Get all passkeys for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of passkeys
 */
const getUserPasskeys = async (userId) => {
	return await executeQuery(
		`
		SELECT * FROM user_passkey
		WHERE user_id = ?
		ORDER BY created_at DESC
		`,
		[userId],
	);
};

/**
 * Get passkey by credential ID
 * @param {string} credentialId - Credential ID
 * @returns {Promise<Object|null>} - Passkey data
 */
const getPasskeyByCredentialId = async (credentialId) => {
	const [passkey] = await executeQuery(
		`
		SELECT * FROM user_passkey
		WHERE credential_id = ?
		`,
		[credentialId],
	);

	return passkey || null;
};

/**
 * Update passkey counter
 * @param {string} id - Passkey ID
 * @param {number} counter - New counter value
 * @returns {Promise<void>}
 */
const updatePasskeyCounter = async (id, counter) => {
	await executeQuery(
		`
		UPDATE user_passkey
		SET counter = ?, last_used = CURRENT_TIMESTAMP
		WHERE id = ?
		`,
		[counter, id],
	);
};

/**
 * Delete passkey
 * @param {string} id - Passkey ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const deletePasskey = async (id, userId) => {
	await executeQuery(
		`
		DELETE FROM user_passkey
		WHERE id = ? AND user_id = ?
		`,
		[id, userId],
	);
};

// ============= Security Questions =============

/**
 * Save security questions
 * @param {string} userId - User ID
 * @param {Array} questions - Array of {question, answerHash}
 * @returns {Promise<void>}
 */
const saveSecurityQuestions = async (userId, questions) => {
	// Delete existing questions
	await executeQuery(
		`
		DELETE FROM user_security_question
		WHERE user_id = ?
		`,
		[userId],
	);

	// Insert new questions
	for (const q of questions) {
		await executeQuery(
			`
			INSERT INTO user_security_question (user_id, question, answer_hash)
			VALUES (?, ?, ?)
			`,
			[userId, q.question, q.answerHash],
		);
	}
};

/**
 * Get security questions for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of questions
 */
const getSecurityQuestions = async (userId) => {
	return await executeQuery(
		`
		SELECT id, question, answer_hash, created_at
		FROM user_security_question
		WHERE user_id = ?
		ORDER BY id
		`,
		[userId],
	);
};

/**
 * Delete security questions
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const deleteSecurityQuestions = async (userId) => {
	await executeQuery(
		`
		DELETE FROM user_security_question
		WHERE user_id = ?
		`,
		[userId],
	);
};

// ============= Backup Codes =============

/**
 * Generate and save backup codes
 * @param {string} userId - User ID
 * @param {Array<string>} codeHashes - Array of hashed codes
 * @returns {Promise<void>}
 */
const saveBackupCodes = async (userId, codeHashes) => {
	// Delete old unused codes
	await executeQuery(
		`
		DELETE FROM user_2fa_backup_code
		WHERE user_id = ? AND is_used = FALSE
		`,
		[userId],
	);

	// Insert new codes
	for (const hash of codeHashes) {
		await executeQuery(
			`
			INSERT INTO user_2fa_backup_code (user_id, code_hash)
			VALUES (?, ?)
			`,
			[userId, hash],
		);
	}
};

/**
 * Verify and mark backup code as used
 * @param {string} userId - User ID
 * @param {string} codeHash - Hashed code
 * @returns {Promise<boolean>} - True if valid
 */
const useBackupCode = async (userId, codeHash) => {
	const [code] = await executeQuery(
		`
		SELECT * FROM user_2fa_backup_code
		WHERE user_id = ? AND code_hash = ? AND is_used = FALSE
		`,
		[userId, codeHash],
	);

	if (!code) {
		return false;
	}

	await executeQuery(
		`
		UPDATE user_2fa_backup_code
		SET is_used = TRUE, used_at = CURRENT_TIMESTAMP
		WHERE id = ?
		`,
		[code.id],
	);

	return true;
};

/**
 * Get remaining backup codes count
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Count of unused codes
 */
const getRemainingBackupCodesCount = async (userId) => {
	const [result] = await executeQuery(
		`
		SELECT COUNT(*) as count FROM user_2fa_backup_code
		WHERE user_id = ? AND is_used = FALSE
		`,
		[userId],
	);

	return result?.count || 0;
};

// ============= 2FA Attempts =============

/**
 * Log 2FA attempt
 * @param {Object} attemptData - Attempt data
 * @returns {Promise<void>}
 */
const log2FAAttempt = async (attemptData) => {
	const { userId, method, success, ipAddress } = attemptData;

	await executeQuery(
		`
		INSERT INTO user_2fa_attempt (user_id, method, success, ip_address)
		VALUES (?, ?, ?, ?)
		`,
		[userId, method, success, ipAddress],
	);
};

/**
 * Get recent failed attempts
 * @param {string} userId - User ID
 * @param {number} minutes - Time window in minutes
 * @returns {Promise<number>} - Count of failed attempts
 */
const getRecentFailedAttempts = async (userId, minutes = 30) => {
	const [result] = await executeQuery(
		`
		SELECT COUNT(*) as count FROM user_2fa_attempt
		WHERE user_id = ? 
		  AND success = FALSE
		  AND created_at > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE)
		`,
		[userId, minutes],
	);

	return result?.count || 0;
};

module.exports = {
	// Settings
	get2FASettings,
	upsert2FASettings,

	// Authenticator
	saveAuthenticatorSecret,
	getAuthenticatorSecret,
	verifyAuthenticator,
	deleteAuthenticator,

	// Passkeys
	savePasskey,
	getUserPasskeys,
	getPasskeyByCredentialId,
	updatePasskeyCounter,
	deletePasskey,

	// Security Questions
	saveSecurityQuestions,
	getSecurityQuestions,
	deleteSecurityQuestions,

	// Backup Codes
	saveBackupCodes,
	useBackupCode,
	getRemainingBackupCodesCount,

	// Attempts
	log2FAAttempt,
	getRecentFailedAttempts,
};
