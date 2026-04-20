const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { setTenantContext, requireOrganization, requireOrgAdmin } = require('../middleware/tenant');
const {
  getPlans,
  getSubscription,
  createCheckout,
  createInitialCheckout,
  cancelSubscription,
  reactivateSubscription,
  upgradePlan,
  downgradePlan,
  getInvoices,
  getPaymentMethods,
  createPortalSession,
  getUsage,
  verifyCheckout
} = require('../controllers/billingController');

/**
 * Billing Routes
 *
 * Routes for subscription management, checkout, and billing operations.
 * All routes require authentication and organization context.
 */

// Public route for plans (no auth required)
router.get('/plans', getPlans);

// All other routes require authentication
router.use(protect);

/**
 * @desc    Create initial checkout session (for new organizations without org context)
 * @route   POST /api/billing/initial-checkout
 * @access  Private (authenticated, no org required)
 */
router.post('/initial-checkout', createInitialCheckout);

/**
 * @desc    Verify checkout success (for new organizations)
 * @route   POST /api/billing/verify-initial-checkout
 * @access  Private (authenticated, no org required)
 */
router.post('/verify-initial-checkout', verifyCheckout);

// Routes below require organization context
router.use(setTenantContext);
router.use(requireOrganization);

/**
 * @desc    Get current subscription
 * @route   GET /api/billing/subscription
 * @access  Private (requires organization)
 */
router.get('/subscription', getSubscription);

/**
 * @desc    Get usage statistics
 * @route   GET /api/billing/usage
 * @access  Private (requires organization)
 */
router.get('/usage', getUsage);

/**
 * @desc    Get invoice history
 * @route   GET /api/billing/invoices
 * @access  Private (requires org admin)
 */
router.get('/invoices', requireOrgAdmin, getInvoices);

/**
 * @desc    Get payment methods
 * @route   GET /api/billing/payment-methods
 * @access  Private (requires org admin)
 */
router.get('/payment-methods', requireOrgAdmin, getPaymentMethods);

/**
 * @desc    Create checkout session
 * @route   POST /api/billing/checkout
 * @access  Private (requires org admin)
 */
router.post('/checkout', requireOrgAdmin, createCheckout);

/**
 * @desc    Cancel subscription
 * @route   POST /api/billing/subscription/cancel
 * @access  Private (requires org admin)
 */
router.post('/subscription/cancel', requireOrgAdmin, cancelSubscription);

/**
 * @desc    Reactivate subscription
 * @route   POST /api/billing/subscription/reactivate
 * @access  Private (requires org admin)
 */
router.post('/subscription/reactivate', requireOrgAdmin, reactivateSubscription);

/**
 * @desc    Upgrade plan
 * @route   POST /api/billing/upgrade
 * @access  Private (requires org admin)
 */
router.post('/upgrade', requireOrgAdmin, upgradePlan);

/**
 * @desc    Downgrade plan
 * @route   POST /api/billing/downgrade
 * @access  Private (requires org admin)
 */
router.post('/downgrade', requireOrgAdmin, downgradePlan);

/**
 * @desc    Create billing portal session
 * @route   POST /api/billing/portal
 * @access  Private (requires org admin)
 */
router.post('/portal', requireOrgAdmin, createPortalSession);

module.exports = router;