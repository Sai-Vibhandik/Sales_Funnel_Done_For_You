/**
 * Billing Service
 *
 * Handles subscription billing for both Stripe and Razorpay.
 * Provides unified interface for:
 * - Creating customers
 * - Managing subscriptions
 * - Handling webhooks
 * - Processing plan changes
 */

const stripe = require('stripe');
const crypto = require('crypto');

// Initialize Stripe (if configured)
let stripeClient = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
}

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

/**
 * Stripe Service
 */
const StripeService = {
  /**
   * Check if Stripe is configured
   */
  isConfigured: () => !!stripeClient,

  /**
   * Create a customer in Stripe
   */
  async createCustomer(organization, user) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: organization.name,
        metadata: {
          organizationId: organization._id.toString(),
          userId: user._id.toString()
        }
      });

      return {
        customerId: customer.id,
        provider: 'stripe'
      };
    } catch (error) {
      console.error('Stripe create customer error:', error);
      throw error;
    }
  },

  /**
   * Get or create customer
   */
  async getOrCreateCustomer(organization, user) {
    if (organization.stripeCustomerId) {
      try {
        const customer = await stripeClient.customers.retrieve(organization.stripeCustomerId);
        return { customerId: customer.id, existing: true };
      } catch (error) {
        if (error.code === 'resource_missing') {
          return this.createCustomer(organization, user);
        }
        throw error;
      }
    }
    return this.createCustomer(organization, user);
  },

  /**
   * Create subscription
   */
  async createSubscription(organization, plan, billingPeriod = 'monthly') {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const priceId = billingPeriod === 'yearly'
        ? plan.yearlyStripePriceId
        : plan.monthlyStripePriceId;

      if (!priceId) {
        throw new Error(`Price ID not configured for plan ${plan.slug} (${billingPeriod})`);
      }

      const subscription = await stripeClient.subscriptions.create({
        customer: organization.stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          organizationId: organization._id.toString(),
          plan: plan.slug,
          billingPeriod
        },
        ...(organization.trialEndsAt && {
          trial_end: Math.floor(new Date(organization.trialEndsAt).getTime() / 1000)
        })
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
      };
    } catch (error) {
      console.error('Stripe create subscription error:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, cancelImmediately = false) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const subscription = cancelImmediately
        ? await stripeClient.subscriptions.cancel(subscriptionId)
        : await stripeClient.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
          });

      return {
        status: subscription.status,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };
    } catch (error) {
      console.error('Stripe cancel subscription error:', error);
      throw error;
    }
  },

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const subscription = await stripeClient.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });

      return {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      };
    } catch (error) {
      console.error('Stripe reactivate subscription error:', error);
      throw error;
    }
  },

  /**
   * Update subscription to new plan
   */
  async updateSubscription(subscriptionId, newPriceId) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      // Get current subscription
      const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);

      // Update subscription item
      const updatedSubscription = await stripeClient.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'always_invoice'
      });

      return {
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
      };
    } catch (error) {
      console.error('Stripe update subscription error:', error);
      throw error;
    }
  },

  /**
   * Get invoices
   */
  async getInvoices(customerId, limit = 10) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const invoices = await stripeClient.invoices.list({
        customer: customerId,
        limit
      });

      return invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        createdAt: new Date(invoice.created * 1000),
        paidAt: invoice.status === 'paid' ? new Date(invoice.status_transitions.paid_at * 1000) : null,
        invoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf
      }));
    } catch (error) {
      console.error('Stripe get invoices error:', error);
      throw error;
    }
  },

  /**
   * Get customer payment methods
   */
  async getPaymentMethods(customerId) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const methods = await stripeClient.customers.listPaymentMethods(customerId, {
        type: 'card'
      });

      return methods.data.map(method => ({
        id: method.id,
        type: method.type,
        last4: method.card.last4,
        brand: method.card.brand,
        expiryMonth: method.card.exp_month,
        expiryYear: method.card.exp_year,
        isDefault: false
      }));
    } catch (error) {
      console.error('Stripe get payment methods error:', error);
      throw error;
    }
  },

  /**
   * Create billing portal session
   */
  async createPortalSession(customerId, returnUrl) {
    if (!stripeClient) throw new Error('Stripe not configured');

    try {
      const session = await stripeClient.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      return {
        url: session.url
      };
    } catch (error) {
      console.error('Stripe create portal session error:', error);
      throw error;
    }
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    if (!stripeClient) throw new Error('Stripe not configured');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      throw new Error('Invalid webhook signature');
    }
  }
};

