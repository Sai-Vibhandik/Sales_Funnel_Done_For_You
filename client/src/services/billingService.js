import api from './api';

/**
 * Billing Service
 *
 * Handles all billing-related API calls for subscription management,
 * payment processing, and usage tracking.
 */
export const billingService = {
  // ==========================================
  // Plans
  // ==========================================

  /**
   * Get all available plans
   */
  getPlans: () => api.get('/billing/plans'),

  /**
   * Get plan by ID
   */
  getPlan: (planId) => api.get(`/plans/${planId}`),

  // ==========================================
  // Subscription
  // ==========================================

  /**
   * Get current subscription for organization
   */
  getSubscription: () => api.get('/billing/subscription'),

  /**
   * Get usage statistics
   */
  getUsage: () => api.get('/billing/usage'),

  // ==========================================
  // Checkout & Payment
  // ==========================================

  /**
   * Create checkout session for plan subscription (requires organization)
   * @param {Object} data - { planId, billingPeriod, provider }
   */
  createCheckout: (data) => api.post('/billing/checkout', data),

  /**
   * Create initial checkout session (for new users without organization)
   * @param {Object} data - { planId, billingPeriod, provider }
   */
  createInitialCheckout: (data) => api.post('/billing/initial-checkout', data),

  /**
   * Verify checkout completion
   * @param {Object} data - { sessionId, provider }
   */
  verifyCheckout: (data) => api.post('/billing/verify-checkout', data),

  // ==========================================
  // Subscription Management
  // ==========================================

  /**
   * Cancel subscription
   * @param {Object} data - { cancelImmediately }
   */
  cancelSubscription: (data = {}) => api.post('/billing/subscription/cancel', data),

  /**
   * Reactivate canceled subscription
   */
  reactivateSubscription: () => api.post('/billing/subscription/reactivate'),

  /**
   * Upgrade to a higher plan
   * @param {string} planId - New plan ID
   */
  upgradePlan: (planId) => api.post('/billing/upgrade', { planId }),

  /**
   * Downgrade to a lower plan
   * @param {string} planId - New plan ID
   */
  downgradePlan: (planId) => api.post('/billing/downgrade', { planId }),

  // ==========================================
  // Invoices & Payment Methods
  // ==========================================

  /**
   * Get invoice history
   * @param {number} limit - Number of invoices to retrieve
   */
  getInvoices: (limit = 10) => api.get('/billing/invoices', { params: { limit } }),

  /**
   * Get saved payment methods
   */
  getPaymentMethods: () => api.get('/billing/payment-methods'),

  /**
   * Create billing portal session (Stripe)
   * @param {string} returnUrl - URL to return to after portal session
   */
  createPortalSession: (returnUrl) => api.post('/billing/portal', { returnUrl }),

  // ==========================================
  // Platform Admin
  // ==========================================

  /**
   * Get all subscriptions (Admin only)
   * @param {Object} params - { page, limit, status, plan, provider, search }
   */
  getAllSubscriptions: (params) => api.get('/platform/subscriptions', { params }),

  /**
   * Get subscription details (Admin only)
   * @param {string} subscriptionId
   */
  getSubscriptionDetails: (subscriptionId) => api.get(`/platform/subscriptions/${subscriptionId}`),

  /**
   * Override subscription status (Admin only)
   * @param {string} subscriptionId
   * @param {Object} data - { status, reason }
   */
  overrideSubscriptionStatus: (subscriptionId, data) =>
    api.put(`/platform/subscriptions/${subscriptionId}/override`, data),

  /**
   * Manually change organization plan (Admin only)
   * @param {string} organizationId
   * @param {Object} data - { planId, reason }
   */
  changeOrganizationPlan: (organizationId, data) =>
    api.put(`/platform/organizations/${organizationId}/plan`, data),

  /**
   * Extend trial period (Admin only)
   * @param {string} organizationId
   * @param {Object} data - { days, reason }
   */
  extendTrial: (organizationId, data) =>
    api.post(`/platform/organizations/${organizationId}/extend-trial`, data),

  /**
   * Get revenue analytics (Admin only)
   * @param {Object} params - { type, months }
   */
  getRevenueAnalytics: (params) => api.get('/platform/revenue', { params }),

  /**
   * Get platform usage (Admin only)
   */
  getPlatformUsage: () => api.get('/platform/usage'),

  /**
   * Get organization usage (Admin only)
   * @param {string} organizationId
   */
  getOrganizationUsage: (organizationId) =>
    api.get(`/platform/organizations/${organizationId}/usage`),

  /**
   * Recalculate organization usage (Admin only)
   * @param {string} organizationId
   */
  recalculateUsage: (organizationId) =>
    api.post(`/platform/organizations/${organizationId}/recalculate-usage`),
};

/**
 * Helper function to format currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  // For INR, prices are stored as whole rupees (not paise)
  // For USD, prices are stored in cents
  const isInr = currency === 'INR';
  const value = isInr
    ? (typeof amount === 'number' ? amount : parseFloat(amount))
    : (typeof amount === 'number' ? amount / 100 : parseFloat(amount) / 100);

  return new Intl.NumberFormat(isInr ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: isInr ? 0 : 2
  }).format(value);
};

/**
 * Helper function to format billing period
 */
export const formatBillingPeriod = (period) => {
  return period === 'yearly' ? 'Yearly' : 'Monthly';
};

/**
 * Helper function to get subscription status color
 */
export const getStatusColor = (status) => {
  const colors = {
    active: 'text-green-600 bg-green-100',
    trialing: 'text-blue-600 bg-blue-100',
    past_due: 'text-red-600 bg-red-100',
    canceled: 'text-gray-600 bg-gray-100',
    incomplete: 'text-yellow-600 bg-yellow-100',
    unpaid: 'text-red-600 bg-red-100',
    paused: 'text-orange-600 bg-orange-100',
    expired: 'text-red-600 bg-red-100'
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
};

/**
 * Helper function to check if subscription is active
 */
export const isSubscriptionActive = (status) => {
  return ['active', 'trialing'].includes(status);
};

/**
 * Helper function to calculate days remaining
 */
export const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
};

/**
 * Helper function to get usage percentage
 */
export const getUsagePercentage = (used, limit) => {
  if (limit === -1) return 0; // Unlimited
  if (!limit || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

/**
 * Helper function to get usage color based on percentage
 */
export const getUsageColor = (percentage) => {
  if (percentage >= 100) return 'text-red-600 bg-red-100';
  if (percentage >= 80) return 'text-orange-600 bg-orange-100';
  if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
  return 'text-green-600 bg-green-100';
};

export default billingService;