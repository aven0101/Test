const service = require("../services/auth"),
	{ controller } = require("../utils/controller"),
	{
		loginSchema,
		registerSchema,
		selectRoleSchema,
		forgotPasswordSchema,
		resetPasswordSchema,
		requestPasswordResetOTPSchema,
		resetPasswordWithOTPSchema,
		changeEmailSchema,
		updatePasswordSchema,
		verify2FALoginSchema,
		send2FACodeSchema,
	} = require("../schemas/auth");

const login = controller({ body: loginSchema }, ({ body }, user, req) => service.login({ ...body, req }));

const register = controller({ body: registerSchema }, ({ body }) => service.register(body));

const selectRole = controller({ body: selectRoleSchema }, ({ body }, user, req) => {
	// Extract tempToken from Authorization header
	const authHeader = req.headers.authorization;
	const tempToken = authHeader ? authHeader.replace("Bearer ", "") : null;

	return service.selectRole({
		selectedRole: body.selectedRole,
		tempToken,
		req,
	});
});

const forgotPassword = controller({ body: forgotPasswordSchema }, ({ body }) => service.forgotPassword(body));

const resetPassword = controller({ body: resetPasswordSchema }, ({ body }) => service.resetPassword(body));

// OTP-based password reset controllers
const requestPasswordResetOTP = controller({ body: requestPasswordResetOTPSchema }, ({ body }) => service.requestPasswordResetOTP(body));

const resetPasswordWithOTP = controller({ body: resetPasswordWithOTPSchema }, ({ body }) => service.resetPasswordWithOTP(body));

// Change email controller
const changeEmail = controller({ body: changeEmailSchema }, ({ body }, user) => {
	return service.changeEmail({
		userId: user.id,
		currentPassword: body.currentPassword,
		newEmail: body.newEmail,
	});
});

// 2FA verification controllers
const verify2FAAndLogin = controller({ body: verify2FALoginSchema }, ({ body }, user, req) => {
	return service.verify2FAAndLogin({
		tempToken: body.tempToken,
		method: body.method,
		code: body.code,
		answers: body.answers,
		req,
	});
});

const send2FACode = controller({ body: send2FACodeSchema }, ({ body }) => {
	return service.send2FACode({ tempToken: body.tempToken });
});

// Update password controller
const updatePassword = controller({ body: updatePasswordSchema }, ({ body }, user) => {
	return service.updatePassword({
		userId: user.id,
		currentPassword: body.currentPassword,
		newPassword: body.newPassword,
	});
});

// Remove self from admin role controller
const removeSelfFromAdmin = controller({}, ({ body }, user) => {
	return service.removeSelfFromAdmin({
		userId: user.id,
	});
});

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
