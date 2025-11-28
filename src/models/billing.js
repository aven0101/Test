const { v4: uuidv4 } = require("uuid");
const { executeQuery } = require("../config/database");

const billingModel = {
	// Payment Methods
	async createPaymentMethod(data) {
		const id = uuidv4();
		const query = `
            INSERT INTO payment_method (
                id, user_id, card_holder_name, card_last_four, card_brand,
                card_exp_month, card_exp_year, is_default, billing_address,
                stripe_payment_method_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

		await executeQuery(query, [
			id,
			data.userId,
			data.cardHolderName,
			data.cardLastFour,
			data.cardBrand,
			data.cardExpMonth,
			data.cardExpYear,
			data.isDefault || false,
			data.billingAddress ? JSON.stringify(data.billingAddress) : null,
			data.stripePaymentMethodId || null,
		]);

		return this.getPaymentMethodById(id);
	},

	async getPaymentMethodById(id) {
		const query = `
            SELECT 
                id, user_id, card_holder_name, card_last_four, card_brand,
                card_exp_month, card_exp_year, is_default, billing_address,
                created_at, updated_at
            FROM payment_method
            WHERE id = ?
        `;

		const rows = await executeQuery(query, [id]);
		if (rows.length === 0) return null;

		const method = rows[0];
		// billing_address is already parsed by MySQL driver if it's JSON type
		if (typeof method.billing_address === "string") {
			try {
				method.billing_address = JSON.parse(method.billing_address);
			} catch (e) {
				method.billing_address = null;
			}
		}
		return method;
	},

	async getPaymentMethodsByUserId(userId) {
		const query = `
            SELECT 
                id, user_id, card_holder_name, card_last_four, card_brand,
                card_exp_month, card_exp_year, is_default, billing_address,
                created_at, updated_at
            FROM payment_method
            WHERE user_id = ?
            ORDER BY is_default DESC, created_at DESC
        `;

		const rows = await executeQuery(query, [userId]);
		return rows.map((row) => ({
			...row,
			billing_address: typeof row.billing_address === "string" ? (row.billing_address ? JSON.parse(row.billing_address) : null) : row.billing_address,
		}));
	},

	async setDefaultPaymentMethod(userId, paymentMethodId) {
		// Remove default from all other cards
		await executeQuery("UPDATE payment_method SET is_default = 0 WHERE user_id = ?", [userId]);

		// Set new default
		await executeQuery("UPDATE payment_method SET is_default = 1 WHERE id = ? AND user_id = ?", [paymentMethodId, userId]);

		return true;
	},

	async updatePaymentMethod(id, userId, data) {
		const updates = [];
		const values = [];

		if (data.cardHolderName !== undefined) {
			updates.push("card_holder_name = ?");
			values.push(data.cardHolderName);
		}
		if (data.cardLastFour !== undefined) {
			updates.push("card_last_four = ?");
			values.push(data.cardLastFour);
		}
		if (data.cardBrand !== undefined) {
			updates.push("card_brand = ?");
			values.push(data.cardBrand);
		}
		if (data.cardExpMonth !== undefined) {
			updates.push("card_exp_month = ?");
			values.push(data.cardExpMonth);
		}
		if (data.cardExpYear !== undefined) {
			updates.push("card_exp_year = ?");
			values.push(data.cardExpYear);
		}
		if (data.isDefault !== undefined) {
			updates.push("is_default = ?");
			values.push(data.isDefault ? 1 : 0);
		}
		if (data.billingAddress !== undefined) {
			updates.push("billing_address = ?");
			values.push(data.billingAddress ? JSON.stringify(data.billingAddress) : null);
		}
		if (data.stripePaymentMethodId !== undefined) {
			updates.push("stripe_payment_method_id = ?");
			values.push(data.stripePaymentMethodId || null);
		}

		if (updates.length === 0) return this.getPaymentMethodById(id);

		// Add updated_at timestamp
		updates.push("updated_at = CURRENT_TIMESTAMP");
		values.push(id, userId);

		const query = `UPDATE payment_method SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`;
		await executeQuery(query, values);

		return this.getPaymentMethodById(id);
	},

	async deletePaymentMethod(id, userId) {
		const query = "DELETE FROM payment_method WHERE id = ? AND user_id = ?";
		await executeQuery(query, [id, userId]);
		return true;
	},

	// Payment Plans
	async getAllPaymentPlans(activeOnly = true) {
		let query = `
            SELECT 
                id, name, description, price, billing_cycle, features,
                max_users, max_storage_gb, is_active, display_order,
                created_at, updated_at
            FROM payment_plan
        `;

		if (activeOnly) {
			query += " WHERE is_active = TRUE";
		}

		query += " ORDER BY display_order ASC, price ASC";

		const rows = await executeQuery(query);
		return rows.map((row) => ({
			...row,
			features: typeof row.features === "string" ? JSON.parse(row.features) : row.features || [],
		}));
	},

	async getPaymentPlanById(id) {
		const query = `
            SELECT 
                id, name, description, price, billing_cycle, features,
                max_users, max_storage_gb, is_active, display_order,
                created_at, updated_at
            FROM payment_plan
            WHERE id = ?
        `;

		const rows = await executeQuery(query, [id]);
		if (rows.length === 0) return null;

		const plan = rows[0];
		plan.features = typeof plan.features === "string" ? JSON.parse(plan.features) : plan.features || [];
		return plan;
	},

	// Subscriptions
	async createSubscription(data) {
		const id = uuidv4();
		const query = `
            INSERT INTO business_subscription (
                id, business_id, payment_plan_id, payment_method_id, status,
                trial_ends_at, current_period_start, current_period_end,
                stripe_subscription_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

		await executeQuery(query, [
			id,
			data.businessId,
			data.paymentPlanId,
			data.paymentMethodId || null,
			data.status || "trial",
			data.trialEndsAt || null,
			data.currentPeriodStart,
			data.currentPeriodEnd,
			data.stripeSubscriptionId || null,
		]);

		return this.getSubscriptionById(id);
	},

	async getSubscriptionById(id) {
		const query = `
            SELECT 
                bs.*, 
                pp.name as plan_name, pp.price as plan_price, pp.billing_cycle,
                pm.card_last_four, pm.card_brand
            FROM business_subscription bs
            LEFT JOIN payment_plan pp ON bs.payment_plan_id = pp.id
            LEFT JOIN payment_method pm ON bs.payment_method_id = pm.id
            WHERE bs.id = ?
        `;

		const rows = await executeQuery(query, [id]);
		return rows.length > 0 ? rows[0] : null;
	},

	async getActiveSubscriptionByBusinessId(businessId) {
		const query = `
            SELECT 
                bs.*, 
                pp.name as plan_name, pp.price as plan_price, pp.billing_cycle,
                pp.features, pp.max_users, pp.max_storage_gb,
                pm.card_last_four, pm.card_brand
            FROM business_subscription bs
            LEFT JOIN payment_plan pp ON bs.payment_plan_id = pp.id
            LEFT JOIN payment_method pm ON bs.payment_method_id = pm.id
            WHERE bs.business_id = ? AND bs.status IN ('active', 'trial')
            ORDER BY bs.created_at DESC
            LIMIT 1
        `;

		const rows = await executeQuery(query, [businessId]);
		if (rows.length === 0) return null;

		const subscription = rows[0];
		// Handle features - might already be parsed by MySQL driver
		subscription.features = typeof subscription.features === "string" ? JSON.parse(subscription.features) : subscription.features || [];
		return subscription;
	},

	async updateSubscription(id, data) {
		const updates = [];
		const values = [];

		if (data.paymentPlanId !== undefined) {
			updates.push("payment_plan_id = ?");
			values.push(data.paymentPlanId);
		}
		if (data.paymentMethodId !== undefined) {
			updates.push("payment_method_id = ?");
			values.push(data.paymentMethodId);
		}
		if (data.status !== undefined) {
			updates.push("status = ?");
			values.push(data.status);
		}
		if (data.currentPeriodStart !== undefined) {
			updates.push("current_period_start = ?");
			values.push(data.currentPeriodStart);
		}
		if (data.currentPeriodEnd !== undefined) {
			updates.push("current_period_end = ?");
			values.push(data.currentPeriodEnd);
		}
		if (data.cancelAtPeriodEnd !== undefined) {
			updates.push("cancel_at_period_end = ?");
			values.push(data.cancelAtPeriodEnd);
		}
		if (data.cancelledAt !== undefined) {
			updates.push("cancelled_at = ?");
			values.push(data.cancelledAt);
		}

		if (updates.length === 0) return this.getSubscriptionById(id);

		values.push(id);
		const query = `UPDATE business_subscription SET ${updates.join(", ")} WHERE id = ?`;

		await executeQuery(query, values);
		return this.getSubscriptionById(id);
	},

	// Payment History
	async createPaymentHistory(data) {
		const id = uuidv4();
		const query = `
            INSERT INTO payment_history (
                id, business_id, subscription_id, payment_method_id, amount,
                currency, status, stripe_payment_intent_id, receipt_url, invoice_pdf_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

		await executeQuery(query, [
			id,
			data.businessId,
			data.subscriptionId || null,
			data.paymentMethodId || null,
			data.amount,
			data.currency || "USD",
			data.status,
			data.stripePaymentIntentId || null,
			data.receiptUrl || null,
			data.invoicePdfUrl || null,
		]);

		return id;
	},

	async getPaymentHistoryByBusinessId(businessId, limit = 50, offset = 0) {
		const query = `
            SELECT 
                ph.*,
                pp.name as plan_name,
                pm.card_last_four, pm.card_brand
            FROM payment_history ph
            LEFT JOIN business_subscription bs ON ph.subscription_id = bs.id
            LEFT JOIN payment_plan pp ON bs.payment_plan_id = pp.id
            LEFT JOIN payment_method pm ON ph.payment_method_id = pm.id
            WHERE ph.business_id = ?
            ORDER BY ph.payment_date DESC
            LIMIT ? OFFSET ?
        `;

		const rows = await executeQuery(query, [businessId, limit, offset]);
		return rows;
	},

	async getPaymentHistoryCount(businessId) {
		const query = "SELECT COUNT(*) as count FROM payment_history WHERE business_id = ?";
		const rows = await executeQuery(query, [businessId]);
		return rows[0].count;
	},
};

module.exports = billingModel;
