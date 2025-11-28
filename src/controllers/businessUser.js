const userModel = require("../models/user");
const userRolesModel = require("../models/userRoles");
const businessModel = require("../models/business");
const { controller, Response } = require("../utils/controller");
const bcrypt = require("bcryptjs");
const config = require("../config");
const { randomInt } = require("../utils/randomInt");
const authModel = require("../models/auth");
const { ROLES, ROLE_IDS, ROLE_NAME_TO_ID, BUSINESS_USER_ROLES, ADMIN_CAN_CREATE, MANAGER_CAN_CREATE } = require("../constants/roles");

const addBusinessUserSchema = {
	body: require("zod").object({
		name: require("zod").string().min(2, "Name must be at least 2 characters long").max(50, "Name cannot exceed 50 characters"),
		email: require("zod").string().email("Please provide a valid email address"),
		password: require("zod")
			.string()
			.min(8, "Password must be at least 8 characters long")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/,
				"Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
			),
		phone: require("zod")
			.string()
			.regex(/^[+]?[1-9][\d]{0,15}$/, "Please provide a valid phone number")
			.optional(),
		role: require("zod").enum(BUSINESS_USER_ROLES).default(ROLES.STANDARD_USER),
		assigned_to: require("zod").string().uuid("Invalid assigned_to user ID format").optional(),
	}),
};

const addBusinessUser = controller(addBusinessUserSchema, async ({ body }, user) => {
	try {
		// Convert role name to role_id
		const role_id = ROLE_NAME_TO_ID[body.role];
		if (!role_id) {
			return Response.error("Invalid role specified", 400);
		}

		// Permission validation based on logged-in role
		if (user.role === ROLES.SUPER_ADMIN) {
			// Super admin can ONLY create admin users
			if (body.role !== ROLES.ADMIN) {
				return Response.error("Super admin can only create admin users.", 403);
			}
		} else if (user.role === ROLES.ADMIN) {
			// Admin can create managers and standard_users - NOT admin
			if (!ADMIN_CAN_CREATE.includes(body.role)) {
				return Response.error("Admins can only create managers and standard users. Login as super_admin to create admins.", 403);
			}
		} else if (user.role === ROLES.MANAGER) {
			// Manager can ONLY create standard_users
			if (!MANAGER_CAN_CREATE.includes(body.role)) {
				return Response.error("Managers can only create standard users.", 403);
			}
		} else {
			// Other roles cannot create users
			return Response.error("You do not have permission to create users", 403);
		}

		// Check if user already exists
		const existingUser = await userModel.getByEmail(body.email);
		if (existingUser) {
			return Response.error("User with this email already exists", 409);
		}

		// Handle assignment logic
		let assigned_to = null;

		// If manager creates standard_user, auto-assign to themselves
		if (user.role === ROLES.MANAGER && body.role === ROLES.STANDARD_USER) {
			assigned_to = user.id;
		} else if (body.assigned_to) {
			// Manual assignment (from admin)
			// Only allow assignment for standard_user roles
			if (body.role !== ROLES.STANDARD_USER) {
				return Response.error("Only standard users can be assigned to managers", 400);
			}

			// Verify the assigned user exists and is a manager in the same business
			const assignedUser = await userModel.getById(body.assigned_to);
			if (!assignedUser) {
				return Response.error("Assigned user not found", 404);
			}

			if (assignedUser.business_id !== user.business_id) {
				return Response.error("Cannot assign user to manager from different business", 400);
			}

			if (assignedUser.role !== ROLES.MANAGER) {
				return Response.error("Can only assign standard users to manager role", 400);
			}

			assigned_to = body.assigned_to;
		}

		const hashedPassword = await bcrypt.hash(body.password, config.saltRounds);

		const { userId } = await userModel.create({
			name: body.name,
			email: body.email,
			password: hashedPassword,
			phone: body.phone,
			role_id: role_id,
			account_name: "business",
			business_id: user.business_id,
			assigned_to: assigned_to,
		});

		// Initialize user roles in user_roles table
		await userRolesModel.initializeUserRoles(userId, role_id);

		const newUser = await userModel.getById(userId);
		if (!newUser) {
			return Response.error("Failed to create user", 500);
		}

		// Generate OTP for email verification
		const otp = randomInt(100000, 999999);
		await authModel.insertOtp({ email: newUser.email, otp });

		return Response.okMessage("Business user added successfully");
	} catch (error) {
		if (error.code === "ER_DUP_ENTRY") {
			return Response.error("User with this email already exists", 409);
		}
		throw error;
	}
});

