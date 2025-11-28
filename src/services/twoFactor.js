const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const twoFactorModel = require("../models/twoFactor");
const authModel = require("../models/auth");
const emailService = require("./email");
const { Response } = require("../utils/controller");
const { randomInt } = require("../utils/randomInt");
const config = require("../config");
const logger = require("../config/logger");

// ============= Authenticator (TOTP) Service =============

/**
 * Generate authenticator secret and QR code
 * @param {Object} user - User object
 * @returns {Promise<Object>} - Secret and QR code
 */
const setupAuthenticator = async (user) => {
	try {
		// Generate secret
		const secret = speakeasy.generateSecret({
			name: `PSFSS (${user.email})`,
			issuer: "PSFSS",
			length: 32,
		});

		logger.info(`Setting up authenticator for user ${user.id}`, {
			secretLength: secret.base32.length,
			secretPreview: secret.base32.substring(0, 8) + "...",
			otpauthUrl: secret.otpauth_url,
		});

		// Save secret to database (unverified)
		await twoFactorModel.saveAuthenticatorSecret(user.id, secret.base32);

		// Generate QR code
		const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

		return Response.ok({
			secret: secret.base32,
			qrCode: qrCodeUrl,
			message: "Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)",
		});
	} catch (error) {
		logger.error("Setup authenticator error", { error: error.message, stack: error.stack, userId: user.id });
		throw error;
	}
};

/**
 * Verify authenticator code and enable it
 * @param {string} userId - User ID
 * @param {string} token - 6-digit code from authenticator app
 * @returns {Promise<Object>} - Response with backup codes
 */
const verifyAndEnableAuthenticator = async (userId, token) => {
	try {
		const authData = await twoFactorModel.getAuthenticatorSecret(userId);

		if (!authData) {
			logger.warn(`Authenticator not set up for user ${userId}`);
			return Response.error("Authenticator not set up. Please set up first.", 400);
		}

		if (!authData.secret) {
			logger.error(`Authenticator secret not found in database for user ${userId}`, { authData });
			return Response.error("Authenticator secret not found. Please set up again.", 400);
		}

		logger.info(`Verifying authenticator for user ${userId}`, {
			secretLength: authData.secret.length,
			secretPreview: authData.secret.substring(0, 8) + "...",
			isVerified: authData.is_verified,
		});

		// Ensure token is a string and trim whitespace
		const tokenString = String(token || "").trim();

		if (!tokenString || tokenString.length !== 6 || !/^\d{6}$/.test(tokenString)) {
			return Response.error("Invalid code format. Code must be exactly 6 digits.", 400);
		}

		// Clean the secret (remove any whitespace)
		const secret = String(authData.secret || "").trim().replace(/\s+/g, "");

		if (!secret) {
			return Response.error("Authenticator secret is invalid. Please set up again.", 400);
		}

		// Verify the token with a wider window to account for clock skew
		// window: 2 means we check current time ± 2 time steps (60 seconds each)
		const isValid = speakeasy.totp.verify({
			secret: secret,
			encoding: "base32",
			token: tokenString,
			window: 3, // Increased to 3 time steps (90 seconds) before/after for clock skew
			step: 30, // Standard TOTP step (30 seconds)
		});

		if (!isValid) {
			// Try generating a token with the same secret to help debug
			try {
				const testToken = speakeasy.totp({
					secret: secret,
					encoding: "base32",
					step: 30,
				});
				logger.error(`2FA verification failed for user ${userId}`, {
					expectedToken: testToken,
					receivedToken: tokenString,
					secretLength: secret.length,
					secretPreview: secret.substring(0, 8) + "...",
					timestamp: new Date().toISOString(),
				});
			} catch (debugError) {
				logger.error(`Error generating test token for debug`, { error: debugError.message, userId });
			}
			
			return Response.error("Invalid authenticator code. Please check the code and try again. Make sure your device clock is synchronized.", 400);
		}

		// Mark as verified
		await twoFactorModel.verifyAuthenticator(userId);

		// Enable authenticator in settings
		const settings = (await twoFactorModel.get2FASettings(userId)) || {};
		await twoFactorModel.upsert2FASettings(userId, {
			...settings,
			authenticator_enabled: true,
		});

		// Generate backup codes
		const backupCodes = await generateBackupCodes(userId);

		return Response.ok({
			message: "Authenticator enabled successfully",
			backupCodes,
			backupCodesMessage: "Save these backup codes in a safe place. Each code can only be used once.",
		});
	} catch (error) {
		console.error("Verify authenticator error:", error);
		throw error;
	}
};

