const express = require("express");
const {
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
} = require("../controllers/billing");
const { authenticateSuperAdmin } = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Billing and subscription management (super_admin only)
 */

// Payment Methods (super_admin only)
/**
 * @swagger
 * /billing/payment-methods:
 *   post:
 *     summary: Add a payment method
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cardHolderName
 *               - cardLastFour
 *               - cardBrand
 *               - cardExpMonth
 *               - cardExpYear
 *             properties:
 *               cardHolderName:
 *                 type: string
 *                 example: "John Doe"
 *               cardLastFour:
 *                 type: string
 *                 example: "4242"
 *               cardBrand:
 *                 type: string
 *                 enum: [visa, mastercard, amex, discover, diners, jcb, unionpay, other]
 *                 example: "visa"
 *               cardExpMonth:
 *                 type: string
 *                 example: "12"
 *               cardExpYear:
 *                 type: string
 *                 example: "2025"
 *               isDefault:
 *                 type: boolean
 *                 example: true
 *               billingAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *     responses:
 *       200:
 *         description: Payment method added successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only super_admin can manage payment methods
 */
router.post("/payment-methods", authenticateSuperAdmin, addPaymentMethod);

/**
 * @swagger
 * /billing/payment-methods:
 *   get:
 *     summary: Get all payment methods
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment methods
 *       401:
 *         description: Unauthorized
 */
router.get("/payment-methods", authenticateSuperAdmin, getPaymentMethods);

/**
 * @swagger
 * /billing/payment-methods/{paymentMethodId}:
 *   put:
 *     summary: Update a payment method
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentMethodId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment method ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardHolderName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 example: "John Doe"
 *               cardLastFour:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 4
 *                 pattern: "^\\d{4}$"
 *                 example: "4242"
 *               cardBrand:
 *                 type: string
 *                 enum: [visa, mastercard, amex, discover, diners, jcb, unionpay, other]
 *                 example: "visa"
 *               cardExpMonth:
 *                 type: string
 *                 pattern: "^(0[1-9]|1[0-2])$"
 *                 example: "12"
 *               cardExpYear:
 *                 type: string
 *                 pattern: "^\\d{4}$"
 *                 example: "2025"
 *               isDefault:
 *                 type: boolean
 *                 example: false
 *               billingAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *               stripePaymentMethodId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment method updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Payment method updated successfully"
 *                     paymentMethod:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         cardHolderName:
 *                           type: string
 *                         cardLastFour:
 *                           type: string
 *                         cardBrand:
 *                           type: string
 *                         cardExpMonth:
 *                           type: string
 *                         cardExpYear:
 *                           type: string
 *                         isDefault:
 *                           type: boolean
 *                         billingAddress:
 *                           type: object
 *                           nullable: true
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Unauthorized to modify this payment method
 *       404:
 *         description: Payment method not found
 */
router.put("/payment-methods/:paymentMethodId", authenticateSuperAdmin, updatePaymentMethod);

/**
 * @swagger
 * /billing/payment-methods/{paymentMethodId}/set-default:
 *   put:
 *     summary: Set a payment method as default
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentMethodId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Default payment method updated
 *       404:
 *         description: Payment method not found
 */
router.put("/payment-methods/:paymentMethodId/set-default", authenticateSuperAdmin, setDefaultPaymentMethod);

/**
 * @swagger
 * /billing/payment-methods/{paymentMethodId}:
 *   delete:
 *     summary: Delete a payment method
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentMethodId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment method deleted
 *       400:
 *         description: Cannot delete default payment method
 *       404:
 *         description: Payment method not found
 */
router.delete("/payment-methods/:paymentMethodId", authenticateSuperAdmin, deletePaymentMethod);

// Payment Plans (accessible to all authenticated users)
/**
 * @swagger
 * /billing/plans:
 *   get:
 *     summary: Get all available payment plans
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment plans
 */
router.get("/plans", authenticateSuperAdmin, getPaymentPlans);

/**
 * @swagger
 * /billing/plans/{planId}:
 *   get:
 *     summary: Get payment plan by ID
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment plan details
 *       404:
 *         description: Plan not found
 */
router.get("/plans/:planId", authenticateSuperAdmin, getPaymentPlanById);

// Subscriptions (super_admin only)
/**
 * @swagger
 * /billing/subscription:
 *   get:
 *     summary: Get current subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 */
router.get("/subscription", authenticateSuperAdmin, getCurrentSubscription);

/**
 * @swagger
 * /billing/subscription/upgrade:
 *   post:
 *     summary: Upgrade subscription plan
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               paymentMethodId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional - uses default payment method if not provided
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *       404:
 *         description: Plan not found
 */
router.post("/subscription/upgrade", authenticateSuperAdmin, upgradePlan);

/**
 * @swagger
 * /billing/subscription/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelImmediately:
 *                 type: boolean
 *                 default: false
 *                 description: If true, cancels immediately. If false, cancels at end of billing period
 *     responses:
 *       200:
 *         description: Subscription cancelled
 */
router.post("/subscription/cancel", authenticateSuperAdmin, cancelSubscription);

// Payment History (super_admin only)
/**
 * @swagger
 * /billing/payment-history:
 *   get:
 *     summary: Get payment history
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Payment history with pagination
 */
router.get("/payment-history", authenticateSuperAdmin, getPaymentHistory);

module.exports = router;
