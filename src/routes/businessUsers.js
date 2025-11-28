const express = require("express");
const {
	addBusinessUser,
	getBusinessUsers,
	updateBusinessUserRole,
	updateBusinessUser,
	removeBusinessUser,
	getManagersForAssignment,
	activateBusinessUser,
	suspendBusinessUser,
} = require("../controllers/businessUser");
const { authenticateBusinessAdmin } = require("../middleware/businessAuth");
const { authenticateSuperAdmin } = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Business Users
 *   description: Business user management endpoints
 */

/**
 * @swagger
 * /business/users:
 *   get:
 *     summary: Get all users in the business (with pagination, filters, and sorting)
 *     tags: [Business Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [super_admin, admin, manager, standard_user]
 *         description: Filter by role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *           default: active
 *         description: Filter by user status
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [first_name, last_name, email, created_at, role]
 *           default: created_at
 *         description: Sort by field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of business users with pagination
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           first_name:
 *                             type: string
 *                           last_name:
 *                             type: string
 *                           role:
 *                             type: string
 *                           is_active:
 *                             type: boolean
 *                           assigned_to:
 *                             type: object
 *                             nullable: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         pageSize:
 *                           type: integer
 *                         totalCount:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", authenticateBusinessAdmin, getBusinessUsers);

/**
 * @swagger
 * /business/users:
 *   post:
 *     summary: Add a new user to the business
 *     tags: [Business Users]
 *     description: |
 *       Add a new user to the business with role-based permissions:
 *       - **Super_admin**: Can ONLY create 'admin' users
 *       - **Admin**: Can create 'manager' and 'standard_user' users
 *       - **Manager**: Can create 'standard_user' users (auto-assigned to manager)
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@business.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"
 *                 example: "Password123!"
 *               phone:
 *                 type: string
 *                 pattern: "^[+]?[1-9][\\d]{0,15}$"
 *                 example: "+1234567890"
 *               role:
 *                 type: string
 *                 enum: [standard_user, admin, manager]
 *                 default: standard_user
 *                 description: |
 *                   - super_admin can only create 'admin'
 *                   - admin can create 'manager' or 'standard_user'
 *                   - manager can only create 'standard_user'
 *               assigned_to:
 *                 type: string
 *                 format: uuid
 *                 description: |
 *                   ID of manager to assign standard_user to (optional for admin, auto-assigned for manager)
 *                   - When admin creates standard_user, can optionally assign to a manager
 *                   - When manager creates standard_user, auto-assigned to that manager
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: User added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Role mismatch (super_admin creating members or admin creating admins)
 *       409:
 *         description: User already exists
 */
router.post("/", authenticateBusinessAdmin, addBusinessUser);

/**
 * @swagger
 * /business/users/{userId}:
 *   put:
 *     summary: Update business user details
 *     tags: [Business Users]
 *     description: |
 *       Update business user information with role-based permissions:
 *       - **Super_admin**: Can ONLY update 'admin' users
 *       - **Admin**: Can update 'manager' and 'standard_user' users (NOT admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
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
 *                 example: "john.updated@business.com"
 *               phone:
 *                 type: string
 *                 pattern: "^[+]?[1-9][\\d]{0,15}$"
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                       example: "User updated successfully"
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         first_name:
 *                           type: string
 *                         last_name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         role:
 *                           type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - super_admin can only update admins, admin cannot update admins
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 */
router.put("/:userId", authenticateBusinessAdmin, updateBusinessUser);

/**
 * @swagger
 * /business/users/{userId}/role:
 *   put:
 *     summary: Update user role
 *     tags: [Business Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [member, admin, moderator]
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put("/:userId/role", authenticateBusinessAdmin, updateBusinessUserRole);

/**
 * @swagger
 * /business/users/{userId}:
 *   delete:
 *     summary: Remove user from business
 *     tags: [Business Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete("/:userId", authenticateBusinessAdmin, removeBusinessUser);

/**
 * @swagger
 * /business/users/managers:
 *   get:
 *     summary: Get managers for assignment dropdown
 *     tags: [Business Users]
 *     security:
 *       - bearerAuth: []
 *     description: Get list of manager users for assignment dropdown when creating standard users
 *     responses:
 *       200:
 *         description: List of managers for assignment
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
 *                     managers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "123e4567-e89b-12d3-a456-426614174000"
 *                           name:
 *                             type: string
 *                             example: "John Manager"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           role:
 *                             type: string
 *                             example: "manager"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/managers", authenticateBusinessAdmin, getManagersForAssignment);

/**
 * @swagger
 * /business/users/{userId}/activate:
 *   put:
 *     summary: Activate a suspended user (super_admin only)
 *     tags: [Business Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User activated successfully
 *       400:
 *         description: User is already active
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only super_admin can activate users
 *       404:
 *         description: User not found
 */
router.put("/:userId/activate", authenticateSuperAdmin, activateBusinessUser);

/**
 * @swagger
 * /business/users/{userId}/suspend:
 *   put:
 *     summary: Suspend a user (super_admin only)
 *     tags: [Business Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User suspended successfully
 *       400:
 *         description: User is already suspended or cannot suspend yourself
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only super_admin can suspend users or cannot suspend business owner
 *       404:
 *         description: User not found
 */
router.put("/:userId/suspend", authenticateSuperAdmin, suspendBusinessUser);

module.exports = router;
