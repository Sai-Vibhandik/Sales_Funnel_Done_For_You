const express = require('express');
const router = express.Router();
const { handleStripeWebhook, handleRazorpayWebhook } = require('../controllers/webhookController');

/**
 * Webhook Routes
 *
 * These routes handle webhook events from Stripe and Razorpay.
 * They must use raw body parsing for signature verification.
 */

// Special middleware to capture raw body for webhook signature verification
const rawBodyMiddleware = express.raw({ type: 'application/json' });

/**
 * @desc    Handle Stripe webhooks
 * @route   POST /api/webhooks/stripe
 * @access  Public (verified by signature)
 */
router.post('/stripe', rawBodyMiddleware, handleStripeWebhook);

/**
 * @desc    Handle Razorpay webhooks
 * @route   POST /api/webhooks/razorpay
 * @access  Public (verified by signature)
 */
router.post('/razorpay', rawBodyMiddleware, handleRazorpayWebhook);

module.exports = router;