const addressModel = require("../models/address");
const userModel = require("../models/user");
const { controller } = require("../utils/controller");
const { addressSchema, updateAddressSchema } = require("../schemas/address");
const Response = require("../utils/controller").Response;

// Get user's address
const getAddress = controller({}, async ({}, user) => {
	try {
		const currentUser = await userModel.getById(user.id);

		if (!currentUser.address_id) {
			return Response.ok({
				address: null,
				message: "No address found",
			});
		}

		const address = await addressModel.getById(currentUser.address_id);

		return Response.ok({
			address: address
				? {
						id: address.id,
						line1: address.line1,
						line2: address.line2,
						city: address.city,
						state: address.state,
						zip: address.zip,
						country: address.country,
						created_at: address.created_at,
						updated_at: address.updated_at,
					}
				: null,
		});
	} catch (error) {
		throw error;
	}
});

// Add or update user's address
const addOrUpdateAddress = controller({ body: addressSchema }, async ({ body }, user) => {
	try {
		const currentUser = await userModel.getById(user.id);

		if (currentUser.address_id) {
			// Update existing address
			await addressModel.update(currentUser.address_id, body);
			const updatedAddress = await addressModel.getById(currentUser.address_id);

			return Response.ok({
				message: "Address updated successfully",
				address: {
					id: updatedAddress.id,
					line1: updatedAddress.line1,
					line2: updatedAddress.line2,
					city: updatedAddress.city,
					state: updatedAddress.state,
					zip: updatedAddress.zip,
					country: updatedAddress.country,
				},
			});
		} else {
			// Create new address
			const newAddress = await addressModel.create(body);

			// Link address to user
			await addressModel.linkToUser(user.id, newAddress.id);

			return Response.ok({
				message: "Address added successfully",
				address: {
					id: newAddress.id,
					line1: newAddress.line1,
					line2: newAddress.line2,
					city: newAddress.city,
					state: newAddress.state,
					zip: newAddress.zip,
					country: newAddress.country,
				},
			});
		}
	} catch (error) {
		throw error;
	}
});

// Update user's address (partial update)
const updateAddress = controller({ body: updateAddressSchema }, async ({ body }, user) => {
	try {
		const currentUser = await userModel.getById(user.id);

		if (!currentUser.address_id) {
			return Response.error("No address found. Please add an address first.", 404);
		}

		await addressModel.update(currentUser.address_id, body);
		const updatedAddress = await addressModel.getById(currentUser.address_id);

		return Response.ok({
			message: "Address updated successfully",
			address: {
				id: updatedAddress.id,
				line1: updatedAddress.line1,
				line2: updatedAddress.line2,
				city: updatedAddress.city,
				state: updatedAddress.state,
				zip: updatedAddress.zip,
				country: updatedAddress.country,
			},
		});
	} catch (error) {
		throw error;
	}
});

// Delete user's address
const deleteAddress = controller({}, async ({}, user) => {
	try {
		const currentUser = await userModel.getById(user.id);

		if (!currentUser.address_id) {
			return Response.error("No address found", 404);
		}

		const addressId = currentUser.address_id;

		// Unlink from user first
		await addressModel.linkToUser(user.id, null);

		// Delete address
		await addressModel.deleteAddress(addressId);

		return Response.okMessage("Address deleted successfully");
	} catch (error) {
		throw error;
	}
});

module.exports = {
	getAddress,
	addOrUpdateAddress,
	updateAddress,
	deleteAddress,
};
