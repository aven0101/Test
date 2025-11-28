const service = require("../services/twoFactor");
const verificationService = require("../services/twoFactorVerification");
const { controller } = require("../utils/controller");
const { verifyAuthenticatorSchema, setupSecurityQuestionsSchema, verifySecurityQuestionsSchema, verify2FASchema } = require("../schemas/twoFactor");

// ============= 2FA Status =============

const get2FAStatus = controller({}, (data, user) => {
	return service.get2FAStatus(user.id);
});

// ============= Authenticator =============

const setupAuthenticator = controller({}, (data, user) => {
	return service.setupAuthenticator(user);
});

const verifyAndEnableAuthenticator = controller({ body: verifyAuthenticatorSchema }, ({ body }, user) => {
	return service.verifyAndEnableAuthenticator(user.id, body.token);
});

const disableAuthenticator = controller({}, (data, user) => {
	return service.disableAuthenticator(user.id);
});

// ============= One-Time Code =============

const enableOneTimeCode = controller({}, (data, user) => {
	return service.enableOneTimeCode(user.id);
});

const disableOneTimeCode = controller({}, (data, user) => {
	return service.disableOneTimeCode(user.id);
});

// ============= Security Questions =============

const setupSecurityQuestions = controller({ body: setupSecurityQuestionsSchema }, ({ body }, user) => {
	return service.setupSecurityQuestions(user.id, body.questions);
});

const disableSecurityQuestions = controller({}, (data, user) => {
	return service.disableSecurityQuestions(user.id);
});

const getSecurityQuestions = controller({}, (data, user) => {
	return service.getSecurityQuestionsForVerification(user.id);
});

// ============= Backup Codes =============

const regenerateBackupCodes = controller({}, (data, user) => {
	return service.regenerateBackupCodes(user.id);
});

module.exports = {
	// Status
	get2FAStatus,

	// Authenticator
	setupAuthenticator,
	verifyAndEnableAuthenticator,
	disableAuthenticator,

	// One-Time Code
	enableOneTimeCode,
	disableOneTimeCode,

	// Security Questions
	setupSecurityQuestions,
	disableSecurityQuestions,
	getSecurityQuestions,

	// Backup Codes
	regenerateBackupCodes,
};
