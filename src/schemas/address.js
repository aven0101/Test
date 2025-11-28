const { z } = require("zod");

const addressSchema = z.object({
	line1: z.string().min(1, "Address line 1 is required").max(255, "Address line 1 must not exceed 255 characters"),
	line2: z.string().max(255, "Address line 2 must not exceed 255 characters").optional(),
	city: z.string().min(1, "City is required").max(100, "City must not exceed 100 characters"),
	state: z.string().min(1, "State/Region is required").max(100, "State must not exceed 100 characters"),
	zip: z.string().min(1, "ZIP/Postal code is required").max(20, "ZIP code must not exceed 20 characters"),
	country: z.string().min(1, "Country is required").max(100, "Country must not exceed 100 characters"),
});

const updateAddressSchema = z.object({
	line1: z.string().min(1).max(255).optional(),
	line2: z.string().max(255).optional().nullable(),
	city: z.string().min(1).max(100).optional(),
	state: z.string().min(1).max(100).optional(),
	zip: z.string().min(1).max(20).optional(),
	country: z.string().min(1).max(100).optional(),
});

module.exports = {
	addressSchema,
	updateAddressSchema,
};
