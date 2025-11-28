const billingModel = require("../models/billing");
const userModel = require("../models/user");
const { AppError } = require("../middleware/errorHandler");
const Response = require("../utils/controller").Response;

const billingService = {
	// Payment Methods
	async addPaymentMethod(userId, cardData) {
		// Verify user exists and is super_admin
		const user = await userModel.findById(userId);
		if (!user) {
			throw new AppError("User not found", 404);
		}

		// If this is the first card, make it default
		const existingCards = await billingModel.getPaymentMethodsByUserId(userId);
		const isDefault = existingCards.length === 0 || cardData.isDefault;

		const paymentMethod = await billingModel.createPaymentMethod({
			userId,
			cardHolderName: cardData.cardHolderName,
			cardLastFour: cardData.cardLastFour,
			cardBrand: cardData.cardBrand,
			cardExpMonth: cardData.cardExpMonth,
			cardExpYear: cardData.cardExpYear,
			isDefault,
			billingAddress: cardData.billingAddress,
			stripePaymentMethodId: cardData.stripePaymentMethodId,
		});

		// If setting as default, update all other cards
		if (isDefault && existingCards.length > 0) {
			await billingModel.setDefaultPaymentMethod(userId, paymentMethod.id);
		}

		return Response.ok({
			message: "Payment method added successfully",
			paymentMethod: this.formatPaymentMethod(paymentMethod),
		});
	},

	async getPaymentMethods(userId) {
		const methods = await billingModel.getPaymentMethodsByUserId(userId);
		return Response.ok({
			paymentMethods: methods.map(this.formatPaymentMethod),
			totalCount: methods.length,
		});
	},

	async setDefaultCard(userId, paymentMethodId) {
		// Verify card belongs to user
		const card = await billingModel.getPaymentMethodById(paymentMethodId);
		if (!card) {
			throw new AppError("Payment method not found", 404);
		}

		if (card.user_id !== userId) {
			throw new AppError("Unauthorized to modify this payment method", 403);
		}

		await billingModel.setDefaultPaymentMethod(userId, paymentMethodId);

		return Response.okMessage("Default payment method updated successfully");
	},

	async updatePaymentMethod(userId, paymentMethodId, updateData) {
		// Verify card belongs to user
		const card = await billingModel.getPaymentMethodById(paymentMethodId);
		if (!card) {
			throw new AppError("Payment method not found", 404);
		}

		if (card.user_id !== userId) {
			throw new AppError("Unauthorized to modify this payment method", 403);
		}

		// If setting as default, update all other cards first
		if (updateData.isDefault) {
			await billingModel.setDefaultPaymentMethod(userId, paymentMethodId);
			// Remove isDefault from updateData since it's already handled
			delete updateData.isDefault;
		}

		// Update the payment method
		const updatedMethod = await billingModel.updatePaymentMethod(paymentMethodId, userId, updateData);

		return Response.ok({
			message: "Payment method updated successfully",
			paymentMethod: this.formatPaymentMethod(updatedMethod),
		});
	},

	async deletePaymentMethod(userId, paymentMethodId) {
		const card = await billingModel.getPaymentMethodById(paymentMethodId);
		if (!card) {
			throw new AppError("Payment method not found", 404);
		}

		if (card.user_id !== userId) {
			throw new AppError("Unauthorized to delete this payment method", 403);
		}

		// Check if it's the default card
		if (card.is_default) {
			const allCards = await billingModel.getPaymentMethodsByUserId(userId);
			if (allCards.length > 1) {
				throw new AppError("Cannot delete default payment method. Please set another card as default first.", 400);
			}
		}

		await billingModel.deletePaymentMethod(paymentMethodId, userId);

		return Response.okMessage("Payment method deleted successfully");
	},

	// Payment Plans
	async getAllPlans() {
		const plans = await billingModel.getAllPaymentPlans(true);
		return Response.ok({
			plans: plans.map(this.formatPaymentPlan),
			totalCount: plans.length,
		});
	},

	async getPlanById(planId) {
		const plan = await billingModel.getPaymentPlanById(planId);
		if (!plan) {
			throw new AppError("Payment plan not found", 404);
		}

		return Response.ok({
			plan: this.formatPaymentPlan(plan),
		});
	},

	// Subscriptions
	async getCurrentSubscription(userId) {
		const user = await userModel.findById(userId);
		if (!user || !user.business_id) {
			throw new AppError("Business not found for this user", 404);
		}

		const subscription = await billingModel.getActiveSubscriptionByBusinessId(user.business_id);

		if (!subscription) {
			return Response.ok({
				subscription: null,
				message: "No active subscription found",
			});
		}

		return Response.ok({
			subscription: this.formatSubscription(subscription),
		});
	},

	async upgradePlan(userId, newPlanId, paymentMethodId = null) {
		const user = await userModel.findById(userId);
		if (!user || !user.business_id) {
			throw new AppError("Business not found for this user", 404);
		}

		// Get the new plan
		const newPlan = await billingModel.getPaymentPlanById(newPlanId);
		if (!newPlan) {
			throw new AppError("Payment plan not found", 404);
		}

		if (!newPlan.is_active) {
			throw new AppError("This payment plan is no longer available", 400);
		}

		// Get current subscription
		const currentSubscription = await billingModel.getActiveSubscriptionByBusinessId(user.business_id);

		// Calculate new period dates
		const now = new Date();
		const periodEnd = new Date(now);

		if (newPlan.billing_cycle === "monthly") {
			periodEnd.setMonth(periodEnd.getMonth() + 1);
		} else {
			periodEnd.setFullYear(periodEnd.getFullYear() + 1);
		}

		if (currentSubscription) {
			// Upgrade existing subscription
			const updated = await billingModel.updateSubscription(currentSubscription.id, {
				paymentPlanId: newPlanId,
				paymentMethodId: paymentMethodId || currentSubscription.payment_method_id,
				status: "active",
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
			});

			return Response.ok({
				message: "Subscription upgraded successfully",
				subscription: this.formatSubscription(updated),
			});
		} else {
			// Create new subscription
			const subscription = await billingModel.createSubscription({
				businessId: user.business_id,
				paymentPlanId: newPlanId,
				paymentMethodId,
				status: newPlan.price === 0 ? "active" : "trial",
				trialEndsAt: newPlan.price === 0 ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
			});

			return Response.ok({
				message: "Subscription created successfully",
				subscription: this.formatSubscription(subscription),
			});
		}
	},

	async cancelSubscription(userId, cancelImmediately = false) {
		const user = await userModel.findById(userId);
		if (!user || !user.business_id) {
			throw new AppError("Business not found for this user", 404);
		}

		const subscription = await billingModel.getActiveSubscriptionByBusinessId(user.business_id);
		if (!subscription) {
			throw new AppError("No active subscription found", 404);
		}

		if (cancelImmediately) {
			await billingModel.updateSubscription(subscription.id, {
				status: "cancelled",
				cancelledAt: new Date(),
				cancelAtPeriodEnd: false,
			});

			return Response.okMessage("Subscription cancelled immediately");
		} else {
			await billingModel.updateSubscription(subscription.id, {
				cancelAtPeriodEnd: true,
			});

			return Response.ok({
				message: "Subscription will be cancelled at the end of current billing period",
				periodEndDate: subscription.current_period_end,
			});
		}
	},

	// Payment History
	async getPaymentHistory(userId, page = 1, limit = 20) {
		const user = await userModel.findById(userId);
		if (!user || !user.business_id) {
			throw new AppError("Business not found for this user", 404);
		}

		const offset = (page - 1) * limit;
		const payments = await billingModel.getPaymentHistoryByBusinessId(user.business_id, limit, offset);
		const totalCount = await billingModel.getPaymentHistoryCount(user.business_id);

		return Response.ok({
			payments: payments.map(this.formatPaymentHistory),
			pagination: {
				page,
				limit,
				totalCount,
				totalPages: Math.ceil(totalCount / limit),
			},
		});
	},

	// Formatters
	formatPaymentMethod(method) {
		return {
			id: method.id,
			cardHolderName: method.card_holder_name,
			cardLastFour: method.card_last_four,
			cardBrand: method.card_brand,
			cardExpMonth: method.card_exp_month,
			cardExpYear: method.card_exp_year,
			isDefault: method.is_default,
			billingAddress: method.billing_address,
			createdAt: method.created_at,
		};
	},

	formatPaymentPlan(plan) {
		return {
			id: plan.id,
			name: plan.name,
			description: plan.description,
			price: parseFloat(plan.price),
			billingCycle: plan.billing_cycle,
			features: plan.features,
			maxUsers: plan.max_users,
			maxStorageGb: plan.max_storage_gb,
			isActive: plan.is_active,
			displayOrder: plan.display_order,
		};
	},

	formatSubscription(subscription) {
		return {
			id: subscription.id,
			businessId: subscription.business_id,
			planName: subscription.plan_name,
			planPrice: parseFloat(subscription.plan_price || 0),
			billingCycle: subscription.billing_cycle,
			features: subscription.features,
			maxUsers: subscription.max_users,
			maxStorageGb: subscription.max_storage_gb,
			status: subscription.status,
			trialEndsAt: subscription.trial_ends_at,
			currentPeriodStart: subscription.current_period_start,
			currentPeriodEnd: subscription.current_period_end,
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			cancelledAt: subscription.cancelled_at,
			paymentMethod: subscription.card_last_four
				? {
						lastFour: subscription.card_last_four,
						brand: subscription.card_brand,
					}
				: null,
			createdAt: subscription.created_at,
		};
	},

	formatPaymentHistory(payment) {
		return {
			id: payment.id,
			amount: parseFloat(payment.amount),
			currency: payment.currency,
			status: payment.status,
			planName: payment.plan_name,
			paymentDate: payment.payment_date,
			paymentMethod: payment.card_last_four
				? {
						lastFour: payment.card_last_four,
						brand: payment.card_brand,
					}
				: null,
			receiptUrl: payment.receipt_url,
			invoicePdfUrl: payment.invoice_pdf_url,
		};
	},
};

module.exports = billingService;
