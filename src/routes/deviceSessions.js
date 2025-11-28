const express = require("express");
const { getMySessions, blockDevice, unblockDevice, revokeDevice, revokeAllOtherDevices } = require("../controllers/deviceSession");
const { authenticateBusinessAdmin } = require("../middleware/businessAuth");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Device Sessions
 *   description: Manage logged-in devices and sessions
 */

/**
 * @swagger
 * /device-sessions:
 *   get:
 *     summary: Get all logged-in devices
 *     tags: [Device Sessions]
 *     description: View all devices/sessions where you are currently logged in, including device type, browser, location, and activity status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active device sessions
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
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           deviceName:
 *                             type: string
 *                           deviceType:
 *                             type: string
 *                           browser:
 *                             type: string
 *                           browserVersion:
 *                             type: string
 *                           os:
 *                             type: string
 *                           osVersion:
 *                             type: string
 *                           location:
 *                             type: object
 *                             properties:
 *                               country:
 *                                 type: string
 *                               city:
 *                                 type: string
 *                               latitude:
 *                                 type: number
 *                               longitude:
 *                                 type: number
 *                           ipAddress:
 *                             type: string
 *                           isBlocked:
 *                             type: boolean
 *                           isCurrent:
 *                             type: boolean
 *                           description:
 *                             type: string
 *                           lastActive:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     totalCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only super_admin can access
 */
router.get("/", authenticateBusinessAdmin, getMySessions);

/**
 * @swagger
 * /device-sessions/{sessionId}/block:
 *   put:
 *     summary: Block a device
 *     tags: [Device Sessions]
 *     description: Block a specific device from accessing your account. The device will be logged out and cannot log in again until unblocked.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device session ID
 *     responses:
 *       200:
 *         description: Device blocked successfully
 *       400:
 *         description: Cannot block current device
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
router.put("/:sessionId/block", authenticateBusinessAdmin, blockDevice);

/**
 * @swagger
 * /device-sessions/{sessionId}/unblock:
 *   put:
 *     summary: Unblock a device
 *     tags: [Device Sessions]
 *     description: Unblock a previously blocked device, allowing it to access your account again
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device session ID
 *     responses:
 *       200:
 *         description: Device unblocked successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
router.put("/:sessionId/unblock", authenticateBusinessAdmin, unblockDevice);

/**
 * @swagger
 * /device-sessions/{sessionId}:
 *   delete:
 *     summary: Revoke/logout a device session
 *     tags: [Device Sessions]
 *     description: Logout and remove a specific device session. The device will need to log in again.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device session ID
 *     responses:
 *       200:
 *         description: Device session revoked successfully
 *       400:
 *         description: Cannot revoke current device
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
router.delete("/:sessionId", authenticateBusinessAdmin, revokeDevice);

/**
 * @swagger
 * /device-sessions/revoke-all:
 *   post:
 *     summary: Logout all other devices
 *     tags: [Device Sessions]
 *     description: Logout from all devices except the current one. Useful for security if you suspect unauthorized access.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All other devices logged out successfully
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
 *                     revokedCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.post("/revoke-all", authenticateBusinessAdmin, revokeAllOtherDevices);

module.exports = router;
