const model = require("../models/auth"),
	userModel = require("../models/user"),
	userRolesModel = require("../models/userRoles"),
	businessModel = require("../models/business"),
	passwordResetModel = require("../models/passwordReset"),
	authModel = require("../models/auth"),
	deviceSessionModel = require("../models/deviceSession"),
	emailService = require("./email"),
	bcrypt = require("bcryptjs"),
	jwt = require("jsonwebtoken"),
	config = require("../config/index"),
	{ randomInt } = require("../utils/randomInt"),
	{ Response } = require("../utils/controller"),
	{ ROLES, ROLE_IDS, SUPER_ADMIN_SELECTABLE_ROLES } = require("../constants/roles"),
	{ extractDeviceInfo } = require("../utils/deviceInfo"),
	logger = require("../config/logger"),
	assert = require("assert");

/**
 * Check if the current device is blocked for the user
 * @param {string} userId - User ID
 * @param {Object} req - Request object
 * @returns {Promise<boolean>} - True if device is blocked
 */
const isDeviceBlocked = async (userId, req) => {
	if (!req) return false;

	try {
		const deviceInfo = extractDeviceInfo(req);
		const sessions = await deviceSessionModel.getUserSessions(userId);

		// Check if there's a blocked session matching this device
		const blockedSession = sessions.find(
			(session) =>
				session.is_blocked &&
				session.ip_address === deviceInfo.ipAddress &&
				session.browser === deviceInfo.browser &&
				session.os === deviceInfo.os
		);

		return !!blockedSession;
	} catch (error) {
		logger.error("Error checking if device is blocked", { error: error.message, userId });
		// Don't block login if check fails (fail open for availability)
		return false;
	}
};

const login = async ({ email, password, req }) => {
	const user = await userModel.getByEmail(email);
	if (!user) return Response.error("User does not exist", 404);

	const validPass = await bcrypt.compare(password, user.password);
	if (!validPass) return Response.error("Invalid password");
	delete user.password;

	if (user.is_deleted) return Response.error("User not found", 404);

	// Check if device is blocked before allowing login
	const deviceBlocked = await isDeviceBlocked(user.id, req);
	if (deviceBlocked) {
		return Response.error(
			"This device has been blocked from accessing this account. Please contact support or unblock from another device.",
			403
		);
	}

	// Check if user has 2FA enabled
	const twoFactorModel = require("../models/twoFactor");
	const twoFASettings = await twoFactorModel.get2FASettings(user.id);

	if (twoFASettings && twoFASettings.is_2fa_enabled) {
		// Generate a temporary token for 2FA verification
		const tempToken = jwt.sign(
			{
				id: user.id,
				role: user.role,
				temp2FA: true, // Mark as temporary 2FA token
			},
			config.jwtSecret,
			{ expiresIn: "10m" }, // Short expiry for 2FA verification
		);

		// Remove business_id from response
		const { business_id, ...userWithoutBusinessId } = user;

		return Response.ok({
			require2FA: true,
			tempToken,
			availableMethods: {
				authenticator: twoFASettings.authenticator_enabled,
				oneTimeCode: twoFASettings.one_time_code_enabled,
				securityQuestion: twoFASettings.security_question_enabled,
				backupCode: true, // Always available
			},
			user: userWithoutBusinessId,
			message: "Please complete 2FA verification",
		});
	}

	// If user is super_admin, check available roles from user_roles table
	if (user.role === ROLES.SUPER_ADMIN) {
		// Get all available roles for this user from user_roles table
		const userRoleNames = await userRolesModel.getUserRoleNames(user.id);
		
		// If user has multiple roles, require role selection
		if (userRoleNames.length > 1) {
			// Generate a temporary token for role selection
			const tempToken = jwt.sign(
				{
					id: user.id,
					role: user.role,
					temp: true, // Mark as temporary token
				},
				config.jwtSecret,
				{ expiresIn: "10m" }, // Short expiry for role selection
			);

			// Remove business_id from response
			const { business_id, ...userWithoutBusinessId } = user;

			return Response.ok({
				requireRoleSelection: true,
				tempToken,
				availableRoles: userRoleNames,
				user: userWithoutBusinessId,
				message: "Please select your login role",
			});
		}
	}

	const token = jwt.sign(
		{
			id: user.id,
			role: user.role,
		},
		config.jwtSecret,
		{ expiresIn: "7d" },
	);

	// Create device session
	if (req) {
		try {
			const deviceInfo = extractDeviceInfo(req);
			logger.info("Creating device session", { userId: user.id, ipAddress: deviceInfo.ipAddress, browser: deviceInfo.browser, os: deviceInfo.os });
			const sessionId = await deviceSessionModel.createSession({
				userId: user.id,
				...deviceInfo,
			});
			logger.info("Device session created successfully", { sessionId, userId: user.id });
		} catch (error) {
			logger.error("Error creating device session", { error: error.message, stack: error.stack, userId: user.id });
			// Don't fail login if device session creation fails
		}
	} else {
		logger.warn("No req object available for device session creation", { userId: user.id });
	}

	await userModel.updateLastLoggedIn(user.id);

	// Remove business_id from response, keep business_name
	const { business_id, ...userWithoutBusinessId } = user;

	return Response.ok({
		user: {
			token,
			...userWithoutBusinessId,
		},
	});
};

