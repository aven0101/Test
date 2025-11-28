const speakeasy = require("speakeasy");
const bcrypt = require("bcryptjs");
const twoFactorModel = require("../models/twoFactor");
const authModel = require("../models/auth");
const { Response } = require("../utils/controller");
const requestIp = require("request-ip");
const logger = require("../config/logger");

/**
 * Verify authenticator code
 * @param {string} userId - User ID
 * @param {string} token - 6-digit code
 * @param {Object} req - Request object for IP logging
 * @returns {Promise<boolean>} - True if valid
 */
const verifyAuthenticatorCode = async (userId, token, req) => {
	try {
		const authData = await twoFactorModel.getAuthenticatorSecret(userId);

		if (!authData || !authData.is_verified) {
			return false;
		}

		const isValid = speakeasy.totp.verify({
			secret: authData.secret,
			encoding: "base32",
			token: token,
			window: 2,
		});

		// Log attempt
		const ipAddress = req ? requestIp.getClientIp(req) : null;
		await twoFactorModel.log2FAAttempt({
			userId,
			method: "authenticator",
			success: isValid,
			ipAddress,
		});

		return isValid;
	} catch (error) {
		console.error("Verify authenticator code error:", error);
		return false;
	}
};

/**
 * Verify one-time code (email OTP)
 * @param {string} userId - User ID
 * @param {string} email - User's email
 * @param {string} otp - 6-digit OTP
 * @param {Object} req - Request object for IP logging
 * @returns {Promise<boolean>} - True if valid
 */
const verifyOneTimeCode = async (userId, email, otp, req) => {
	try {
		const isValid = await authModel.verifyToken({ email, otp });

		// Log attempt
		const ipAddress = req ? requestIp.getClientIp(req) : null;
		await twoFactorModel.log2FAAttempt({
			userId,
			method: "one_time_code",
			success: isValid,
			ipAddress,
		});

		if (isValid) {
			// Mark OTP as used
			await authModel.updateOtpStatus({ email });
		}

		return isValid;
	} catch (error) {
		console.error("Verify one-time code error:", error);
		return false;
	}
};

/**
 * Verify security question answers
 * @param {string} userId - User ID
 * @param {Array} answers - Array of {id, answer} - User can provide one or more answers
 * @param {Object} req - Request object for IP logging
 * @returns {Promise<boolean>} - True if at least one answer is correct
 */
const verifySecurityQuestionsCode = async (userId, answers, req) => {
	try {
		const questions = await twoFactorModel.getSecurityQuestions(userId);

		logger.info("🔍 [SECURITY QUESTION DEBUG] Starting verification", {
			userId,
			totalQuestionsStored: questions?.length || 0,
			answersProvided: answers?.length || 0,
		});

		if (!questions || questions.length === 0) {
			logger.warn("❌ [SECURITY QUESTION DEBUG] No questions found for user", { userId });
			return false;
		}

		// User needs to answer at least one question
		if (!answers || answers.length === 0) {
			logger.warn("❌ [SECURITY QUESTION DEBUG] No answers provided", {
				userId,
				totalQuestions: questions.length,
			});
			// Log failed attempt
			const ipAddress = req ? requestIp.getClientIp(req) : null;
			await twoFactorModel.log2FAAttempt({
				userId,
				method: "security_question",
				success: false,
				ipAddress,
			});
			return false;
		}

		// Check if at least one answer is correct (user can pick any question)
		let atLeastOneCorrect = false;
		for (const answer of answers) {
			const question = questions.find((q) => q.id === answer.id);
			
			logger.info("🔍 [SECURITY QUESTION DEBUG] Checking answer", {
				userId,
				questionId: answer.id,
				questionFound: !!question,
				answerProvided: answer.answer,
				answerLength: answer.answer?.length || 0,
			});

			if (!question) {
				logger.warn("❌ [SECURITY QUESTION DEBUG] Question ID not found", {
					userId,
					providedId: answer.id,
					availableIds: questions.map((q) => q.id),
				});
				continue; // Skip invalid question ID, continue checking others
			}

			const normalizedAnswer = answer.answer.toLowerCase().trim();
			logger.info("🔍 [SECURITY QUESTION DEBUG] Comparing answer", {
				userId,
				questionId: question.id,
				normalizedAnswer,
				hashExists: !!question.answer_hash,
				hashPreview: question.answer_hash ? question.answer_hash.substring(0, 20) + "..." : null,
			});

			const isValid = await bcrypt.compare(normalizedAnswer, question.answer_hash);
			
			if (isValid) {
				logger.info("✅ [SECURITY QUESTION DEBUG] Answer correct", {
					userId,
					questionId: question.id,
				});
				atLeastOneCorrect = true;
				break; // Found one correct answer, that's enough
			} else {
				logger.warn("❌ [SECURITY QUESTION DEBUG] Answer incorrect", {
					userId,
					questionId: question.id,
					normalizedAnswer,
				});
			}
		}

		logger.info("📊 [SECURITY QUESTION DEBUG] Final result", {
			atLeastOneCorrect,
			userId,
			answersChecked: answers.length,
		});

		// Log attempt
		const ipAddress = req ? requestIp.getClientIp(req) : null;
		await twoFactorModel.log2FAAttempt({
			userId,
			method: "security_question",
			success: atLeastOneCorrect,
			ipAddress,
		});

		return atLeastOneCorrect;
	} catch (error) {
		logger.error("❌ [SECURITY QUESTION DEBUG] Error during verification:", {
			error: error.message,
			stack: error.stack,
			userId,
		});
		return false;
	}
};

