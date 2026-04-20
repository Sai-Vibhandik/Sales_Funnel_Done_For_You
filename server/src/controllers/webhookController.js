/**
 * Webhook Controller
 *
 * Handles webhooks from Stripe and Razorpay for payment events.
 * Processes subscription lifecycle events and updates database accordingly.
 */

const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const UsageLog = require('../models/UsageLog');
const { BillingService, StripeService, RazorpayService } = require('../services/billingService');

// Track processed webhooks to prevent duplicates
const processedWebhooks = new Map();
const WEBHOOK_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if webhook was already processed
 */
const isWebhookProcessed = (eventId) => {
  if (processedWebhooks.has(eventId)) {
    return true;
  }
  // Clean up old entries
  for (const [id, timestamp] of processedWebhooks) {
    if (Date.now() - timestamp > WEBHOOK_TTL) {
      processedWebhooks.delete(id);
    }
  }
  return false;
};

/**
 * Mark webhook as processed
 */
const markWebhookProcessed = (eventId) => {
  processedWebhooks.set(eventId, Date.now());
};

/**
 * Handle Stripe webhooks
 */
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const payload = req.body;

  try {
    // Verify webhook signature
    let event;
    try {
      event = StripeService.verifyWebhookSignature(payload, sig);
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err.message);
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Check for duplicate processing
    if (isWebhookProcessed(event.id)) {
      console.log(`Stripe webhook ${event.id} already processed`);
      return res.json({ success: true, message: 'Already processed' });
    }

    console.log(`Stripe webhook received: ${event.type}`);

    // Extract data
    const data = event.data.object;

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleStripeCheckoutCompleted(data);
        break;

      case 'customer.subscription.created':
        await handleStripeSubscriptionCreated(data);
        break;

      case 'customer.subscription.updated':
        await handleStripeSubscriptionUpdated(data);
        break;

      case 'customer.subscription.deleted':
        await handleStripeSubscriptionDeleted(data);
        break;

      case 'invoice.paid':
        await handleStripeInvoicePaid(data);
        break;

      case 'invoice.payment_failed':
        await handleStripeInvoicePaymentFailed(data);
        break;

      case 'payment_method.attached':
        await handleStripePaymentMethodAttached(data);
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    markWebhookProcessed(event.id);
    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

/**
 * Handle Razorpay webhooks
 */
const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const payload = req.body;

  try {
    // Verify webhook signature
    const isValid = RazorpayService.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      console.error('Razorpay webhook signature verification failed');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Check for duplicate processing
    const eventId = payload.entity || payload.payload?.entity?.id;
    if (isWebhookProcessed(eventId)) {
      console.log(`Razorpay webhook ${eventId} already processed`);
      return res.json({ success: true, message: 'Already processed' });
    }

    const event = payload.event || payload;
    console.log(`Razorpay webhook received: ${event}`);

    // Handle different event types
    switch (event) {
      case 'order.paid':
        await handleRazorpayOrderPaid(payload.payload?.entity || payload);
        break;

      case 'subscription.created':
        await handleRazorpaySubscriptionCreated(payload.payload?.entity || payload);
        break;

      case 'subscription.updated':
        await handleRazorpaySubscriptionUpdated(payload.payload?.entity || payload);
        break;

      case 'subscription.cancelled':
        await handleRazorpaySubscriptionCancelled(payload.payload?.entity || payload);
        break;

      case 'payment.authorized':
        await handleRazorpayPaymentAuthorized(payload.payload?.entity || payload);
        break;

      case 'payment.failed':
        await handleRazorpayPaymentFailed(payload.payload?.entity || payload);
        break;

      case 'invoice.paid':
        await handleRazorpayInvoicePaid(payload.payload?.entity || payload);
        break;

      default:
        console.log(`Unhandled Razorpay event type: ${event}`);
    }

    markWebhookProcessed(eventId);
    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Razorpay webhook processing error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

// ============================================
// Stripe Event Handlers
// ============================================

/**
 * Handle Stripe checkout.session.completed
 */
async function handleStripeCheckoutCompleted(session) {
  const organizationId = session.metadata?.organizationId;
  const planSlug = session.metadata?.plan;
  const billingPeriod = session.metadata?.billingPeriod || 'monthly';

  if (!organizationId) {
    console.log('No organizationId in checkout session');
    return;
  }

  // Find organization
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    console.log(`Organization not found: ${organizationId}`);
    return;
  }

  // Find plan
  const plan = await Plan.findOne({ slug: planSlug });
  if (!plan) {
    console.log(`Plan not found: ${planSlug}`);
    return;
  }

  // Get subscription details from Stripe
  const subscriptionId = session.subscription;
  const customerId = session.customer;

  // Update organization
  organization.stripeCustomerId = customerId;
  organization.stripeSubscriptionId = subscriptionId;
  organization.subscriptionStatus = 'active';
  organization.subscriptionProvider = 'stripe';
  organization.plan = planSlug;
  organization.planName = plan.name;
  organization.planLimits = plan.limits;
  organization.features = plan.features;
  await organization.save();

  // Create or update subscription record
  await Subscription.findOneAndUpdate(
    { organizationId },
    {
      organizationId,
      provider: 'stripe',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan: planSlug,
      planName: plan.name,
      planLimits: plan.limits,
      features: plan.features,
      billingPeriod,
      amount: billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
      currency: plan.currency?.code || 'USD',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
    },
    { upsert: true, new: true }
  );

  // Log action
  await UsageLog.logAction({
    organizationId,
    userId: organization.owner,
    userRole: 'admin',
    action: 'subscription.created',
    resource: 'subscription',
    resourceId: subscriptionId,
    details: { plan: planSlug, billingPeriod, provider: 'stripe' }
  });

  console.log(`Stripe checkout completed for organization: ${organizationId}`);
}

/**
 * Handle Stripe customer.subscription.created
 */
async function handleStripeSubscriptionCreated(subscription) {
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) return;

  const organization = await Organization.findById(organizationId);
  if (!organization) return;

  organization.stripeSubscriptionId = subscription.id;
  organization.subscriptionStatus = subscription.status;
  organization.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  organization.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  await organization.save();

  console.log(`Stripe subscription created: ${subscription.id}`);
}

