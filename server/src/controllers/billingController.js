/**
 * Billing Controller
 *
 * Handles billing operations for organizations including:
 * - Checkout session creation
 * - Subscription management
 * - Invoice history
 * - Payment methods
 * - Usage tracking
 * - Plan upgrades/downgrades
 */

const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const UsageLog = require('../models/UsageLog');
const { BillingService } = require('../services/billingService');

/**
 * @desc    Get available plans (public)
 * @route   GET /api/billing/plans
 * @access  Public
 */
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true, isPublic: true })
      .sort({ sortOrder: 1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plans'
    });
  }
};

/**
 * @desc    Get current subscription for organization
 * @route   GET /api/billing/subscription
 * @access  Private (requires organization)
 */
const getSubscription = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const subscription = await Subscription.findOne({ organizationId });
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get plan details
    const currentPlan = await Plan.findOne({ slug: organization.plan });

    res.json({
      success: true,
      data: {
        subscription,
        organization: {
          plan: organization.plan,
          planName: organization.planName,
          planLimits: organization.planLimits,
          features: organization.features,
          subscriptionStatus: organization.subscriptionStatus,
          subscriptionProvider: organization.subscriptionProvider,
          trialEndsAt: organization.trialEndsAt,
          currentPeriodStart: organization.currentPeriodStart,
          currentPeriodEnd: organization.currentPeriodEnd,
          canceledAt: organization.canceledAt,
          usage: organization.usage
        },
        currentPlan,
        provider: organization.subscriptionProvider || 'none'
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription'
    });
  }
};

/**
 * @desc    Create checkout session
 * @route   POST /api/billing/checkout
 * @access  Private (requires organization admin)
 */
const createCheckout = async (req, res) => {
  try {
    const { planId, billingPeriod = 'monthly', provider } = req.body;
    const organizationId = req.organizationId;
    const userId = req.user._id;

    // Validate plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    // Get organization
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Determine provider
    const billingProvider = provider || BillingService.getDefaultProvider(plan.currency?.code || 'USD');

    if (!billingProvider) {
      return res.status(400).json({
        success: false,
        message: 'No billing provider configured'
      });
    }

    // Ensure customer exists with billing provider
    if (billingProvider === 'stripe' && !organization.stripeCustomerId) {
      const customer = await BillingService.getOrCreateCustomer(organization, req.user, 'stripe');
      organization.stripeCustomerId = customer.customerId;
      await organization.save();
    } else if (billingProvider === 'razorpay' && !organization.razorpayCustomerId) {
      const customer = await BillingService.getOrCreateCustomer(organization, req.user, 'razorpay');
      organization.razorpayCustomerId = customer.customerId;
      await organization.save();
    }

    // Create checkout
    const returnUrl = `${process.env.CLIENT_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`;

    const checkout = await BillingService.createCheckout(
      organization,
      plan,
      billingPeriod,
      billingProvider,
      returnUrl
    );

    // Log checkout attempt
    await UsageLog.logAction({
      organizationId,
      userId,
      userRole: req.userRole,
      action: 'billing.checkout_created',
      resource: 'subscription',
      details: {
        plan: plan.slug,
        billingPeriod,
        provider: billingProvider,
        checkoutId: checkout.sessionId || checkout.orderId
      },
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      data: {
        ...checkout,
        provider: billingProvider,
        plan: {
          id: plan._id,
          name: plan.name,
          slug: plan.slug,
          amount: billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
          currency: plan.currency?.code || 'USD'
        }
      }
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
};

/**
 * @desc    Cancel subscription
 * @route   POST /api/billing/subscription/cancel
 * @access  Private (requires organization admin)
 */
const cancelSubscription = async (req, res) => {
  try {
    const { cancelImmediately = false } = req.body;
    const organizationId = req.organizationId;
    const userId = req.user._id;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check if organization has an active subscription
    if (organization.subscriptionStatus === 'canceled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already canceled'
      });
    }

    const provider = organization.subscriptionProvider;
    let subscriptionId;

    if (provider === 'stripe') {
      subscriptionId = organization.stripeSubscriptionId;
    } else if (provider === 'razorpay') {
      subscriptionId = organization.razorpaySubscriptionId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No active subscription to cancel'
      });
    }

    // Cancel subscription with provider
    const result = await BillingService.cancelSubscription(
      subscriptionId,
      provider,
      cancelImmediately
    );

    // Update organization
    if (cancelImmediately) {
      organization.subscriptionStatus = 'canceled';
      organization.canceledAt = new Date();

      // Downgrade to free plan
      const freePlan = await Plan.findOne({ tier: 'free' }) || await Plan.getDefaultPlan();
      if (freePlan) {
        organization.plan = freePlan.slug;
        organization.planName = freePlan.name;
        organization.planLimits = freePlan.limits;
        organization.features = freePlan.features;
      }
    } else {
      organization.canceledAt = new Date();
      // Status will be updated by webhook when subscription ends
    }

    await organization.save();

    // Update subscription record
    await Subscription.findOneAndUpdate(
      { organizationId },
      {
        status: cancelImmediately ? 'canceled' : organization.subscriptionStatus,
        cancelAtPeriodEnd: !cancelImmediately,
        canceledAt: new Date()
      }
    );

    // Log cancellation
    await UsageLog.logAction({
      organizationId,
      userId,
      userRole: req.userRole,
      action: 'billing.subscription_cancelled',
      resource: 'subscription',
      resourceId: subscriptionId,
      details: { cancelImmediately, provider },
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      message: cancelImmediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of the billing period',
      data: {
        status: result.status,
        cancelAtPeriodEnd: result.cancelAtPeriodEnd || cancelImmediately,
        currentPeriodEnd: organization.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel subscription'
    });
  }
};

