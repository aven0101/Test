const express = require("express");
const {
	registerSchema,
	loginSchema,
	selectRoleSchema,
	forgotPasswordSchema,
	resetPasswordSchema,
	requestPasswordResetOTPSchema,
	resetPasswordWithOTPSchema,
	changeEmailSchema,
	updatePasswordSchema,
} = require("../schemas/auth");
const {
	register,
	login,
	selectRole,
	forgotPassword,
	resetPassword,
	requestPasswordResetOTP,
	resetPasswordWithOTP,
	changeEmail,
	verify2FAAndLogin,
	send2FACode,
	updatePassword,
	removeSelfFromAdmin,
} = require("../controllers/auth");
const { authenticate, authenticateSuperAdmin } = require("../middleware/auth");
const { loginLimiter, registerLimiter, passwordResetLimiter, twoFALimiter, authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Auth management endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new business owner
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - confirmPassword
 *               - businessName
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@company.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"
 *                 example: "Password123!"
 *               confirmPassword:
 *                 type: string
 *                 example: "Password123!"
 *               phone:
 *                 type: string
 *                 pattern: "^[+]?[1-9][\\d]{0,15}$"
 *                 example: "+1234567890"
 *               businessName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Acme Corporation"
 *               businessDescription:
 *                 type: string
 *                 example: "A leading technology company"
 *     responses:
 *       201:
 *         description: Business owner registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 *       429:
 *         description: Too many registration attempts from this IP
 */
router.post("/register", registerLimiter, register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "Password123!"
 *     responses:
 *       200:
 *         description: Login successful (or role selection required for super_admin)
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts from this IP
 */
router.post("/login", loginLimiter, login);

/**
 * @swagger
 * /auth/select-role:
 *   post:
 *     summary: Select role for super_admin login
 *     tags: [Auth]
 *     description: Super admins must select whether to login as 'admin' or 'super_admin'. Pass the temporary token in Authorization header.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - selectedRole
 *             properties:
 *               selectedRole:
 *                 type: string
 *                 enum: [admin, super_admin]
 *                 description: Role to operate as
 *                 example: "super_admin"
 *     responses:
 *       200:
 *         description: Role selected successfully
 *       400:
 *         description: Invalid role selection
 *       401:
 *         description: Invalid or expired token
 *       403:
 *         description: Only super_admin can select roles
 *       429:
 *         description: Too many requests from this IP
 */
router.post("/select-role", authLimiter, selectRole);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset (super_admin only)
 *     tags: [Auth]
 *     description: Send a password reset email to the user's email address. Only super_admin users can use this feature.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent (if super_admin account exists)
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many password reset attempts from this IP
 *       500:
 *         description: Server error
 */
router.post("/forgot-password", passwordResetLimiter, forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     description: Reset password using the token received via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token from email
 *                 example: "a1b2c3d4e5f6..."
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"
 *                 example: "NewPassword123!"
 *               confirmPassword:
 *                 type: string
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid token or validation error
 *       429:
 *         description: Too many password reset attempts from this IP
 *       500:
 *         description: Server error
 */
router.post("/reset-password", passwordResetLimiter, resetPassword);

/**
 * @swagger
 * /auth/request-password-reset-otp:
 *   post:
 *     summary: Request password reset OTP (super_admin only)
 *     tags: [Auth]
 *     description: Send a 6-digit OTP to the user's email for password reset. Only super_admin users can use this feature.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *     responses:
 *       200:
 *         description: Password reset OTP sent (if super_admin account exists)
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many password reset attempts from this IP
 *       500:
 *         description: Server error
 */
router.post("/request-password-reset-otp", passwordResetLimiter, requestPasswordResetOTP);

/**
 * @swagger
 * /auth/reset-password-with-otp:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     description: Reset password using the 6-digit OTP received via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - password
 *               - confirmPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP from email
 *                 example: "123456"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"
 *                 example: "NewPassword123!"
 *               confirmPassword:
 *                 type: string
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid OTP or validation error
 *       429:
 *         description: Too many password reset attempts from this IP
 *       500:
 *         description: Server error
 */
router.post("/reset-password-with-otp", passwordResetLimiter, resetPasswordWithOTP);

/**
 * @swagger
 * /auth/change-email:
 *   put:
 *     summary: Change login email (super_admin only)
 *     tags: [Auth]
 *     description: Change the login email for the authenticated super_admin user. Requires current password verification.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newEmail
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password for verification
 *                 example: "CurrentPassword123!"
 *               newEmail:
 *                 type: string
 *                 format: email
 *                 description: New email address
 *                 example: "newemail@example.com"
 *     responses:
 *       200:
 *         description: Email updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Email updated successfully"
 *                     newEmail:
 *                       type: string
 *                       example: "newemail@example.com"
 *       400:
 *         description: Validation error or new email same as current
 *       401:
 *         description: Authentication failed or incorrect password
 *       403:
 *         description: Only super_admin can change email
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 *       429:
 *         description: Too many requests from this IP
 *       500:
 *         description: Server error
 */
router.put("/change-email", authLimiter, authenticateSuperAdmin, changeEmail);

/**
 * @swagger
 * /auth/verify-2fa:
 *   post:
 *     summary: Verify 2FA and complete login
 *     tags: [Auth]
 *     description: Verify 2FA code and complete the login process
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tempToken
 *               - method
 *             properties:
 *               tempToken:
 *                 type: string
 *                 description: Temporary token from login response
 *               method:
 *                 type: string
 *                 enum: [authenticator, one_time_code, security_question, backup_code]
 *                 example: "authenticator"
 *               code:
 *                 type: string
 *                 description: 6-digit code (for authenticator, one_time_code, backup_code)
 *                 example: "123456"
 *               answers:
 *                 type: array
 *                 description: Array of answers (for security_question method)
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     answer:
 *                       type: string
 *     responses:
 *       200:
 *         description: 2FA verified and login successful
 *       400:
 *         description: Invalid code or method
 *       401:
 *         description: Invalid or expired token
 *       429:
 *         description: Too many 2FA verification attempts from this IP
 */
router.post("/verify-2fa", twoFALimiter, verify2FAAndLogin);

/**
 * @swagger
 * /auth/send-2fa-code:
 *   post:
 *     summary: Send one-time code via email
 *     tags: [Auth]
 *     description: Request a one-time code to be sent to email for 2FA verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tempToken
 *             properties:
 *               tempToken:
 *                 type: string
 *                 description: Temporary token from login response
 *     responses:
 *       200:
 *         description: Code sent to email
 *       400:
 *         description: One-time code not enabled
 *       401:
 *         description: Invalid or expired token
 *       429:
 *         description: Too many 2FA code requests from this IP
 */
router.post("/send-2fa-code", twoFALimiter, send2FACode);

/**
 * @swagger
 * /auth/update-password:
 *   put:
 *     summary: Update password for authenticated user
 *     tags: [Auth]
 *     description: Change the password for the authenticated user. Requires current password verification.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password for verification
 *                 example: "CurrentPassword123!"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"
 *                 description: New password
 *                 example: "NewPassword123!"
 *               confirmPassword:
 *                 type: string
 *                 description: Confirmation of new password
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *       400:
 *         description: Validation error or new password same as current
 *       401:
 *         description: Authentication failed or incorrect current password
 *       403:
 *         description: Account is inactive
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests from this IP
 *       500:
 *         description: Server error
 */
router.put("/update-password", authLimiter, authenticate, updatePassword);

/**
 * @swagger
 * /auth/remove-self-from-admin:
 *   delete:
 *     summary: Remove admin role from self (super_admin only)
 *     tags: [Auth]
 *     description: |
 *       Allows a super_admin to permanently remove their admin role.
 *       This action is irreversible - once removed, the admin role cannot be reassigned.
 *       Can only be performed if there are other admins in the system.
 *       After removal, the user can only act as super_admin.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin role removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Admin role removed successfully. You can no longer act as admin and this cannot be undone."
 *                     remainingRoles:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["super_admin"]
 *       400:
 *         description: |
 *           - You do not have the admin role
 *           - Admin role has already been permanently removed
 *           - You are the only admin in the system
 *       403:
 *         description: Only super_admin can perform this action
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests from this IP
 *       500:
 *         description: Server error
 */
router.delete("/remove-self-from-admin", authLimiter, authenticateSuperAdmin, removeSelfFromAdmin);

module.exports = router;