const register = async (newUser) => {
	try {
		// Check if user already exists
		const existingUser = await userModel.getByEmail(newUser.email);
		if (existingUser) {
			return Response.error("User with this email already exists", 409);
		}

		const hashedPassword = await bcrypt.hash(newUser.password, config.saltRounds);

		// Create business owner user
		const { userId } = await userModel.create({
			name: newUser.name,
			email: newUser.email,
			password: hashedPassword,
			phone: newUser.phone,
			role_id: ROLE_IDS.SUPER_ADMIN, // Business owners are super admins
			account_name: "business",
		});

		// Create business for the owner
		const { businessId } = await businessModel.create({
			name: newUser.businessName,
			description: newUser.businessDescription,
			owner_id: userId,
		});

		// Update user with business_id
		await userModel.updateBusinessId(userId, businessId);

		// Initialize user roles in user_roles table
		await userRolesModel.initializeUserRoles(userId, ROLE_IDS.SUPER_ADMIN);

		const user = await userModel.getById(userId);
		assert.ok(user, "User should exist");
		delete user.password;

		const otp = randomInt(100000, 999999); // Generate 6-digit OTP

		// const mailBody = {
		// 	to: [user.email],
		// 	subject: "Verify Email",
		// 	message: getVerifyEmailContent({
		// 		name: fullName(user),
		// 		otp,
		// 	}),
		// };

		// emailService.sendEmail(mailBody);
		await model.insertOtp({ email: user.email, otp });

		return Response.okMessage("Business owner registered successfully");
	} catch (error) {
		if (error.code === "ER_DUP_ENTRY") {
			return Response.error("User with this email already exists", 409);
		}
		throw error;
	}
};

const selectRole = async ({ selectedRole, tempToken, req }) => {
	try {
		// Verify temp token is provided
		if (!tempToken) {
			return Response.error("Temporary token is required in Authorization header", 401);
		}

		// Verify the temporary token
		const decoded = jwt.verify(tempToken, config.jwtSecret);

		// Check if it's a temporary token
		if (!decoded.temp) {
			return Response.error("Invalid token. Please use the temporary token from login.", 401);
		}

		// Verify user still exists and is super_admin
		const user = await userModel.getById(decoded.id);
		if (!user) return Response.error("User does not exist", 404);
		if (user.role !== ROLES.SUPER_ADMIN) {
			return Response.error("Only super_admin can select roles", 403);
		}
		if (user.is_deleted) return Response.error("User not found", 404);

		// Get available roles from user_roles table
		const userRoleNames = await userRolesModel.getUserRoleNames(user.id);
		
		// Validate selected role - user must have this role assigned and active
		if (!userRoleNames.includes(selectedRole)) {
			return Response.error("You do not have access to this role", 403);
		}

		// Check if device is blocked before allowing role selection and login
		const deviceBlocked = await isDeviceBlocked(user.id, req);
		if (deviceBlocked) {
			return Response.error(
				"This device has been blocked from accessing this account. Please contact support or unblock from another device.",
				403
			);
		}

		// Create new token with selected role
		const token = jwt.sign(
			{
				id: user.id,
				role: selectedRole, // Use the selected role instead of actual role
				actualRole: user.role, // Keep track of actual role for audit
			},
			config.jwtSecret,
			{ expiresIn: "7d" },
		);

		// Create device session for super_admin users
		if (req) {
			try {
				const deviceInfo = extractDeviceInfo(req);
				logger.info("Creating device session (selectRole)", { userId: user.id, ipAddress: deviceInfo.ipAddress, browser: deviceInfo.browser, os: deviceInfo.os, selectedRole });
				const sessionId = await deviceSessionModel.createSession({
					userId: user.id,
					...deviceInfo,
				});
				logger.info("Device session created successfully (selectRole)", { sessionId, userId: user.id, selectedRole });
			} catch (error) {
				logger.error("Error creating device session (selectRole)", { error: error.message, stack: error.stack, userId: user.id, selectedRole });
				// Don't fail role selection if device session creation fails
			}
		} else {
			logger.warn("No req object available for device session creation (selectRole)", { userId: user.id, selectedRole });
		}

		await userModel.updateLastLoggedIn(user.id);

		// Remove password and business_id from response
		delete user.password;
		const { business_id, ...userWithoutBusinessId } = user;

		return Response.ok({
			user: {
				token,
				...userWithoutBusinessId,
				activeRole: selectedRole, // Show which role they're operating as
			},
			message: `Logged in as ${selectedRole}`,
		});
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return Response.error("Role selection token expired. Please login again.", 401);
		}
		if (error.name === "JsonWebTokenError") {
			return Response.error("Invalid token", 401);
		}
		throw error;
	}
};