/**
 * Disable authenticator
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Response
 */
const disableAuthenticator = async (userId) => {
	try {
		// Delete authenticator
		await twoFactorModel.deleteAuthenticator(userId);

		// Update settings
		const settings = (await twoFactorModel.get2FASettings(userId)) || {};
		await twoFactorModel.upsert2FASettings(userId, {
			...settings,
			authenticator_enabled: false,
		});

		return Response.okMessage("Authenticator disabled successfully");
	} catch (error) {
		console.error("Disable authenticator error:", error);
		throw error;
	}
};

// ============= One-Time Code (Email OTP) Service =============

/**
 * Enable one-time code via email
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Response
 */
const enableOneTimeCode = async (userId) => {
	try {
		const settings = (await twoFactorModel.get2FASettings(userId)) || {};
		await twoFactorModel.upsert2FASettings(userId, {
			...settings,
			one_time_code_enabled: true,
		});

		// Generate backup codes
		const backupCodes = await generateBackupCodes(userId);

		return Response.ok({
			message: "One-time code via email enabled successfully",
			backupCodes,
			backupCodesMessage: "Save these backup codes in a safe place. Each code can only be used once.",
		});
	} catch (error) {
		console.error("Enable one-time code error:", error);
		throw error;
	}
};

/**
 * Disable one-time code
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Response
 */
const disableOneTimeCode = async (userId) => {
	try {
		const settings = (await twoFactorModel.get2FASettings(userId)) || {};
		await twoFactorModel.upsert2FASettings(userId, {
			...settings,
			one_time_code_enabled: false,
		});

		return Response.okMessage("One-time code disabled successfully");
	} catch (error) {
		console.error("Disable one-time code error:", error);
		throw error;
	}
};

/**
 * Send one-time code to email
 * @param {Object} user - User object
 * @returns {Promise<Object>} - Response
 */
const sendOneTimeCode = async (user) => {
	try {
		// Generate 6-digit OTP
		const otp = randomInt(100000, 999999).toString();

		// Save to OTP table
		await authModel.insertOtp({ email: user.email, otp });

		// Send email
		await emailService.sendPasswordResetOTPEmail({
			email: user.email,
			name: `${user.first_name} ${user.last_name}`.trim(),
			otp,
		});

		return Response.okMessage("Verification code sent to your email");
	} catch (error) {
		console.error("Send one-time code error:", error);
		throw error;
	}
};

// ============= Security Questions Service =============

/**
 * Setup security questions
 * @param {string} userId - User ID
 * @param {Array} questionsAndAnswers - Array of {question, answer}
 * @returns {Promise<Object>} - Response
 */
const setupSecurityQuestions = async (userId, questionsAndAnswers) => {
	try {
		// Hash answers
		const questions = await Promise.all(
			questionsAndAnswers.map(async (qa) => ({
				question: qa.question,
				answerHash: await bcrypt.hash(qa.answer.toLowerCase().trim(), 10),
			})),
		);

		// Save to database
		await twoFactorModel.saveSecurityQuestions(userId, questions);

		// Enable in settings
		const settings = (await twoFactorModel.get2FASettings(userId)) || {};
		await twoFactorModel.upsert2FASettings(userId, {
			...settings,
			security_question_enabled: true,
		});

		// Generate backup codes
		const backupCodes = await generateBackupCodes(userId);

		return Response.ok({
			message: "Security questions enabled successfully",
			backupCodes,
			backupCodesMessage: "Save these backup codes in a safe place. Each code can only be used once.",
		});
	} catch (error) {
		console.error("Setup security questions error:", error);
		throw error;
	}
};

/**
 * Disable security questions
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Response
 */