/**
 * Verify backup code
 * @param {string} userId - User ID
 * @param {string} code - Backup code
 * @param {Object} req - Request object for IP logging
 * @returns {Promise<boolean>} - True if valid
 */
const verifyBackupCode = async (userId, code, req) => {
	try {
		const { executeQuery } = require("../config/database");

		// Get all unused backup codes
		const codes = await executeQuery(
			`
			SELECT * FROM user_2fa_backup_code
			WHERE user_id = ? AND is_used = FALSE
			`,
			[userId],
		);

		// Check each code
		for (const storedCode of codes) {
			const isValid = await bcrypt.compare(code, storedCode.code_hash);
			if (isValid) {
				// Mark as used
				await twoFactorModel.useBackupCode(userId, storedCode.code_hash);

				// Log success
				const ipAddress = req ? requestIp.getClientIp(req) : null;
				await twoFactorModel.log2FAAttempt({
					userId,
					method: "backup_code",
					success: true,
					ipAddress,
				});

				return true;
			}
		}

		// Log failure
		const ipAddress = req ? requestIp.getClientIp(req) : null;
		await twoFactorModel.log2FAAttempt({
			userId,
			method: "backup_code",
			success: false,
			ipAddress,
		});

		return false;
	} catch (error) {
		console.error("Verify backup code error:", error);
		return false;
	}
};

/**
 * Verify any 2FA method
 * @param {string} userId - User ID
 * @param {string} email - User's email
 * @param {Object} verificationData - Verification data
 * @param {Object} req - Request object
 * @returns {Promise<Object>} - Response
 */
const verify2FA = async (userId, email, verificationData, req) => {
	try {
		const { method, code, answers } = verificationData;

		logger.info("🔍 [2FA VERIFY] Starting verification", {
			userId,
			method,
			hasCode: !!code,
			hasAnswers: !!answers,
			answersCount: answers?.length || 0,
		});

		// Check failed attempts
		const failedAttempts = await twoFactorModel.getRecentFailedAttempts(userId, 30);
		if (failedAttempts >= 5) {
			return Response.error("Too many failed attempts. Please try again in 30 minutes.", 429);
		}

		let isValid = false;

		switch (method) {
			case "authenticator":
				isValid = await verifyAuthenticatorCode(userId, code, req);
				break;

			case "one_time_code":
				isValid = await verifyOneTimeCode(userId, email, code, req);
				break;

			case "security_question":
				logger.info("🔍 [2FA VERIFY] Calling verifySecurityQuestionsCode", { userId, answersCount: answers?.length });
				isValid = await verifySecurityQuestionsCode(userId, answers, req);
				logger.info("🔍 [2FA VERIFY] verifySecurityQuestionsCode returned", { userId, isValid });
				break;

			case "backup_code":
				isValid = await verifyBackupCode(userId, code, req);
				break;

			default:
				logger.warn("❌ [2FA VERIFY] Invalid method", { userId, method });
				return Response.error("Invalid 2FA method", 400);
		}

		logger.info("📊 [2FA VERIFY] Verification result", {
			userId,
			method,
			isValid,
		});

		if (!isValid) {
			logger.warn("❌ [2FA VERIFY] Verification failed", { userId, method });
			return Response.error("Invalid verification", 400);
		}

		logger.info("✅ [2FA VERIFY] Verification successful", { userId, method });
		return Response.okMessage("2FA verification successful");
	} catch (error) {
		logger.error("❌ [2FA VERIFY] Error during verification:", {
			error: error.message,
			stack: error.stack,
			userId,
		});
		throw error;
	}
};

module.exports = {
	verifyAuthenticatorCode,
	verifyOneTimeCode,
	verifySecurityQuestionsCode,
	verifyBackupCode,
	verify2FA,
};