const forgotPassword = async ({ email }) => {
	try {
		// Find user by email
		const user = await userModel.getByEmail(email);

		// Don't reveal if user exists or not for security
		// Always return success message
		if (!user || user.is_deleted) {
			return Response.okMessage("If an account with that email exists, a password reset link has been sent.");
		}

		// Only super_admin can reset their password
		if (user.role !== ROLES.SUPER_ADMIN) {
			// Still return success for security (don't reveal role restrictions)
			return Response.okMessage("If an account with that email exists, a password reset link has been sent.");
		}

		// Generate reset token
		const resetToken = await passwordResetModel.createResetToken(user.id);

		// Send email with reset link
		try {
			await emailService.sendPasswordResetEmail({
				email: user.email,
				name: `${user.first_name} ${user.last_name}`.trim(),
				resetToken,
			});

			return Response.okMessage("If an account with that email exists, a password reset link has been sent.");
		} catch (emailError) {
			// Log the error but don't expose it to the user
			logger.error("Failed to send password reset email", { error: emailError.message, stack: emailError.stack, email });
			return Response.error("Failed to send password reset email. Please try again later.", 500);
		}
	} catch (error) {
		logger.error("Forgot password error", { error: error.message, stack: error.stack, email });
		throw error;
	}
};

const resetPassword = async ({ token, password }) => {
	try {
		// Verify token and get user info
		const tokenData = await passwordResetModel.getResetToken(token);

		if (!tokenData) {
			return Response.error("Invalid or expired reset token", 400);
		}

		// Hash the new password
		const hashedPassword = await bcrypt.hash(password, config.saltRounds);

		// Update user password
		await userModel.updatePassword(tokenData.user_id, hashedPassword);

		// Mark token as used
		await passwordResetModel.markTokenAsUsed(token);

		// Delete all other unused reset tokens for this user
		await passwordResetModel.deleteUserResetTokens(tokenData.user_id);

		return Response.okMessage("Password has been reset successfully. You can now login with your new password.");
	} catch (error) {
		logger.error("Reset password error", { error: error.message, stack: error.stack, tokenPrefix: token?.substring(0, 10) });
		throw error;
	}
};

const requestPasswordResetOTP = async ({ email }) => {
	try {
		// Find user by email
		const user = await userModel.getByEmail(email);

		// Don't reveal if user exists or not for security
		// Always return success message
		if (!user || user.is_deleted) {
			return Response.okMessage("If an account with that email exists, a password reset code has been sent.");
		}

		// Only super_admin can reset their password
		if (user.role !== ROLES.SUPER_ADMIN) {
			// Still return success for security (don't reveal role restrictions)
			return Response.okMessage("If an account with that email exists, a password reset code has been sent.");
		}

		// Generate 6-digit OTP
		const otp = randomInt(100000, 999999).toString();

		// Save OTP to database
		await authModel.insertOtp({ email: user.email, otp });

		// Send email with OTP
		try {
			await emailService.sendPasswordResetOTPEmail({
				email: user.email,
				name: `${user.first_name} ${user.last_name}`.trim(),
				otp,
			});

			return Response.okMessage("If an account with that email exists, a password reset code has been sent.");
		} catch (emailError) {
			// Log the error but don't expose it to the user
			logger.error("Failed to send password reset OTP email", { error: emailError.message, stack: emailError.stack, email });
			return Response.error("Failed to send password reset code. Please try again later.", 500);
		}
	} catch (error) {
		logger.error("Request password reset OTP error", { error: error.message, stack: error.stack, email });
		throw error;
	}
};