/**
 * Handle Stripe customer.subscription.updated
 */
async function handleStripeSubscriptionUpdated(subscription) {
  const organizationId = subscription.metadata?.organizationId;

  // Find organization by subscription ID
  let organization = await Organization.findById(organizationId);
  if (!organization) {
    organization = await Organization.findOne({ stripeSubscriptionId: subscription.id });
  }

  if (!organization) return;

  organization.subscriptionStatus = subscription.status;
  organization.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  organization.currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  if (subscription.cancel_at_period_end) {
    organization.canceledAt = new Date();
  } else {
    organization.canceledAt = null;
  }

  await organization.save();

  // Update subscription record
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
    }
  );

  console.log(`Stripe subscription updated: ${subscription.id}`);
}

/**
 * Handle Stripe customer.subscription.deleted
 */
async function handleStripeSubscriptionDeleted(subscription) {
  const organization = await Organization.findOne({ stripeSubscriptionId: subscription.id });

  if (!organization) return;

  // Update organization to free/default plan
  const freePlan = await Plan.findOne({ tier: 'free' }) || await Plan.getDefaultPlan();

  organization.subscriptionStatus = 'canceled';
  organization.stripeSubscriptionId = null;
  organization.canceledAt = new Date();

  if (freePlan) {
    organization.plan = freePlan.slug;
    organization.planName = freePlan.name;
    organization.planLimits = freePlan.limits;
    organization.features = freePlan.features;
  }

  await organization.save();

  // Update subscription record
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    { status: 'canceled', canceledAt: new Date() }
  );

  console.log(`Stripe subscription deleted: ${subscription.id}`);
}

/**
 * Handle Stripe invoice.paid
 */