const getBusinessUsers = controller(
	{
		query: require("../schemas/businessUser").listBusinessUsersSchema,
	},
	async ({ query }, user) => {
		try {
			const result = await userModel.getBusinessUsers(user.business_id, query);

			// Format the response to include assignment information
			// Each user with multiple roles will appear as separate entries
			const formattedUsers = result.items.map((u) => ({
				id: u.id,
				user_role_id: `${u.id}-${u.role_id}`, // Unique identifier for this user-role combination
				email: u.email,
				first_name: u.first_name,
				last_name: u.last_name,
				phone: u.phone,
				role: u.role,
				role_id: u.role_id,
				is_active: u.is_active,
				created_at: u.created_at,
				updated_at: u.updated_at,
				assigned_to: u.assigned_to
					? {
							id: u.assigned_to,
							name: `${u.assigned_admin_first_name || ""} ${u.assigned_admin_last_name || ""}`.trim(),
							email: u.assigned_admin_email,
						}
					: null,
			}));

			return Response.ok({
				users: formattedUsers,
				pagination: {
					page: query.page,
					pageSize: query.pageSize,
					totalCount: result.count,
					totalPages: Math.ceil(result.count / query.pageSize),
				},
			});
		} catch (error) {
			console.error("Error fetching business users:", error);
			throw error;
		}
	},
);

const updateBusinessUserRole = controller(
	{
		params: require("zod").object({
			userId: require("zod").string().uuid("Invalid user ID"),
		}),
		body: require("zod").object({
			role: require("zod").enum(BUSINESS_USER_ROLES),
		}),
	},
	async ({ params, body }, user) => {
		try {
			// Convert role name to role_id
			const new_role_id = ROLE_NAME_TO_ID[body.role];
			if (!new_role_id) {
				return Response.error("Invalid role specified", 400);
			}

			// Check if the user exists and belongs to the same business
			const targetUser = await userModel.getById(params.userId);
			if (!targetUser) {
				return Response.error("User not found", 404);
			}

			if (targetUser.business_id !== user.business_id) {
				return Response.error("User does not belong to your business", 403);
			}

			// Prevent changing owner's role
			const business = await businessModel.getById(user.business_id);
			if (business.owner_id === params.userId) {
				return Response.error("Cannot change owner's role", 403);
			}

			// Permission validation based on logged-in role
			if (user.role === ROLES.SUPER_ADMIN) {
				// Super admin can only manage admin roles
				if (targetUser.role !== ROLES.ADMIN && body.role !== ROLES.ADMIN) {
					return Response.error("Super admin can only manage admin users. Login as admin to manage members.", 403);
				}
			} else if (user.role === ROLES.ADMIN) {
				// Admin can only manage member roles (not admin)
				if (targetUser.role === ROLES.ADMIN || body.role === ROLES.ADMIN) {
					return Response.error("Admins cannot modify admin users. Login as super_admin to manage admins.", 403);
				}
			} else {
				return Response.error("You do not have permission to update user roles", 403);
			}

			// Update user role
			await userModel.updateRole(params.userId, new_role_id);

			return Response.okMessage("User role updated successfully");
		} catch (error) {
			throw error;
		}
	},
);

const removeBusinessUser = controller(
	{
		params: require("zod").object({
			userId: require("zod").string().uuid("Invalid user ID"),
		}),
	},
	async ({ params }, user) => {
		try {
			// Check if the user exists and belongs to the same business
			const targetUser = await userModel.getById(params.userId);
			if (!targetUser) {
				return Response.error("User not found", 404);
			}

			if (targetUser.business_id !== user.business_id) {
				return Response.error("User does not belong to your business", 403);
			}

			// Prevent removing owner
			const business = await businessModel.getById(user.business_id);
			if (business.owner_id === params.userId) {
				return Response.error("Cannot remove business owner", 403);
			}

			// Permission validation based on logged-in role
			if (user.role === ROLES.SUPER_ADMIN) {
				// Super admin can only remove admin users
				if (targetUser.role !== ROLES.ADMIN) {
					return Response.error("Super admin can only remove admin users. Login as admin to manage members.", 403);
				}
			} else if (user.role === ROLES.ADMIN) {
				// Admin can only remove member users (not admin)
				if (targetUser.role === ROLES.ADMIN) {
					return Response.error("Admins cannot remove admin users. Login as super_admin to manage admins.", 403);
				}
			} else {
				return Response.error("You do not have permission to remove users", 403);
			}

			// Soft delete user
			await userModel.deleteUser(params.userId);

			return Response.okMessage("User removed successfully");
		} catch (error) {
			throw error;
		}
	},
);

// Get managers for assignment dropdown
const getManagersForAssignment = controller({}, async ({}, user) => {
	try {
		const managers = await userModel.getManagersForAssignment(user.business_id);

		return Response.ok({
			managers: managers.map((manager) => ({
				id: manager.id,
				name: `${manager.first_name} ${manager.last_name}`.trim(),
				email: manager.email,
				role: manager.role,
			})),
		});
	} catch (error) {
		console.error("Error fetching managers for assignment:", error);
		return Response.error("Failed to fetch managers", 500);
	}
});