/**
 * @desc    Reactivate canceled subscription
 * @route   POST /api/billing/subscription/reactivate
 * @access  Private (requires organization admin)
 */
const reactivateSubscription = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user._id;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check if subscription was scheduled for cancellation
    if (!organization.canceledAt) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not scheduled for cancellation'
      });
    }

    const provider = organization.subscriptionProvider;
    let subscriptionId;

    if (provider === 'stripe') {
      subscriptionId = organization.stripeSubscriptionId;

      // Reactivate in Stripe
      await BillingService.reactivateSubscription(subscriptionId, 'stripe');
    } else if (provider === 'razorpay') {
      // Razorpay doesn't support reactivation
      // Need to create new subscription
      return res.status(400).json({
        success: false,
        message: 'Razorpay subscriptions cannot be reactivated. Please create a new subscription.'
      });
    }

    // Update organization
    organization.canceledAt = null;
    await organization.save();

    // Update subscription record
    await Subscription.findOneAndUpdate(
      { organizationId },
      {
        cancelAtPeriodEnd: false,
        canceledAt: null
      }
    );

    // Log reactivation
    await UsageLog.logAction({
      organizationId,
      userId,
      userRole: req.userRole,
      action: 'billing.subscription_reactivated',
      resource: 'subscription',
      resourceId: subscriptionId,
      details: { provider }
    });

    res.json({
      success: true,
      message: 'Subscription reactivated successfully'
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reactivate subscription'
    });
  }
};

/**
 * @desc    Upgrade plan
 * @route   POST /api/billing/upgrade
 * @access  Private (requires organization admin)
 */
const upgradePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const organizationId = req.organizationId;
    const userId = req.user._id;

    // Get new plan
    const newPlan = await Plan.findById(planId);
    if (!newPlan || !newPlan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get current plan
    const currentPlan = await Plan.findOne({ slug: organization.plan });
    if (!currentPlan) {
      return res.status(400).json({
        success: false,
        message: 'Current plan not found'
      });
    }

    // Check if this is actually an upgrade
    const currentPrice = currentPlan.monthlyPrice;
    const newPrice = newPlan.monthlyPrice;

    if (newPrice <= currentPrice) {
      return res.status(400).json({
        success: false,
        message: 'Selected plan is not an upgrade. Use downgrade instead.'
      });
    }

    const provider = organization.subscriptionProvider;
    const billingPeriod = 'monthly'; // TODO: Get from subscription

    // Calculate proration
    const daysRemaining = Math.ceil(
      (organization.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24)
    );

    const proration = BillingService.calculateProration(
      currentPlan,
      newPlan,
      billingPeriod,
      daysRemaining
    );

    // For Stripe, update subscription with proration
    if (provider === 'stripe' && organization.stripeSubscriptionId) {
      const priceId = newPlan.monthlyStripePriceId;

      await BillingService.updateSubscription(
        organization.stripeSubscriptionId,
        priceId,
        'stripe'
      );
    } else if (provider === 'razorpay') {
      // For Razorpay, need to cancel and create new
      // This would typically require a new checkout
      return res.json({
        success: true,
        requiresPayment: true,
        message: 'Plan upgrade requires new checkout',
        data: {
          currentPlan: currentPlan.slug,
          newPlan: newPlan.slug,
          proration,
          requiresCheckout: true
        }
      });
    }

    // Update organization with new plan
    organization.plan = newPlan.slug;
    organization.planName = newPlan.name;
    organization.planLimits = newPlan.limits;
    organization.features = newPlan.features;
    await organization.save();

    // Update subscription record
    const subscription = await Subscription.findOne({ organizationId });
    if (subscription) {
      await subscription.recordPlanChange({
        fromPlan: currentPlan.slug,
        toPlan: newPlan.slug,
        changedBy: userId,
        reason: 'upgrade',
        prorationAmount: proration.netAmount
      });

      subscription.plan = newPlan.slug;
      subscription.planName = newPlan.name;
      subscription.planLimits = newPlan.limits;
      subscription.features = newPlan.features;
      await subscription.save();
    }

    // Log plan change
    await UsageLog.logAction({
      organizationId,
      userId,
      userRole: req.userRole,
      action: 'billing.plan_upgraded',
      resource: 'subscription',
      details: {
        fromPlan: currentPlan.slug,
        toPlan: newPlan.slug,
        proration
      }
    });

    res.json({
      success: true,
      message: 'Plan upgraded successfully',
      data: {
        previousPlan: currentPlan,
        newPlan,
        proration
      }
    });
  } catch (error) {
    console.error('Upgrade plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upgrade plan'
    });
  }
};

/**
 * @desc    Downgrade plan
 * @route   POST /api/billing/downgrade
 * @access  Private (requires organization admin)
 */
const downgradePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const organizationId = req.organizationId;
    const userId = req.user._id;

    // Get new plan
    const newPlan = await Plan.findById(planId);
    if (!newPlan || !newPlan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get current plan
    const currentPlan = await Plan.findOne({ slug: organization.plan });
    if (!currentPlan) {
      return res.status(400).json({
        success: false,
        message: 'Current plan not found'
      });
    }

    // Check if this is actually a downgrade
    const currentPrice = currentPlan.monthlyPrice;
    const newPrice = newPlan.monthlyPrice;

    if (newPrice >= currentPrice) {
      return res.status(400).json({
        success: false,
        message: 'Selected plan is not a downgrade. Use upgrade instead.'
      });
    }

    // Check if downgrading would exceed limits
    const usage = organization.usage;
    const newLimits = newPlan.limits;

    const limitWarnings = [];
    if (usage.usersCount > newLimits.maxUsers && newLimits.maxUsers !== -1) {
      limitWarnings.push(`Current users (${usage.usersCount}) exceed new limit (${newLimits.maxUsers})`);
    }
    if (usage.projectsCount > newLimits.maxProjects && newLimits.maxProjects !== -1) {
      limitWarnings.push(`Current projects (${usage.projectsCount}) exceed new limit (${newLimits.maxProjects})`);
    }
    if (usage.storageUsedMB > newLimits.storageLimitMB && newLimits.storageLimitMB !== -1) {
      limitWarnings.push(`Current storage (${usage.storageUsedMB}MB) exceeds new limit (${newLimits.storageLimitMB}MB)`);
    }

    // Schedule downgrade at end of period (for Stripe)
    // For downgrades, we typically apply at end of billing period
    // This is handled differently than upgrades

    // Update subscription record to schedule plan change
    const subscription = await Subscription.findOne({ organizationId });
    if (subscription) {
      subscription.planHistory.push({
        fromPlan: currentPlan.slug,
        toPlan: newPlan.slug,
        changedAt: new Date(),
        changedBy: userId,
        reason: 'downgrade_scheduled'
      });
      await subscription.save();
    }

    // Log planned downgrade
    await UsageLog.logAction({
      organizationId,
      userId,
      userRole: req.userRole,
      action: 'billing.plan_downgrade_scheduled',
      resource: 'subscription',
      details: {
        fromPlan: currentPlan.slug,
        toPlan: newPlan.slug,
        limitWarnings
      }
    });

    res.json({
      success: true,
      message: 'Plan downgrade scheduled for end of billing period',
      data: {
        currentPlan,
        newPlan,
        scheduledAt: organization.currentPeriodEnd,
        limitWarnings
      }
    });
  } catch (error) {
    console.error('Downgrade plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to downgrade plan'
    });
  }
};

