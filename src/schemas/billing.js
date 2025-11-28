const { z } = require("zod");

const addPaymentMethodSchema = z.object({
	cardHolderName: z.string().min(2, "Card holder name must be at least 2 characters").max(255),
	cardLastFour: z
		.string()
		.length(4, "Card last four must be exactly 4 digits")
		.regex(/^\d{4}$/, "Must be 4 digits"),
	cardBrand: z.enum(["visa", "mastercard", "amex", "discover", "diners", "jcb", "unionpay", "other"]),
	cardExpMonth: z
		.string()
		.length(2, "Expiration month must be 2 digits")
		.regex(/^(0[1-9]|1[0-2])$/, "Invalid month format"),
	cardExpYear: z
		.string()
		.length(4, "Expiration year must be 4 digits")
		.regex(/^\d{4}$/, "Invalid year format")
		.refine((year) => parseInt(year) >= new Date().getFullYear(), {
			message: "Card has expired",
		}),
	isDefault: z.boolean().optional(),
	billingAddress: z
		.object({
			street: z.string().optional(),
			city: z.string().optional(),
			state: z.string().optional(),
			zipCode: z.string().optional(),
			country: z.string().optional(),
		})
		.optional(),
	stripePaymentMethodId: z.string().optional(),
});

const paymentMethodIdSchema = z.object({
	paymentMethodId: z.string().uuid("Invalid payment method ID"),
});

const updatePaymentMethodSchema = z.object({
	cardHolderName: z.string().min(2, "Card holder name must be at least 2 characters").max(255).optional(),
	cardLastFour: z
		.string()
		.length(4, "Card last four must be exactly 4 digits")
		.regex(/^\d{4}$/, "Must be 4 digits")
		.optional(),
	cardBrand: z.enum(["visa", "mastercard", "amex", "discover", "diners", "jcb", "unionpay", "other"]).optional(),
	cardExpMonth: z
		.string()
		.length(2, "Expiration month must be 2 digits")
		.regex(/^(0[1-9]|1[0-2])$/, "Invalid month format")
		.optional(),
	cardExpYear: z
		.string()
		.length(4, "Expiration year must be 4 digits")
		.regex(/^\d{4}$/, "Invalid year format")
		.refine((year) => parseInt(year) >= new Date().getFullYear(), {
			message: "Card has expired",
		})
		.optional(),
	isDefault: z.boolean().optional(),
	billingAddress: z
		.object({
			street: z.string().optional(),
			city: z.string().optional(),
			state: z.string().optional(),
			zipCode: z.string().optional(),
			country: z.string().optional(),
		})
		.optional(),
	stripePaymentMethodId: z.string().optional(),
});

const upgradePlanSchema = z.object({
	planId: z.string().uuid("Invalid plan ID"),
	paymentMethodId: z.string().uuid("Invalid payment method ID").optional(),
});

const cancelSubscriptionSchema = z.object({
	cancelImmediately: z.boolean().optional().default(false),
});

const paymentHistoryQuerySchema = z.object({
	page: z
		.string()
		.optional()
		.default("1")
		.transform((val) => parseInt(val))
		.refine((val) => val > 0, "Page must be greater than 0"),
	limit: z
		.string()
		.optional()
		.default("20")
		.transform((val) => parseInt(val))
		.refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100"),
});

module.exports = {
	addPaymentMethodSchema,
	paymentMethodIdSchema,
	updatePaymentMethodSchema,
	upgradePlanSchema,
	cancelSubscriptionSchema,
	paymentHistoryQuerySchema,
};
