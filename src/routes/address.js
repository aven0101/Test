const express = require("express");
const { getAddress, addOrUpdateAddress, updateAddress, deleteAddress } = require("../controllers/address");
const { authenticateBusinessAdmin } = require("../middleware/businessAuth");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Address
 *   description: User address management endpoints
 */

/**
 * @swagger
 * /address:
 *   get:
 *     summary: Get current user's address
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                         line1:
 *                           type: string
 *                         line2:
 *                           type: string
 *                           nullable: true
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                         zip:
 *                           type: string
 *                         country:
 *                           type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticateBusinessAdmin, getAddress);

/**
 * @swagger
 * /address:
 *   post:
 *     summary: Add or update user's address (complete replacement)
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - line1
 *               - city
 *               - state
 *               - zip
 *               - country
 *             properties:
 *               line1:
 *                 type: string
 *                 maxLength: 255
 *                 example: "123 Main Street"
 *               line2:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Apt 4B"
 *               city:
 *                 type: string
 *                 maxLength: 100
 *                 example: "New York"
 *               state:
 *                 type: string
 *                 maxLength: 100
 *                 example: "NY"
 *               zip:
 *                 type: string
 *                 maxLength: 20
 *                 example: "10001"
 *               country:
 *                 type: string
 *                 maxLength: 100
 *                 example: "USA"
 *     responses:
 *       200:
 *         description: Address added/updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", authenticateBusinessAdmin, addOrUpdateAddress);

/**
 * @swagger
 * /address:
 *   patch:
 *     summary: Update user's address (partial update)
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               line1:
 *                 type: string
 *                 maxLength: 255
 *               line2:
 *                 type: string
 *                 maxLength: 255
 *                 nullable: true
 *               city:
 *                 type: string
 *                 maxLength: 100
 *               state:
 *                 type: string
 *                 maxLength: 100
 *               zip:
 *                 type: string
 *                 maxLength: 20
 *               country:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       404:
 *         description: No address found
 *       401:
 *         description: Unauthorized
 */
router.patch("/", authenticateBusinessAdmin, updateAddress);

/**
 * @swagger
 * /address:
 *   delete:
 *     summary: Delete user's address
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       404:
 *         description: No address found
 *       401:
 *         description: Unauthorized
 */
router.delete("/", authenticateBusinessAdmin, deleteAddress);

module.exports = router;