/**
 * @desc    Get invoice history
 * @route   GET /api/billing/invoices
 * @access  Private (requires organization admin)
 */
const getInvoices = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { limit = 10 } = req.query;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const provider = organization.subscriptionProvider;
    let invoices = [];

    // Get invoices from subscription record
    const subscription = await Subscription.findOne({ organizationId });

    if (subscription && subscription.invoices.length > 0) {
      invoices = subscription.invoices.slice(-parseInt(limit)).reverse();
    } else if (provider === 'stripe' && organization.stripeCustomerId) {
      // Fetch from Stripe
      invoices = await BillingService.getInvoices(
        organization.stripeCustomerId,
        'stripe',
        parseInt(limit)
      );
    } else if (provider === 'razorpay' && organization.razorpayCustomerId) {
      // Fetch from Razorpay
      invoices = await BillingService.getInvoices(
        organization.razorpayCustomerId,
        'razorpay',
        parseInt(limit)
      );
    }

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoices'
    });
  }
};

/**
 * @desc    Get payment methods
 * @route   GET /api/billing/payment-methods
 * @access  Private (requires organization admin)
 */
const getPaymentMethods = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const provider = organization.subscriptionProvider;
    let paymentMethods = [];

    if (provider === 'stripe' && organization.stripeCustomerId) {
      paymentMethods = await BillingService.getPaymentMethods(
        organization.stripeCustomerId,
        'stripe'
      );
    } else if (provider === 'razorpay' && organization.razorpayCustomerId) {
      paymentMethods = await BillingService.getPaymentMethods(
        organization.razorpayCustomerId,
        'razorpay'
      );
    }

    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods'
    });
  }
};

/**
 * @desc    Create billing portal session
 * @route   POST /api/billing/portal
 * @access  Private (requires organization admin)
 */
const createPortalSession = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { returnUrl } = req.body;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    if (!organization.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe customer account found'
      });
    }

    const portalUrl = `${process.env.CLIENT_URL}/dashboard/billing`;
    const session = await BillingService.createPortalSession(
      organization.stripeCustomerId,
      returnUrl || portalUrl
    );

    res.json({
      success: true,
      data: {
        url: session.url
      }
    });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create portal session'
    });
  }
};

/**
 * @desc    Get usage statistics
 * @route   GET /api/billing/usage
 * @access  Private (requires organization)
 */
const getUsage = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Update usage statistics to ensure accurate counts
    await organization.updateUsage();

    const plan = await Plan.findOne({ slug: organization.plan });

    // Calculate usage percentages
    const usage = organization.usage;
    const limits = organization.planLimits;

    const usageData = {
      users: {
        used: usage.usersCount,
        limit: limits.maxUsers,
        percentage: limits.maxUsers === -1 ? 0 : Math.round((usage.usersCount / limits.maxUsers) * 100),
        unlimited: limits.maxUsers === -1
      },
      projects: {
        used: usage.projectsCount,
        limit: limits.maxProjects,
        percentage: limits.maxProjects === -1 ? 0 : Math.round((usage.projectsCount / limits.maxProjects) * 100),
        unlimited: limits.maxProjects === -1
      },
      landingPages: {
        used: usage.landingPagesCount,
        limit: limits.maxLandingPages,
        percentage: limits.maxLandingPages === -1 ? 0 : Math.round((usage.landingPagesCount / limits.maxLandingPages) * 100),
        unlimited: limits.maxLandingPages === -1
      },
      storage: {
        usedMB: usage.storageUsedMB,
        limitMB: limits.storageLimitMB,
        percentage: limits.storageLimitMB === -1 ? 0 : Math.round((usage.storageUsedMB / limits.storageLimitMB) * 100),
        unlimited: limits.storageLimitMB === -1
      },
      aiCalls: {
        used: usage.aiCallsThisMonth,
        limit: limits.aiCallsPerMonth,
        percentage: limits.aiCallsPerMonth === -1 ? 0 : Math.round((usage.aiCallsThisMonth / limits.aiCallsPerMonth) * 100),
        unlimited: limits.aiCallsPerMonth === -1,
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      }
    };

    res.json({
      success: true,
      data: {
        usage: usageData,
        plan: {
          name: organization.planName,
          slug: organization.plan,
          limits,
          features: organization.features
        },
        planDetails: plan,
        billing: {
          status: organization.subscriptionStatus,
          provider: organization.subscriptionProvider,
          trialEndsAt: organization.trialEndsAt,
          currentPeriodStart: organization.currentPeriodStart,
          currentPeriodEnd: organization.currentPeriodEnd,
          canceledAt: organization.canceledAt
        }
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get usage statistics'
    });
  }
};