const resetPasswordWithOTP = async ({ email, otp, password }) => {
	try {
		// Find user by email
		const user = await userModel.getByEmail(email);

		if (!user || user.is_deleted) {
			return Response.error("Invalid credentials", 400);
		}

		// Only super_admin can reset their password
		if (user.role !== ROLES.SUPER_ADMIN) {
			return Response.error("Invalid credentials", 400);
		}

		// Verify OTP
		const isValidOTP = await authModel.verifyToken({ email, otp });

		if (!isValidOTP) {
			return Response.error("Invalid or expired OTP code", 400);
		}

		// Hash the new password
		const hashedPassword = await bcrypt.hash(password, config.saltRounds);

		// Update user password
		await userModel.updatePassword(user.id, hashedPassword);

		// Mark OTP as used
		await authModel.updateOtpStatus({ email });

		return Response.okMessage("Password has been reset successfully. You can now login with your new password.");
	} catch (error) {
		logger.error("Reset password with OTP error", { error: error.message, stack: error.stack, email });
		throw error;
	}
};

const changeEmail = async ({ userId, currentPassword, newEmail }) => {
	try {
		// Get user details
		const user = await userModel.getById(userId);

		if (!user || user.is_deleted) {
			return Response.error("User not found", 404);
		}

		// Only super_admin can change email
		if (user.role !== ROLES.SUPER_ADMIN) {
			return Response.error("Only super admin can change email", 403);
		}

		// Verify current password
		const validPassword = await bcrypt.compare(currentPassword, user.password);
		if (!validPassword) {
			return Response.error("Current password is incorrect", 401);
		}

		// Check if new email is already in use
		const existingUser = await userModel.getByEmail(newEmail);
		if (existingUser && existingUser.id !== userId) {
			return Response.error("Email is already in use", 409);
		}

		// Check if new email is same as current
		if (user.email === newEmail) {
			return Response.error("New email cannot be the same as current email", 400);
		}

		// Update email
		await userModel.updateEmail(userId, newEmail);

		return Response.ok({
			message: "Email updated successfully",
			newEmail: newEmail,
		});
	} catch (error) {
		logger.error("Change email error", { error: error.message, stack: error.stack, userId });
		throw error;
	}
};

const verify2FAAndLogin = async ({ tempToken, method, code, answers, req }) => {
	try {
		// Verify temp token
		const decoded = jwt.verify(tempToken, config.jwtSecret);

		if (!decoded.temp2FA) {
			return Response.error("Invalid token. Please login first.", 401);
		}

		const user = await userModel.getById(decoded.id);
		if (!user || user.is_deleted) {
			return Response.error("User not found", 404);
		}

		// Verify 2FA
		const verificationService = require("./twoFactorVerification");
		const result = await verificationService.verify2FA(user.id, user.email, { method, code, answers }, req);

		if (result.error) {
			return result;
		}

		// Check if device is blocked before allowing login after 2FA
		const deviceBlocked = await isDeviceBlocked(user.id, req);
		if (deviceBlocked) {
			return Response.error(
				"This device has been blocked from accessing this account. Please contact support or unblock from another device.",
				403
			);
		}

		// 2FA verified - now check if super_admin needs role selection
		if (user.role === ROLES.SUPER_ADMIN) {
			// Get all available roles for this user from user_roles table
			const userRoleNames = await userRolesModel.getUserRoleNames(user.id);
			
			// If user has multiple roles, require role selection
			if (userRoleNames.length > 1) {
				// Generate a temporary token for role selection
				const roleSelectionToken = jwt.sign(
					{
						id: user.id,
						role: user.role,
						temp: true,
					},
					config.jwtSecret,
					{ expiresIn: "10m" },
				);

				const { business_id, ...userWithoutBusinessId } = user;

				return Response.ok({
					requireRoleSelection: true,
					tempToken: roleSelectionToken,
					availableRoles: userRoleNames,
					user: userWithoutBusinessId,
					message: "2FA verified. Please select your login role",
				});
			}
		}

		// Generate final auth token
		const token = jwt.sign(
			{
				id: user.id,
				role: user.role,
			},
			config.jwtSecret,
			{ expiresIn: "7d" },
		);

		// Create device session
		if (req) {
			try {
				const deviceInfo = extractDeviceInfo(req);
				await deviceSessionModel.createSession({
					userId: user.id,
					...deviceInfo,
				});
			} catch (error) {
				logger.error("Error creating device session (verify2FAAndLogin)", { error: error.message, stack: error.stack, userId: user.id });
			}
		}

		await userModel.updateLastLoggedIn(user.id);

		// Remove business_id from response, keep business_name
		const { business_id, ...userWithoutBusinessId } = user;

		return Response.ok({
			user: {
				token,
				...userWithoutBusinessId,
			},
		});
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return Response.error("2FA token expired. Please login again.", 401);
		}
		if (error.name === "JsonWebTokenError") {
			return Response.error("Invalid token", 401);
		}
		throw error;
	}
};

