const userModel = require("../models/user");
const businessModel = require("../models/business");
const addressModel = require("../models/address");
const { controller } = require("../utils/controller");
const { updateProfileSchema } = require("../schemas/profile");
const { AppError } = require("../middleware/errorHandler");
const Response = require("../utils/controller").Response;

// Update profile (super_admin only)
const updateProfile = controller({ body: updateProfileSchema }, async ({ body }, user) => {
	try {
		// Verify user is super_admin
		if (user.role !== "super_admin") {
			throw new AppError("Only super admin can update profile", 403);
		}

		// Check if email is being changed and if it's already in use
		if (body.email && body.email !== user.email) {
			const existingUser = await userModel.getByEmail(body.email);
			if (existingUser && existingUser.id !== user.id) {
				throw new AppError("Email is already in use", 409);
			}
		}

	// Prepare user data
	const userData = {};
	if (body.first_name !== undefined) userData.first_name = body.first_name;
	if (body.last_name !== undefined) userData.last_name = body.last_name;
	if (body.email !== undefined) userData.email = body.email;
	if (body.phone !== undefined) userData.phone = body.phone;

	// Prepare business data
	const businessData = {};
	if (body.business_name !== undefined) businessData.name = body.business_name;
	if (body.business_description !== undefined) businessData.description = body.business_description;

	// Prepare address data
	const addressData = {};
	if (body.address_line1 !== undefined) addressData.line1 = body.address_line1;
	if (body.address_line2 !== undefined) addressData.line2 = body.address_line2;
	if (body.address_city !== undefined) addressData.city = body.address_city;
	if (body.address_state !== undefined) addressData.state = body.address_state;
	if (body.address_zip !== undefined) addressData.zip = body.address_zip;
	if (body.address_country !== undefined) addressData.country = body.address_country;

	// Update user profile if there are user fields
	if (Object.keys(userData).length > 0) {
		await userModel.updateProfile(user.id, userData);
	}

	// Get current user to check business_id
	const currentUserForUpdate = await userModel.getById(user.id);
	
	// Update business profile if there are business fields and user has a business
	if (Object.keys(businessData).length > 0 && currentUserForUpdate.business_id) {
		await businessModel.updateProfile(currentUserForUpdate.business_id, businessData);
	}

	// Handle address update/create
	if (Object.keys(addressData).length > 0) {
		if (currentUserForUpdate.address_id) {
			// Update existing address
			await addressModel.update(currentUserForUpdate.address_id, addressData);
		} else {
			// Create new address only if we have all required fields
			const hasAllRequiredFields = 
				addressData.line1 && 
				addressData.city && 
				addressData.state && 
				addressData.zip && 
				addressData.country;
			
			if (hasAllRequiredFields) {
				const newAddress = await addressModel.create(addressData);
				await addressModel.linkToUser(user.id, newAddress.id);
			} else {
				throw new AppError("To create a new address, all required fields must be provided: line1, city, state, zip, country", 400);
			}
		}
	}

	// Fetch updated user, business, and address data
	const updatedUser = await userModel.getById(user.id);
	const updatedBusiness = updatedUser.business_id ? await businessModel.getById(updatedUser.business_id) : null;
	const updatedAddress = updatedUser.address_id ? await addressModel.getById(updatedUser.address_id) : null;

	return Response.ok({
		message: "Profile updated successfully",
		user: {
			id: updatedUser.id,
			email: updatedUser.email,
			first_name: updatedUser.first_name,
			last_name: updatedUser.last_name,
			phone: updatedUser.phone,
			role: updatedUser.role,
			is_active: updatedUser.is_active,
			created_at: updatedUser.created_at,
			updated_at: updatedUser.updated_at,
		},
		business: updatedBusiness
			? {
					id: updatedBusiness.id,
					name: updatedBusiness.name,
					description: updatedBusiness.description,
					owner_id: updatedBusiness.owner_id,
					created_at: updatedBusiness.created_at,
					updated_at: updatedBusiness.updated_at,
				}
			: null,
		address: updatedAddress
			? {
					id: updatedAddress.id,
					line1: updatedAddress.line1,
					line2: updatedAddress.line2,
					city: updatedAddress.city,
					state: updatedAddress.state,
					zip: updatedAddress.zip,
					country: updatedAddress.country,
				}
			: null,
	});
	} catch (error) {
		throw error;
	}
});

// Get current profile (super_admin only)
const getProfile = controller({}, async ({}, user) => {
	try {
		// Verify user is super_admin
		if (user.role !== "super_admin") {
			throw new AppError("Only super admin can view profile", 403);
		}

	const currentUser = await userModel.getById(user.id);
	const business = currentUser.business_id ? await businessModel.getById(currentUser.business_id) : null;

	// Get address if exists
	let address = null;
	if (currentUser.address_id) {
		const addressData = await addressModel.getById(currentUser.address_id);
		if (addressData) {
			address = {
				id: addressData.id,
				line1: addressData.line1,
				line2: addressData.line2,
				city: addressData.city,
				state: addressData.state,
				zip: addressData.zip,
				country: addressData.country,
			};
		}
	}

		return Response.ok({
			user: {
				id: currentUser.id,
				email: currentUser.email,
				first_name: currentUser.first_name,
				last_name: currentUser.last_name,
				phone: currentUser.phone,
				role: currentUser.role,
				is_active: currentUser.is_active,
				created_at: currentUser.created_at,
				updated_at: currentUser.updated_at,
			},
			business: business
				? {
						id: business.id,
						name: business.name,
						description: business.description,
						owner_id: business.owner_id,
						created_at: business.created_at,
						updated_at: business.updated_at,
					}
				: null,
			address: address,
		});
	} catch (error) {
		throw error;
	}
});

module.exports = {
	updateProfile,
	getProfile,
};