// Activate user (super_admin only)
const activateBusinessUser = controller(
	{
		params: require("zod").object({
			userId: require("zod").string().uuid("Invalid user ID"),
		}),
	},
	async ({ params }, user) => {
		try {
			// Only super_admin can activate users
			if (user.role !== ROLES.SUPER_ADMIN) {
				return Response.error("Only super admin can activate users", 403);
			}

			// Check if the user exists and belongs to the same business
			const targetUser = await userModel.getById(params.userId);
			if (!targetUser) {
				return Response.error("User not found", 404);
			}

			// Check if both users have business_id and they match
			if (user.business_id && targetUser.business_id && targetUser.business_id !== user.business_id) {
				return Response.error("User does not belong to your business", 403);
			}

			// Check if already active
			if (targetUser.is_active) {
				return Response.error("User is already active", 400);
			}

			// Activate user
			await userModel.updateUserStatus(params.userId, true);

			return Response.okMessage("User activated successfully");
		} catch (error) {
			throw error;
		}
	},
);

// Suspend user (super_admin only)
const suspendBusinessUser = controller(
	{
		params: require("zod").object({
			userId: require("zod").string().uuid("Invalid user ID"),
		}),
	},
	async ({ params }, user) => {
		try {
			// Only super_admin can suspend users
			if (user.role !== ROLES.SUPER_ADMIN) {
				return Response.error("Only super admin can suspend users", 403);
			}

			// Check if the user exists and belongs to the same business
			const targetUser = await userModel.getById(params.userId);
			if (!targetUser) {
				return Response.error("User not found", 404);
			}

			// Check if both users have business_id and they match
			if (user.business_id && targetUser.business_id && targetUser.business_id !== user.business_id) {
				return Response.error("User does not belong to your business", 403);
			}

			// Prevent suspending owner
			if (user.business_id) {
				const business = await businessModel.getById(user.business_id);
				if (business && business.owner_id === params.userId) {
					return Response.error("Cannot suspend business owner", 403);
				}
			}

			// Prevent suspending self
			if (params.userId === user.id) {
				return Response.error("Cannot suspend yourself", 403);
			}

			// Check if already suspended
			if (!targetUser.is_active) {
				return Response.error("User is already suspended", 400);
			}

			// Suspend user
			await userModel.updateUserStatus(params.userId, false);

			return Response.okMessage("User suspended successfully");
		} catch (error) {
			throw error;
		}
	},
);

// Update business user (super_admin can update admins, admin can update managers/standard_users)
const updateBusinessUser = controller(
	{
		params: require("zod").object({
			userId: require("zod").string().uuid("Invalid user ID"),
		}),
		body: require("../schemas/businessUser").updateBusinessUserSchema,
	},
	async ({ params, body }, user) => {
		try {
			// Check if the user exists and belongs to the same business
			const targetUser = await userModel.getById(params.userId);
			if (!targetUser) {
				return Response.error("User not found", 404);
			}

			if (targetUser.business_id !== user.business_id) {
				return Response.error("User does not belong to your business", 403);
			}

			// Prevent updating owner
			const business = await businessModel.getById(user.business_id);
			if (business.owner_id === params.userId) {
				return Response.error("Cannot update business owner profile. Use profile endpoint instead.", 403);
			}

			// Permission validation based on logged-in role
			if (user.role === ROLES.SUPER_ADMIN) {
				// Super admin can only update admin users
				if (targetUser.role !== ROLES.ADMIN) {
					return Response.error("Super admin can only update admin users. Login as admin to update other users.", 403);
				}
			} else if (user.role === ROLES.ADMIN) {
				// Admin cannot update admin users
				if (targetUser.role === ROLES.ADMIN) {
					return Response.error("Admins cannot update admin users. Login as super_admin to update admins.", 403);
				}
			} else {
				return Response.error("You do not have permission to update users", 403);
			}

			// Check if email is being updated and already exists
			if (body.email && body.email !== targetUser.email) {
				const existingUser = await userModel.getByEmail(body.email);
				if (existingUser && existingUser.id !== params.userId) {
					return Response.error("Email is already in use", 409);
				}
			}

			// Update user profile
			await userModel.updateProfile(params.userId, body);

			// Get updated user
			const updatedUser = await userModel.getById(params.userId);
			delete updatedUser.password;

			return Response.ok({
				message: "User updated successfully",
				user: {
					id: updatedUser.id,
					email: updatedUser.email,
					first_name: updatedUser.first_name,
					last_name: updatedUser.last_name,
					phone: updatedUser.phone,
					role: updatedUser.role,
				},
			});
		} catch (error) {
			if (error.code === "ER_DUP_ENTRY") {
				return Response.error("Email is already in use", 409);
			}
			throw error;
		}
	},
);

module.exports = {
	addBusinessUser,
	getBusinessUsers,
	updateBusinessUserRole,
	updateBusinessUser,
	removeBusinessUser,
	getManagersForAssignment,
	activateBusinessUser,
	suspendBusinessUser,
};
