const express = require("express");
const router = express.Router();
const { completePayment, getPaymentHistory } = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");
const { setTenantContext, requireOrganization } = require("../middleware/tenant");

/**
 * Payment Routes
 *
 * POST /api/payments/complete
 *   - Called after Razorpay payment verification to store payment in local DB
 *   - Creates organization and payment record
 *   - Supports both authenticated users (via token) and userId in body (for onboarding)
 *
 * GET /api/payments/history
 *   - Get payment history for current organization (requires auth)
 */

/**
 * @desc    Complete payment and create organization
 * @route   POST /api/payments/complete
 * @access  Public (with userId in body) or Private (with token)
 */
router.post("/complete", completePayment);

/**
 * @desc    Get payment history for current organization
 * @route   GET /api/payments/history
 * @access  Private (requires auth + organization)
 */
router.get("/history", protect, setTenantContext, requireOrganization, getPaymentHistory);

module.exports = router;