/**
 * Razorpay Service
 */
const RazorpayService = {
  /**
   * Check if Razorpay is configured
   */
  isConfigured: () => !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),

  /**
   * Make authenticated request to Razorpay API
   */
  async request(endpoint, method = 'GET', body = null) {
    const url = `${RAZORPAY_BASE_URL}${endpoint}`;
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    const options = {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.description || 'Razorpay API error');
    }

    return data;
  },

  /**
   * Create a customer in Razorpay
   */
  async createCustomer(organization, user) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const customer = await this.request('/customers', 'POST', {
        name: organization.name,
        email: user.email,
        notes: {
          organizationId: organization._id.toString(),
          userId: user._id.toString()
        }
      });

      return {
        customerId: customer.id,
        provider: 'razorpay'
      };
    } catch (error) {
      console.error('Razorpay create customer error:', error);
      throw error;
    }
  },

  /**
   * Get or create customer
   */
  async getOrCreateCustomer(organization, user) {
    if (organization.razorpayCustomerId) {
      try {
        const customer = await this.request(`/customers/${organization.razorpayCustomerId}`);
        return { customerId: customer.id, existing: true };
      } catch (error) {
        // Customer not found, create new one
        if (error.message.includes('not found')) {
          return this.createCustomer(organization, user);
        }
        throw error;
      }
    }
    return this.createCustomer(organization, user);
  },

  /**
   * Create order for checkout (one-time or first subscription payment)
   */
  async createOrder(organization, plan, billingPeriod = 'monthly') {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const amount = billingPeriod === 'yearly'
        ? (plan.yearlyPrice || plan.monthlyPrice * 12) * 100 // Convert to paise
        : plan.monthlyPrice * 100;

      const order = await this.request('/orders', 'POST', {
        amount,
        currency: plan.currency?.code || 'INR',
        payment_capture: 1, // Auto capture
        notes: {
          organizationId: organization._id.toString(),
          plan: plan.slug,
          billingPeriod
        }
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID,
        prefill: {
          name: organization.name,
          email: organization.owner?.email
        }
      };
    } catch (error) {
      console.error('Razorpay create order error:', error);
      throw error;
    }
  },

  /**
   * Create subscription
   */
  async createSubscription(organization, plan, billingPeriod = 'monthly') {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const planId = billingPeriod === 'yearly'
        ? plan.yearlyRazorpayPlanId
        : plan.monthlyRazorpayPlanId;

      if (!planId) {
        throw new Error(`Razorpay plan ID not configured for ${plan.slug}`);
      }

      const subscription = await this.request('/subscriptions', 'POST', {
        plan_id: planId,
        customer_id: organization.razorpayCustomerId,
        total_count: billingPeriod === 'yearly' ? 12 : 1,
        notes: {
          organizationId: organization._id.toString(),
          plan: plan.slug,
          billingPeriod
        }
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_start * 1000),
        currentPeriodEnd: new Date(subscription.current_end * 1000),
        shortUrl: subscription.short_url
      };
    } catch (error) {
      console.error('Razorpay create subscription error:', error);
      throw error;
    }
  },

  /**
   * Update subscription (plan change)
   */
  async updateSubscription(subscriptionId, newPlanId, billingPeriod = 'monthly') {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      // Razorpay doesn't support direct plan changes, so we need to:
      // 1. Cancel current subscription at end of cycle
      // 2. Create new subscription
      // This is handled at a higher level in the billing service

      const subscription = await this.request(`/subscriptions/${subscriptionId}`, 'PATCH', {
        plan_id: newPlanId,
        notes: {
          updated: new Date().toISOString()
        }
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_end * 1000)
      };
    } catch (error) {
      console.error('Razorpay update subscription error:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, cancelImmediately = false) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const subscription = await this.request(
        `/subscriptions/${subscriptionId}`,
        cancelImmediately ? 'DELETE' : 'POST',
        cancelImmediately ? null : { cancel_at_cycle_end: 1 }
      );

      return {
        status: subscription.status,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_cycle_end || false
      };
    } catch (error) {
      console.error('Razorpay cancel subscription error:', error);
      throw error;
    }
  },

  /**
   * Reactivate subscription (undo cancellation)
   * Note: Razorpay doesn't support reactivation directly - need to create new subscription
   */
  async reactivateSubscription(subscriptionId) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    // Razorpay doesn't support reactivation of cancelled subscriptions
    // This needs to be handled at a higher level by creating a new subscription
    throw new Error('Razorpay does not support subscription reactivation. Create a new subscription instead.');
  },

  /**
   * Get payment methods (cards, UPI)
   */
  async getPaymentMethods(customerId) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      // Razorpay stores payment methods as tokens
      const tokens = await this.request(`/customers/${customerId}/tokens`);

      return tokens.items?.map(token => ({
        id: token.id,
        type: token.method, // 'card', 'upi', 'netbanking', 'wallet'
        last4: token.card?.last4,
        brand: token.card?.network,
        expiryMonth: token.card?.expiry_month,
        expiryYear: token.card?.expiry_year,
        bankName: token.bank,
        upiId: token.vpa,
        walletType: token.wallet_name,
        isDefault: false // Razorpay doesn't have default concept
      })) || [];
    } catch (error) {
      console.error('Razorpay get payment methods error:', error);
      throw error;
    }
  },

  /**
   * Get invoices
   */
  async getInvoices(customerId, limit = 10) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const invoices = await this.request(
        `/invoices?customer_id=${customerId}&count=${limit}`
      );

      return (invoices.items || []).map(invoice => ({
        id: invoice.id,
        number: invoice.invoice_number,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        createdAt: new Date(invoice.created_at * 1000),
        paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : null,
        invoiceUrl: invoice.short_url,
        invoicePdf: invoice.invoice_url
      }));
    } catch (error) {
      console.error('Razorpay get invoices error:', error);
      throw error;
    }
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    try {
      // For Razorpay, payload should be raw body string, signature from X-Razorpay-Signature header
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Razorpay webhook verification error:', error);
      return false;
    }
  },

  /**
   * Fetch subscription details
   */
  async getSubscription(subscriptionId) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      const subscription = await this.request(`/subscriptions/${subscriptionId}`);

      return {
        id: subscription.id,
        status: subscription.status,
        planId: subscription.plan_id,
        customerId: subscription.customer_id,
        currentStart: new Date(subscription.current_start * 1000),
        currentEnd: new Date(subscription.current_end * 1000),
        endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
        chargeAt: subscription.charge_at,
        totalCount: subscription.total_count,
        paidCount: subscription.paid_count,
        remainingCount: subscription.remaining_count
      };
    } catch (error) {
      console.error('Razorpay get subscription error:', error);
      throw error;
    }
  },

  /**
   * Verify payment signature
   * Verifies that the payment was made to Razorpay and is legitimate
   */
  verifyPayment({ orderId, paymentId, signature }) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    try {
      // Create the signature using the order_id and payment_id
      const payload = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest('hex');

      // Compare signatures
      return expectedSignature === signature;
    } catch (error) {
      console.error('Razorpay payment verification error:', error);
      return false;
    }
  }
};

