const { z } = require("zod");

const updateProfileSchema = z.object({
	// User fields
	first_name: z.string().min(2, "First name must be at least 2 characters").max(50, "First name must not exceed 50 characters").optional(),
	last_name: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name must not exceed 50 characters").optional(),
	email: z.string().email("Invalid email format").optional(),
	phone: z
		.string()
		.regex(/^[+]?[1-9][\d]{0,15}$/, "Invalid phone number format")
		.optional(),

	// Business fields
	business_name: z.string().min(2, "Business name must be at least 2 characters").max(100, "Business name must not exceed 100 characters").optional(),
	business_description: z.string().max(500, "Business description must not exceed 500 characters").optional(),

	// Address fields
	address_line1: z.string().min(1, "Address line 1 is required").max(255, "Address line 1 must not exceed 255 characters").optional(),
	address_line2: z.string().max(255, "Address line 2 must not exceed 255 characters").optional().nullable(),
	address_city: z.string().min(1, "City is required").max(100, "City must not exceed 100 characters").optional(),
	address_state: z.string().min(1, "State/Region is required").max(100, "State must not exceed 100 characters").optional(),
	address_zip: z.string().min(1, "ZIP/Postal code is required").max(20, "ZIP code must not exceed 20 characters").optional(),
	address_country: z.string().min(1, "Country is required").max(100, "Country must not exceed 100 characters").optional(),
});

module.exports = {
	updateProfileSchema,
};
