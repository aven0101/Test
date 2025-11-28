const service = require("../services/deviceSession");
const { controller } = require("../utils/controller");

/**
 * Get all device sessions for authenticated user
 */
const getMySessions = controller({}, (data, user, req) => {
	return service.getMySessions(user.id, req);
});

/**
 * Block a device session
 */
const blockDevice = controller({}, ({ params }, user, req) => {
	return service.blockDevice(user.id, params.sessionId, req);
});

/**
 * Unblock a device session
 */
const unblockDevice = controller({}, ({ params }, user) => {
	return service.unblockDevice(user.id, params.sessionId);
});

/**
 * Revoke/delete a device session
 */
const revokeDevice = controller({}, ({ params }, user, req) => {
	return service.revokeDevice(user.id, params.sessionId, req);
});

/**
 * Revoke all other device sessions
 */
const revokeAllOtherDevices = controller({}, (data, user, req) => {
	return service.revokeAllOtherDevices(user.id, req);
});

module.exports = {
	getMySessions,
	blockDevice,
	unblockDevice,
	revokeDevice,
	revokeAllOtherDevices,
};