async function handleStripeInvoicePaid(invoice) {
  const organization = await Organization.findOne({ stripeCustomerId: invoice.customer });

  if (!organization) return;

  // Record invoice in subscription
  const subscription = await Subscription.findOne({ organizationId: organization._id });

  if (subscription) {
    await subscription.addInvoice({
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      paidAt: new Date(invoice.status_transitions?.paid_at * 1000),
      invoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf
    });
  }

  // Reset monthly usage on successful payment
  organization.usage.aiCallsThisMonth = 0;
  organization.usage.lastUsageUpdate = new Date();
  await organization.save();

  console.log(`Stripe invoice paid: ${invoice.id}`);
}

/**
 * Handle Stripe invoice.payment_failed
 */
async function handleStripeInvoicePaymentFailed(invoice) {
  const organization = await Organization.findOne({ stripeCustomerId: invoice.customer });

  if (!organization) return;

  organization.subscriptionStatus = 'past_due';
  await organization.save();

  // Update subscription record
  await Subscription.findOneAndUpdate(
    { organizationId: organization._id },
    { status: 'past_due' }
  );

  // Record failed invoice
  const subscription = await Subscription.findOne({ organizationId: organization._id });
  if (subscription) {
    await subscription.addInvoice({
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'open',
      errorMessage: invoice.last_finalization_error?.message || 'Payment failed'
    });
  }

  console.log(`Stripe payment failed for organization: ${organization._id}`);
}

/**
 * Handle Stripe payment_method.attached
 */
async function handleStripePaymentMethodAttached(paymentMethod) {
  // Find organization by customer ID
  const organization = await Organization.findOne({ stripeCustomerId: paymentMethod.customer });

  if (!organization) return;

  // Store payment method info
  const subscription = await Subscription.findOne({ organizationId: organization._id });

  if (subscription) {
    subscription.paymentMethod = {
      type: paymentMethod.type,
      last4: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
      expiryMonth: paymentMethod.card?.exp_month,
      expiryYear: paymentMethod.card?.exp_year
    };
    await subscription.save();
  }

  console.log(`Stripe payment method attached for organization: ${organization._id}`);
}

// ============================================
// Razorpay Event Handlers
// ============================================

/**
 * Handle Razorpay order.paid
 */
async function handleRazorpayOrderPaid(order) {
  const organizationId = order.notes?.organizationId;
  const planSlug = order.notes?.plan;
  const billingPeriod = order.notes?.billingPeriod || 'monthly';

  if (!organizationId) {
    console.log('No organizationId in order');
    return;
  }

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    console.log(`Organization not found: ${organizationId}`);
    return;
  }

  const plan = await Plan.findOne({ slug: planSlug });
  if (!plan) {
    console.log(`Plan not found: ${planSlug}`);
    return;
  }

  // Update organization
  organization.razorpayPaymentId = order.id;
  organization.subscriptionStatus = 'active';
  organization.subscriptionProvider = 'razorpay';
  organization.plan = planSlug;
  organization.planName = plan.name;
  organization.planLimits = plan.limits;
  organization.features = plan.features;
  await organization.save();

  // Create subscription record
  await Subscription.findOneAndUpdate(
    { organizationId },
    {
      organizationId,
      provider: 'razorpay',
      razorpayPaymentId: order.id,
      razorpayCustomerId: organization.razorpayCustomerId,
      plan: planSlug,
      planName: plan.name,
      planLimits: plan.limits,
      features: plan.features,
      billingPeriod,
      amount: order.amount,
      currency: order.currency,
      status: 'active'
    },
    { upsert: true, new: true }
  );

  console.log(`Razorpay order paid for organization: ${organizationId}`);
}

/**
 * Handle Razorpay subscription.created
 */