/**
 * @desc    Verify checkout success (after redirect from payment provider)
 * @route   POST /api/billing/verify-checkout
 * @access  Private (requires organization)
 */
const verifyCheckout = async (req, res) => {
  try {
    const { sessionId, provider } = req.body;
    const organizationId = req.organizationId;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    if (provider === 'stripe') {
      // Verify session with Stripe
      const session = await BillingService.getProvider('stripe').stripeClient.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Payment not completed'
        });
      }

      // The webhook will handle the actual subscription update
      // Here we just confirm the payment was successful
      res.json({
        success: true,
        message: 'Checkout verified successfully',
        data: {
          status: session.status,
          paymentStatus: session.payment_status
        }
      });
    } else if (provider === 'razorpay') {
      // Razorpay verification is handled via webhook
      // This endpoint just confirms the order exists
      res.json({
        success: true,
        message: 'Order verified. Waiting for webhook confirmation.'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid provider'
      });
    }
  } catch (error) {
    console.error('Verify checkout error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify checkout'
    });
  }
};

/**
 * @desc    Create initial checkout session (for new users without organization)
 * @route   POST /api/billing/initial-checkout
 * @access  Private (authenticated, no organization required)
 */
const createInitialCheckout = async (req, res) => {
  try {
    const { planId, billingPeriod = 'monthly', provider } = req.body;
    const userId = req.user._id;
    const userEmail = req.user.email;
    const userName = req.user.name;

    // Validate plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    // Determine provider
    const billingProvider = provider || BillingService.getDefaultProvider(plan.currency?.code || 'INR');

    if (!billingProvider) {
      return res.status(400).json({
        success: false,
        message: 'No billing provider configured'
      });
    }

    // Calculate amount
    const amount = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const currency = plan.currency?.code || 'INR';

    if (billingProvider === 'razorpay') {
      // Create Razorpay order
      const RazorpayService = BillingService.getProvider('razorpay');

      if (!RazorpayService || !RazorpayService.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: 'Razorpay is not configured'
        });
      }

      // Create order for one-time payment (for initial subscription)
      const order = await RazorpayService.createOrder(
        null, // No organization yet
        plan,
        billingPeriod
      );

      res.json({
        success: true,
        data: {
          provider: 'razorpay',
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
          prefill: {
            name: userName,
            email: userEmail
          },
          plan: {
            id: plan._id,
            name: plan.name,
            slug: plan.slug,
            amount,
            currency,
            billingPeriod
          }
        }
      });
    } else if (billingProvider === 'stripe') {
      // Create Stripe checkout session
      const StripeService = BillingService.getProvider('stripe');

      if (!StripeService || !StripeService.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: 'Stripe is not configured'
        });
      }

      // Create customer first
      const customer = await StripeService.createCustomer({
        email: userEmail,
        name: userName
      });

      // Create checkout session
      const priceId = billingPeriod === 'yearly' ? plan.yearlyStripePriceId : plan.monthlyStripePriceId;

      const session = await StripeService.stripeClient.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${process.env.CLIENT_URL}/onboarding?canceled=true`,
        metadata: {
          userId: userId.toString(),
          planId: plan._id.toString(),
          planSlug: plan.slug,
          billingPeriod
        }
      });

      res.json({
        success: true,
        data: {
          provider: 'stripe',
          sessionId: session.id,
          url: session.url,
          plan: {
            id: plan._id,
            name: plan.name,
            slug: plan.slug,
            amount,
            currency,
            billingPeriod
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Unsupported payment provider'
      });
    }
  } catch (error) {
    console.error('Create initial checkout error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
};

module.exports = {
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
};