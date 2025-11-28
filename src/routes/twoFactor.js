const express = require("express");
const {
	get2FAStatus,
	setupAuthenticator,
	verifyAndEnableAuthenticator,
	disableAuthenticator,
	enableOneTimeCode,
	disableOneTimeCode,
	setupSecurityQuestions,
	disableSecurityQuestions,
	getSecurityQuestions,
	regenerateBackupCodes,
} = require("../controllers/twoFactor");
const { authenticateBusinessAdmin } = require("../middleware/businessAuth");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Two-Factor Authentication
 *   description: Manage 2FA methods and settings
 */

/**
 * @swagger
 * /2fa/status:
 *   get:
 *     summary: Get 2FA status
 *     tags: [Two-Factor Authentication]
 *     description: Get current 2FA settings and enabled methods
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA status retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/status", authenticateBusinessAdmin, get2FAStatus);

// ============= Authenticator Routes =============

/**
 * @swagger
 * /2fa/authenticator/setup:
 *   post:
 *     summary: Setup authenticator (TOTP)
 *     tags: [Two-Factor Authentication]
 *     description: Generate QR code for Google Authenticator, Authy, etc.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR code and secret generated
 *       401:
 *         description: Unauthorized
 */
router.post("/authenticator/setup", authenticateBusinessAdmin, setupAuthenticator);

/**
 * @swagger
 * /2fa/authenticator/verify:
 *   post:
 *     summary: Verify and enable authenticator
 *     tags: [Two-Factor Authentication]
 *     description: Verify the 6-digit code from authenticator app and enable 2FA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Authenticator enabled successfully with backup codes
 *       400:
 *         description: Invalid code
 *       401:
 *         description: Unauthorized
 */
router.post("/authenticator/verify", authenticateBusinessAdmin, verifyAndEnableAuthenticator);

/**
 * @swagger
 * /2fa/authenticator/disable:
 *   post:
 *     summary: Disable authenticator
 *     tags: [Two-Factor Authentication]
 *     description: Disable authenticator 2FA method
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticator disabled successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/authenticator/disable", authenticateBusinessAdmin, disableAuthenticator);

// ============= One-Time Code Routes =============

/**
 * @swagger
 * /2fa/one-time-code/enable:
 *   post:
 *     summary: Enable email one-time code
 *     tags: [Two-Factor Authentication]
 *     description: Enable 2FA via email OTP codes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: One-time code enabled with backup codes
 *       401:
 *         description: Unauthorized
 */
router.post("/one-time-code/enable", authenticateBusinessAdmin, enableOneTimeCode);

/**
 * @swagger
 * /2fa/one-time-code/disable:
 *   post:
 *     summary: Disable email one-time code
 *     tags: [Two-Factor Authentication]
 *     description: Disable email OTP 2FA method
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: One-time code disabled successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/one-time-code/disable", authenticateBusinessAdmin, disableOneTimeCode);

// ============= Security Questions Routes =============

/**
 * @swagger
 * /2fa/security-questions/setup:
 *   post:
 *     summary: Setup security questions
 *     tags: [Two-Factor Authentication]
 *     description: Setup 3-5 security questions for 2FA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questions
 *             properties:
 *               questions:
 *                 type: array
 *                 minItems: 3
 *                 maxItems: 5
 *                 items:
 *                   type: object
 *                   required:
 *                     - question
 *                     - answer
 *                   properties:
 *                     question:
 *                       type: string
 *                       example: "What was your first pet's name?"
 *                     answer:
 *                       type: string
 *                       example: "Fluffy"
 *     responses:
 *       200:
 *         description: Security questions setup successfully with backup codes
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/security-questions/setup", authenticateBusinessAdmin, setupSecurityQuestions);

/**
 * @swagger
 * /2fa/security-questions/disable:
 *   post:
 *     summary: Disable security questions
 *     tags: [Two-Factor Authentication]
 *     description: Disable security questions 2FA method
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security questions disabled successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/security-questions/disable", authenticateBusinessAdmin, disableSecurityQuestions);

/**
 * @swagger
 * /2fa/security-questions:
 *   get:
 *     summary: Get security questions
 *     tags: [Two-Factor Authentication]
 *     description: Get user's security questions (without answers) for verification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security questions retrieved
 *       401:
 *         description: Unauthorized
 */
router.get("/security-questions", authenticateBusinessAdmin, getSecurityQuestions);

// ============= Backup Codes Routes =============

/**
 * @swagger
 * /2fa/backup-codes/regenerate:
 *   post:
 *     summary: Regenerate backup codes
 *     tags: [Two-Factor Authentication]
 *     description: Generate new set of backup codes (invalidates old ones)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes regenerated successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/backup-codes/regenerate", authenticateBusinessAdmin, regenerateBackupCodes);

module.exports = router;
