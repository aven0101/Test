const express = require("express");
const { updateProfile, getProfile } = require("../controllers/profile");
const { authenticateSuperAdmin } = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Profile management endpoints (super_admin only)
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get current profile (super_admin only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *                     is_active:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                 business:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     owner_id:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                 address:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     line1:
 *                       type: string
 *                     line2:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     zip:
 *                       type: string
 *                     country:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only super_admin can view profile
 */
router.get("/", authenticateSuperAdmin, getProfile);

/**
 * @swagger
 * /profile:
 *   put:
 *     summary: Update profile (super_admin only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "John"
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phone:
 *                 type: string
 *                 pattern: "^[+]?[1-9][\\d]{0,15}$"
 *                 example: "+1234567890"
 *               business_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Acme Corporation"
 *               business_description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "A leading technology company"
 *               address_line1:
 *                 type: string
 *                 maxLength: 255
 *                 example: "123 Main Street"
 *               address_line2:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Apt 4B"
 *               address_city:
 *                 type: string
 *                 maxLength: 100
 *                 example: "New York"
 *               address_state:
 *                 type: string
 *                 maxLength: 100
 *                 example: "NY"
 *               address_zip:
 *                 type: string
 *                 maxLength: 20
 *                 example: "10001"
 *               address_country:
 *                 type: string
 *                 maxLength: 100
 *                 example: "USA"
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: "Profile updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *                     is_active:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                 business:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     owner_id:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                 address:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     line1:
 *                       type: string
 *                     line2:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     zip:
 *                       type: string
 *                     country:
 *                       type: string
 *       400:
 *         description: Validation error or invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only super_admin can update profile
 *       409:
 *         description: Email already in use
 */
router.put("/", authenticateSuperAdmin, updateProfile);

module.exports = router;
