const { controller, Response } = require("../utils/controller");
const { registerSchema, loginSchema, updateUserSchema, changePasswordSchema, userIdSchema, listUsersSchema } = require("../schemas/user");

// Mock user data for demonstration
let users = [
	{
		id: "507f1f77bcf86cd799439011",
		name: "John Doe",
		email: "john@example.com",
		role: "member",
		phone: "+1234567890",
		bio: "Software developer",
		avatar: "https://example.com/avatar1.jpg",
		createdAt: new Date("2024-01-15"),
		active: true,
	},
	{
		id: "507f1f77bcf86cd799439012",
		name: "Jane Smith",
		email: "jane@example.com",
		role: "admin",
		phone: "+1234567891",
		bio: "System administrator",
		avatar: "https://example.com/avatar2.jpg",
		createdAt: new Date("2024-01-10"),
		active: true,
	},
];

// Register a new user
const register = controller({ body: registerSchema }, async ({ body }) => {
	// Check if user already exists
	const existingUser = users.find((user) => user.email === body.email);
	if (existingUser) {
		return Response.error("User with this email already exists", 409);
	}

	// Create new user (in real app, hash password and save to DB)
	const newUser = {
		id: "507f1f77bcf86cd7994390" + Math.floor(Math.random() * 100),
		name: body.name,
		email: body.email,
		role: body.role,
		phone: body.phone || null,
		bio: "",
		avatar: null,
		createdAt: new Date(),
		active: true,
	};

	users.push(newUser);

	return Response.ok({
		message: "User registered successfully",
		user: {
			id: newUser.id,
			name: newUser.name,
			email: newUser.email,
			role: newUser.role,
			phone: newUser.phone,
			createdAt: newUser.createdAt,
		},
	});
});

// Login user
const login = controller({ body: loginSchema }, async ({ body }) => {
	// Find user by email
	const user = users.find((u) => u.email === body.email && u.active);
	if (!user) {
		return Response.error("Invalid email or password", 401);
	}

	// In real app, verify password hash
	// For demo, accept any password
	if (!body.password) {
		return Response.error("Invalid email or password", 401);
	}

	return Response.ok({
		message: "Login successful",
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			phone: user.phone,
			avatar: user.avatar,
			createdAt: user.createdAt,
		},
		token: "mock-jwt-token-" + user.id,
	});
});

// Get all users (with pagination and filtering)
const getUsers = controller({ query: listUsersSchema }, async ({ query }) => {
	let filteredUsers = [...users];

	// Apply search filter
	if (query.search) {
		const searchTerm = query.search.toLowerCase();
		filteredUsers = filteredUsers.filter((user) => user.name.toLowerCase().includes(searchTerm) || user.email.toLowerCase().includes(searchTerm));
	}

	// Apply role filter
	if (query.role) {
		filteredUsers = filteredUsers.filter((user) => user.role === query.role);
	}

	// Apply sorting
	const sortField = query.sort.startsWith("-") ? query.sort.slice(1) : query.sort;
	const sortOrder = query.sort.startsWith("-") ? -1 : 1;

	filteredUsers.sort((a, b) => {
		if (sortField === "createdAt") {
			return (new Date(a.createdAt) - new Date(b.createdAt)) * sortOrder;
		}
		return a[sortField].localeCompare(b[sortField]) * sortOrder;
	});

	// Apply pagination
	const total = filteredUsers.length;
	const startIndex = (query.page - 1) * query.limit;
	const endIndex = startIndex + query.limit;
	const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

	return Response.ok({
		users: paginatedUsers.map((user) => ({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			phone: user.phone,
			avatar: user.avatar,
			createdAt: user.createdAt,
		})),
		pagination: {
			currentPage: query.page,
			totalPages: Math.ceil(total / query.limit),
			totalUsers: total,
			limit: query.limit,
		},
	});
});

// Get user by ID
const getUserById = controller({ params: userIdSchema }, async ({ params }) => {
	const user = users.find((u) => u.id === params.id && u.active);
	if (!user) {
		return Response.notFound();
	}

	return Response.ok({
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			phone: user.phone,
			bio: user.bio,
			avatar: user.avatar,
			createdAt: user.createdAt,
		},
	});
});

// Update user
const updateUser = controller({ params: userIdSchema, body: updateUserSchema }, async ({ params, body }) => {
	const userIndex = users.findIndex((u) => u.id === params.id && u.active);
	if (userIndex === -1) {
		return Response.notFound();
	}

	// Check if email is already taken by another user
	if (body.email) {
		const emailExists = users.find((u) => u.email === body.email && u.id !== params.id);
		if (emailExists) {
			return Response.error("Email is already taken by another user", 409);
		}
	}

	// Update user
	users[userIndex] = {
		...users[userIndex],
		...body,
		id: params.id, // Ensure ID doesn't change
	};

	return Response.ok({
		message: "User updated successfully",
		user: {
			id: users[userIndex].id,
			name: users[userIndex].name,
			email: users[userIndex].email,
			role: users[userIndex].role,
			phone: users[userIndex].phone,
			bio: users[userIndex].bio,
			avatar: users[userIndex].avatar,
			createdAt: users[userIndex].createdAt,
		},
	});
});

// Change password
const changePassword = controller({ body: changePasswordSchema }, async ({ body }) => {
	// In real app, verify current password and update in database
	// For demo, just return success
	return Response.ok({
		message: "Password changed successfully",
	});
});

// Delete user
const deleteUser = controller({ params: userIdSchema }, async ({ params }) => {
	const userIndex = users.findIndex((u) => u.id === params.id);
	if (userIndex === -1) {
		return Response.notFound();
	}

	// Soft delete (set active to false)
	users[userIndex].active = false;

	return Response.ok({
		message: "User deleted successfully",
	});
});

module.exports = {
	register,
	login,
	getUsers,
	getUserById,
	updateUser,
	changePassword,
	deleteUser,
};