async function handleRazorpaySubscriptionCreated(subscription) {
  const organizationId = subscription.notes?.organizationId;

  if (!organizationId) return;

  const organization = await Organization.findById(organizationId);
  if (!organization) return;

  organization.razorpaySubscriptionId = subscription.id;
  organization.subscriptionStatus = subscription.status === 'active' ? 'active' : 'incomplete';
  organization.currentPeriodStart = new Date(subscription.current_start * 1000);
  organization.currentPeriodEnd = new Date(subscription.current_end * 1000);
  await organization.save();

  console.log(`Razorpay subscription created: ${subscription.id}`);
}

/**
 * Handle Razorpay subscription.updated
 */
async function handleRazorpaySubscriptionUpdated(subscription) {
  let organization = await Organization.findById(subscription.notes?.organizationId);
  if (!organization) {
    organization = await Organization.findOne({ razorpaySubscriptionId: subscription.id });
  }

  if (!organization) return;

  const statusMap = {
    'active': 'active',
    'created': 'incomplete',
    'authenticated': 'active',
    'pending': 'incomplete',
    'halted': 'paused',
    'cancelled': 'canceled',
    'completed': 'canceled',
    'expired': 'expired'
  };

  organization.subscriptionStatus = statusMap[subscription.status] || subscription.status;
  organization.currentPeriodStart = new Date(subscription.current_start * 1000);
  organization.currentPeriodEnd = new Date(subscription.current_end * 1000);
  await organization.save();

  // Update subscription record
  await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: subscription.id },
    {
      status: organization.subscriptionStatus,
      currentPeriodStart: organization.currentPeriodStart,
      currentPeriodEnd: organization.currentPeriodEnd
    }
  );

  console.log(`Razorpay subscription updated: ${subscription.id}`);
}

/**
 * Handle Razorpay subscription.cancelled
 */
async function handleRazorpaySubscriptionCancelled(subscription) {
  const organization = await Organization.findOne({ razorpaySubscriptionId: subscription.id });

  if (!organization) return;

  // Update to free plan
  const freePlan = await Plan.findOne({ tier: 'free' }) || await Plan.getDefaultPlan();

  organization.subscriptionStatus = 'canceled';
  organization.razorpaySubscriptionId = null;
  organization.canceledAt = new Date();

  if (freePlan) {
    organization.plan = freePlan.slug;
    organization.planName = freePlan.name;
    organization.planLimits = freePlan.limits;
    organization.features = freePlan.features;
  }

  await organization.save();

  // Update subscription record
  await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: subscription.id },
    { status: 'canceled', canceledAt: new Date() }
  );

  console.log(`Razorpay subscription cancelled: ${subscription.id}`);
}

/**
 * Handle Razorpay payment.authorized
 */
async function handleRazorpayPaymentAuthorized(payment) {
  const organization = await Organization.findOne({ razorpayCustomerId: payment.customer_id });

  if (!organization) return;

  // Update subscription status
  organization.subscriptionStatus = 'active';
  await organization.save();

  // Reset monthly usage
  organization.usage.aiCallsThisMonth = 0;
  organization.usage.lastUsageUpdate = new Date();
  await organization.save();

  console.log(`Razorpay payment authorized for organization: ${organization._id}`);
}

/**
 * Handle Razorpay payment.failed
 */
async function handleRazorpayPaymentFailed(payment) {
  const organization = await Organization.findOne({ razorpayCustomerId: payment.customer_id });

  if (!organization) return;

  organization.subscriptionStatus = 'past_due';
  await organization.save();

  console.log(`Razorpay payment failed for organization: ${organization._id}`);
}

/**
 * Handle Razorpay invoice.paid
 */
async function handleRazorpayInvoicePaid(invoice) {
  const organization = await Organization.findOne({ razorpayCustomerId: invoice.customer_id });

  if (!organization) return;

  const subscription = await Subscription.findOne({ organizationId: organization._id });

  if (subscription) {
    await subscription.addInvoice({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      currency: invoice.currency,
      status: 'paid',
      paidAt: new Date(invoice.paid_at * 1000),
      invoiceUrl: invoice.short_url
    });
  }

  console.log(`Razorpay invoice paid: ${invoice.id}`);
}

module.exports = {
  handleStripeWebhook,
  handleRazorpayWebhook
};