const send2FACode = async ({ tempToken }) => {
	try {
		// Verify temp token
		const decoded = jwt.verify(tempToken, config.jwtSecret);

		if (!decoded.temp2FA) {
			return Response.error("Invalid token. Please login first.", 401);
		}

		const user = await userModel.getById(decoded.id);
		if (!user || user.is_deleted) {
			return Response.error("User not found", 404);
		}

		// Check if one-time code is enabled
		const twoFactorModel = require("../models/twoFactor");
		const settings = await twoFactorModel.get2FASettings(user.id);

		if (!settings || !settings.one_time_code_enabled) {
			return Response.error("One-time code is not enabled", 400);
		}

		// Send OTP
		const twoFactorService = require("./twoFactor");
		return await twoFactorService.sendOneTimeCode(user);
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return Response.error("Token expired. Please login again.", 401);
		}
		if (error.name === "JsonWebTokenError") {
			return Response.error("Invalid token", 401);
		}
		throw error;
	}
};

const updatePassword = async ({ userId, currentPassword, newPassword }) => {
	try {
		// Get user details
		const user = await userModel.getById(userId);

		if (!user || user.is_deleted) {
			return Response.error("User not found", 404);
		}

		// Verify current password
		const validPassword = await bcrypt.compare(currentPassword, user.password);
		if (!validPassword) {
			return Response.error("Current password is incorrect", 401);
		}

		// Check if new password is same as current
		const samePassword = await bcrypt.compare(newPassword, user.password);
		if (samePassword) {
			return Response.error("New password cannot be the same as current password", 400);
		}

		// Hash the new password
		const hashedPassword = await bcrypt.hash(newPassword, config.saltRounds);

		// Update user password
		await userModel.updatePassword(userId, hashedPassword);

		return Response.okMessage("Password updated successfully");
	} catch (error) {
		logger.error("Update password error", { error: error.message, stack: error.stack, userId });
		throw error;
	}
};

const removeSelfFromAdmin = async ({ userId }) => {
	try {
		// Get user details
		const user = await userModel.getById(userId);

		if (!user || user.is_deleted) {
			return Response.error("User not found", 404);
		}

		// Only super_admin can remove themselves from admin
		if (user.role !== ROLES.SUPER_ADMIN) {
			return Response.error("Only super_admin can remove themselves from admin role", 403);
		}

		// Check if user currently has the admin role
		const hasAdminRole = await userRolesModel.userHasRole(userId, ROLE_IDS.ADMIN);
		if (!hasAdminRole) {
			return Response.error("You do not have the admin role", 400);
		}

		// Check if the admin role can be reassigned (if it was previously removed and marked as non-reassignable)
		const canReassign = await userRolesModel.canReassignRole(userId, ROLE_IDS.ADMIN);
		if (!canReassign) {
			return Response.error("Admin role has already been permanently removed and cannot be modified", 400);
		}

		// Check if user has a business_id
		if (!user.business_id) {
			return Response.error("User is not associated with any business", 400);
		}

		// Check if there are other admins in the same business (excluding this user)
		// Count users who have admin role OR super_admins who still have admin role active in the same business
		const otherAdminsCount = await userRolesModel.countOtherUsersWithRoleInBusiness(
			ROLE_IDS.ADMIN, 
			userId, 
			user.business_id
		);

		if (otherAdminsCount === 0) {
			return Response.error(
				"Cannot remove admin role. You are the only admin in your business. Please assign admin role to another user in your business first.",
				400
			);
		}

		// Remove admin role and prevent reassignment
		await userRolesModel.removeUserRole(userId, ROLE_IDS.ADMIN, userId, true);

		logger.info("Super admin removed themselves from admin role", {
			userId,
			email: user.email,
			businessId: user.business_id,
			otherAdminsCount,
		});

		return Response.ok({
			message: "Admin role removed successfully. You can no longer act as admin and this cannot be undone.",
			remainingRoles: await userRolesModel.getUserRoleNames(userId),
		});
	} catch (error) {
		logger.error("Remove self from admin error", { error: error.message, stack: error.stack, userId });
		throw error;
	}
};

module.exports = {
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
};