const disableSecurityQuestions = async (userId) => {
	try {
		await twoFactorModel.deleteSecurityQuestions(userId);

		const settings = (await twoFactorModel.get2FASettings(userId)) || {};
		await twoFactorModel.upsert2FASettings(userId, {
			...settings,
			security_question_enabled: false,
		});

		return Response.okMessage("Security questions disabled successfully");
	} catch (error) {
		console.error("Disable security questions error:", error);
		throw error;
	}
};

/**
 * Get security questions (without answers)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Response
 */
const getSecurityQuestionsForVerification = async (userId) => {
	try {
		const questions = await twoFactorModel.getSecurityQuestions(userId);

		return Response.ok({
			questions: questions.map((q) => ({
				id: q.id,
				question: q.question,
			})),
		});
	} catch (error) {
		console.error("Get security questions error:", error);
		throw error;
	}
};

/**
 * Verify security question answers
 * @param {string} userId - User ID
 * @param {Array} answers - Array of {id, answer}
 * @returns {Promise<boolean>} - True if all correct
 */
const verifySecurityAnswers = async (userId, answers) => {
	try {
		const questions = await twoFactorModel.getSecurityQuestions(userId);

		// Check all answers
		for (const answer of answers) {
			const question = questions.find((q) => q.id === answer.id);
			if (!question) {
				return false;
			}

			const isValid = await bcrypt.compare(answer.answer.toLowerCase().trim(), question.answer_hash);
			if (!isValid) {
				return false;
			}
		}

		return true;
	} catch (error) {
		console.error("Verify security answers error:", error);
		return false;
	}
};

// ============= Backup Codes =============

/**
 * Generate backup codes
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} - Array of backup codes
 */
const generateBackupCodes = async (userId) => {
	const codes = [];
	const codeHashes = [];

	// Generate 10 backup codes
	for (let i = 0; i < 10; i++) {
		const code = crypto.randomBytes(4).toString("hex").toUpperCase();
		codes.push(code);
		codeHashes.push(await bcrypt.hash(code, 10));
	}

	// Save to database
	await twoFactorModel.saveBackupCodes(userId, codeHashes);

	return codes;
};

/**
 * Regenerate backup codes
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Response with new codes
 */
const regenerateBackupCodes = async (userId) => {
	try {
		const backupCodes = await generateBackupCodes(userId);

		return Response.ok({
			backupCodes,
			message: "New backup codes generated. Save them in a safe place.",
		});
	} catch (error) {
		console.error("Regenerate backup codes error:", error);
		throw error;
	}
};

// ============= Get 2FA Status =============

/**
 * Get user's 2FA status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - 2FA status
 */
const get2FAStatus = async (userId) => {
	try {
		const settings = await twoFactorModel.get2FASettings(userId);
		const passkeyCount = (await twoFactorModel.getUserPasskeys(userId)).length;
		const securityQuestions = await twoFactorModel.getSecurityQuestions(userId);
		const backupCodesRemaining = await twoFactorModel.getRemainingBackupCodesCount(userId);

		return Response.ok({
			is2FAEnabled: settings?.is_2fa_enabled || false,
			methods: {
				authenticator: {
					enabled: settings?.authenticator_enabled || false,
				},
				passkey: {
					enabled: settings?.passkey_enabled || false,
					count: passkeyCount,
				},
				oneTimeCode: {
					enabled: settings?.one_time_code_enabled || false,
				},
				securityQuestion: {
					enabled: settings?.security_question_enabled || false,
					count: securityQuestions.length,
				},
			},
			backupCodesRemaining,
		});
	} catch (error) {
		console.error("Get 2FA status error:", error);
		throw error;
	}
};

module.exports = {
	// Authenticator
	setupAuthenticator,
	verifyAndEnableAuthenticator,
	disableAuthenticator,

	// One-Time Code
	enableOneTimeCode,
	disableOneTimeCode,
	sendOneTimeCode,

	// Security Questions
	setupSecurityQuestions,
	disableSecurityQuestions,
	getSecurityQuestionsForVerification,
	verifySecurityAnswers,

	// Backup Codes
	generateBackupCodes,
	regenerateBackupCodes,

	// Status
	get2FAStatus,
};
