const billingService = require("../services/billing");
const { controller } = require("../utils/controller");
const {
	addPaymentMethodSchema,
	paymentMethodIdSchema,
	updatePaymentMethodSchema,
	upgradePlanSchema,
	cancelSubscriptionSchema,
	paymentHistoryQuerySchema,
} = require("../schemas/billing");

// Payment Methods
const addPaymentMethod = controller({ body: addPaymentMethodSchema }, ({ body }, user) => {
	return billingService.addPaymentMethod(user.id, body);
});

const getPaymentMethods = controller({}, ({}, user) => {
	return billingService.getPaymentMethods(user.id);
});

const updatePaymentMethod = controller(
	{ params: paymentMethodIdSchema, body: updatePaymentMethodSchema },
	({ params, body }, user) => {
		return billingService.updatePaymentMethod(user.id, params.paymentMethodId, body);
	},
);

const setDefaultPaymentMethod = controller({ params: paymentMethodIdSchema }, ({ params }, user) => {
	return billingService.setDefaultCard(user.id, params.paymentMethodId);
});

const deletePaymentMethod = controller({ params: paymentMethodIdSchema }, ({ params }, user) => {
	return billingService.deletePaymentMethod(user.id, params.paymentMethodId);
});

// Payment Plans
const getPaymentPlans = controller({}, () => {
	return billingService.getAllPlans();
});

const getPaymentPlanById = controller({}, ({ params }) => {
	return billingService.getPlanById(params.planId);
});

// Subscriptions
const getCurrentSubscription = controller({}, ({}, user) => {
	return billingService.getCurrentSubscription(user.id);
});

const upgradePlan = controller({ body: upgradePlanSchema }, ({ body }, user) => {
	return billingService.upgradePlan(user.id, body.planId, body.paymentMethodId);
});

const cancelSubscription = controller({ body: cancelSubscriptionSchema }, ({ body }, user) => {
	return billingService.cancelSubscription(user.id, body.cancelImmediately);
});

// Payment History
const getPaymentHistory = controller({ query: paymentHistoryQuerySchema }, ({ query }, user) => {
	return billingService.getPaymentHistory(user.id, query.page, query.limit);
});

module.exports = {
	addPaymentMethod,
	getPaymentMethods,
	updatePaymentMethod,
	setDefaultPaymentMethod,
	deletePaymentMethod,
	getPaymentPlans,
	getPaymentPlanById,
	getCurrentSubscription,
	upgradePlan,
	cancelSubscription,
	getPaymentHistory,
};