/**
 * Unified Billing Service
 */
const BillingService = {
  /**
   * Get provider service
   */
  getProvider(provider) {
    if (provider === 'stripe') return StripeService;
    if (provider === 'razorpay') return RazorpayService;
    throw new Error(`Unknown provider: ${provider}`);
  },

  /**
   * Create customer (auto-select provider based on currency/region)
   */
  async createCustomer(organization, user, preferredProvider = 'stripe') {
    // Try preferred provider first
    if (preferredProvider === 'stripe' && StripeService.isConfigured()) {
      return StripeService.createCustomer(organization, user);
    }
    if (preferredProvider === 'razorpay' && RazorpayService.isConfigured()) {
      return RazorpayService.createCustomer(organization, user);
    }

    // Fallback to available provider
    if (StripeService.isConfigured()) {
      return StripeService.createCustomer(organization, user);
    }
    if (RazorpayService.isConfigured()) {
      return RazorpayService.createCustomer(organization, user);
    }

    throw new Error('No billing provider configured');
  },

  /**
   * Get or create customer
   */
  async getOrCreateCustomer(organization, user, provider = 'stripe') {
    const service = this.getProvider(provider);
    return service.getOrCreateCustomer(organization, user);
  },

  /**
   * Create order for checkout (Razorpay) or checkout session (Stripe)
   */
  async createCheckout(organization, plan, billingPeriod, provider = 'stripe', returnUrl) {
    if (provider === 'stripe') {
      // For Stripe, create a checkout session
      const customerId = organization.stripeCustomerId;
      const priceId = billingPeriod === 'yearly' ? plan.yearlyStripePriceId : plan.monthlyStripePriceId;

      if (!priceId) {
        throw new Error(`Stripe price ID not configured for plan ${plan.slug}`);
      }

      const session = await StripeService.stripeClient.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl}?canceled=true`,
        metadata: {
          organizationId: organization._id.toString(),
          plan: plan.slug,
          billingPeriod
        }
      });

      return {
        sessionId: session.id,
        url: session.url
      };
    }

    if (provider === 'razorpay') {
      return RazorpayService.createOrder(organization, plan, billingPeriod);
    }

    throw new Error(`Unknown provider: ${provider}`);
  },

  /**
   * Create subscription
   */
  async createSubscription(organization, plan, billingPeriod, provider = 'stripe') {
    const service = this.getProvider(provider);
    return service.createSubscription(organization, plan, billingPeriod);
  },

  /**
   * Update subscription (plan change)
   */
  async updateSubscription(subscriptionId, newPriceId, provider) {
    const service = this.getProvider(provider);
    return service.updateSubscription(subscriptionId, newPriceId);
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, provider, cancelImmediately = false) {
    const service = this.getProvider(provider);
    return service.cancelSubscription(subscriptionId, cancelImmediately);
  },

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId, provider) {
    const service = this.getProvider(provider);
    return service.reactivateSubscription(subscriptionId);
  },

  /**
   * Get invoices
   */
  async getInvoices(customerId, provider, limit = 10) {
    const service = this.getProvider(provider);
    return service.getInvoices(customerId, limit);
  },

  /**
   * Get payment methods
   */
  async getPaymentMethods(customerId, provider) {
    const service = this.getProvider(provider);
    return service.getPaymentMethods(customerId);
  },

  /**
   * Create billing portal session (Stripe only)
   */
  async createPortalSession(customerId, returnUrl) {
    return StripeService.createPortalSession(customerId, returnUrl);
  },

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId, provider) {
    const service = this.getProvider(provider);
    if (service.getSubscription) {
      return service.getSubscription(subscriptionId);
    }
    // For Stripe
    if (provider === 'stripe') {
      const subscription = await StripeService.stripeClient.subscriptions.retrieve(subscriptionId);
      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };
    }
    throw new Error(`Get subscription not supported for provider: ${provider}`);
  },

  /**
   * Calculate proration for plan change
   */
  calculateProration(currentPlan, newPlan, billingPeriod, daysRemaining, daysInPeriod = 30) {
    const currentPrice = billingPeriod === 'yearly'
      ? (currentPlan.yearlyPrice || currentPlan.monthlyPrice * 12)
      : currentPlan.monthlyPrice;
    const newPrice = billingPeriod === 'yearly'
      ? (newPlan.yearlyPrice || newPlan.monthlyPrice * 12)
      : newPlan.monthlyPrice;

    // Calculate credit for unused time
    const creditAmount = Math.round((currentPrice / daysInPeriod) * daysRemaining);

    // Calculate charge for new plan remaining time
    const chargeAmount = Math.round((newPrice / daysInPeriod) * daysRemaining);

    // Net amount (positive = customer pays more, negative = customer gets credit)
    const netAmount = chargeAmount - creditAmount;

    return {
      creditAmount,
      chargeAmount,
      netAmount,
      currency: currentPlan.currency?.code || 'USD',
      needsPayment: netAmount > 0
    };
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(provider, payload, signature) {
    if (provider === 'stripe') {
      return StripeService.verifyWebhookSignature(payload, signature);
    }
    if (provider === 'razorpay') {
      return RazorpayService.verifyWebhookSignature(payload, signature);
    }
    throw new Error(`Unknown provider: ${provider}`);
  },

  /**
   * Check if billing is configured
   */
  isConfigured() {
    return StripeService.isConfigured() || RazorpayService.isConfigured();
  },

  /**
   * Get available providers
   */
  getAvailableProviders() {
    const providers = [];
    if (StripeService.isConfigured()) providers.push('stripe');
    if (RazorpayService.isConfigured()) providers.push('razorpay');
    return providers;
  },

  /**
   * Get default provider based on currency
   */
  getDefaultProvider(currency = 'USD') {
    // Razorpay is preferred for INR
    if (currency === 'INR' && RazorpayService.isConfigured()) {
      return 'razorpay';
    }
    // Stripe for everything else
    if (StripeService.isConfigured()) {
      return 'stripe';
    }
    // Fallback
    if (RazorpayService.isConfigured()) {
      return 'razorpay';
    }
    return null;
  }
};

module.exports = {
  BillingService,
  StripeService,
  RazorpayService
};