const mongoose = require('mongoose');

/**
 * Subscription Model
 *
 * Handles billing subscriptions for Stripe and Razorpay.
 * Tracks plan changes, payment history, and usage for billing.
 */

const subscriptionSchema = new mongoose.Schema({
  // Organization reference
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Payment Provider
  provider: {
    type: String,
    enum: ['stripe', 'razorpay', 'manual', 'none'],
    required: true
  },

  // Stripe Details
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  stripePriceId: String,
  stripePlanId: String,
  stripeProductId: String,

  // Razorpay Details
  razorpayCustomerId: String,
  razorpaySubscriptionId: String,
  razorpayPlanId: String,
  razorpayPaymentId: String,

  // Plan Information (copied from dynamic plans)
  plan: {
    type: String,
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  planLimits: {
    maxUsers: Number,
    maxProjects: Number,
    maxLandingPages: Number,
    maxLandingPagesPerProject: Number,
    storageLimitMB: Number,
    aiTokensPerMonth: Number,
    customDomains: Number
  },
  features: {
    analytics: Boolean,
    whiteLabel: Boolean,
    prioritySupport: Boolean,
    customDomain: Boolean,
    exportData: Boolean,
    apiAccess: Boolean,
    sso: Boolean,
    advancedReports: Boolean,
    teamRoles: Boolean,
    auditLogs: Boolean
  },

  // Billing Cycle
  billingPeriod: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },

  // Pricing (in cents/paise for precision)
  amount: {
    type: Number,
    required: true // Amount in smallest currency unit (cents/paise)
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },

  // Status
  status: {
    type: String,
    enum: [
      'active',
      'canceled',
      'past_due',
      'trialing',
      'incomplete',
      'unpaid',
      'paused',
      'expired'
    ],
    default: 'active'
  },

  // Important Dates
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  trialStart: Date,
  trialEnd: Date,
  canceledAt: Date,
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  pausedAt: Date,

  // Coupon/Discount
  discount: {
    couponId: String,
    couponCode: String,
    percentOff: Number,
    amountOff: Number,
    duration: String, // 'once', 'forever', 'repeating'
    durationInMonths: Number,
    validUntil: Date
  },

  // Usage Tracking (for metered billing)
  usage: {
    usersCount: { type: Number, default: 0 },
    projectsCount: { type: Number, default: 0 },
    storageUsedMB: { type: Number, default: 0 },
    apiCallsThisMonth: { type: Number, default: 0 },
    aiTokensUsed: { type: Number, default: 0 }, // AI tokens used this month
    lastUpdated: { type: Date, default: Date.now }
  },

  // Invoice/Payment History
  invoices: [{
    invoiceId: String,
    invoiceNumber: String,
    amount: Number,
    currency: String,
    status: {
      type: String,
      enum: ['draft', 'open', 'paid', 'void', 'uncollectible']
    },
    paidAt: Date,
    dueDate: Date,
    invoiceUrl: String,
    invoicePdf: String,
    attemptCount: { type: Number, default: 0 },
    errorMessage: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // Payment Method
  paymentMethod: {
    type: String,
    last4: String,
    brand: String, // 'visa', 'mastercard', etc.
    expiryMonth: Number,
    expiryYear: Number,
    bankName: String, // for Razorpay bank transfers
    upiId: String, // for Razorpay UPI
    walletType: String // 'paytm', 'phonepe', etc.
  },

  // Webhook Events
  events: [{
    eventId: String,
    eventType: String,
    provider: String,
    data: Object,
    processed: { type: Boolean, default: false },
    processedAt: Date,
    errorMessage: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // Plan Changes History
  planHistory: [{
    fromPlan: String,
    toPlan: String,
    changedAt: Date,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    prorationAmount: Number,
    invoiceId: String
  }],

  // Notes (admin notes)
  notes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],

  // Metadata
  metadata: {
    source: String, // 'web', 'api', 'admin'
    referrer: String,
    campaign: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ organizationId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });
subscriptionSchema.index({ razorpaySubscriptionId: 1 }, { sparse: true });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
subscriptionSchema.index({ provider: 1, status: 1 });

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  return ['active', 'trialing'].includes(this.status);
});

// Virtual for checking if in trial
subscriptionSchema.virtual('isTrial').get(function() {
  return this.status === 'trialing' && this.trialEnd && this.trialEnd > new Date();
});

// Virtual for days until renewal
subscriptionSchema.virtual('daysUntilRenewal').get(function() {
  if (!this.currentPeriodEnd) return null;
  const now = new Date();
  const end = new Date(this.currentPeriodEnd);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
});

// Method to check if subscription allows feature
subscriptionSchema.methods.hasFeature = function(featureName) {
  return this.features && this.features[featureName] === true;
};

// Method to check if limit is reached
subscriptionSchema.methods.isLimitReached = function(limitType) {
  const usage = this.usage || {};
  const limits = this.planLimits || {};

  switch (limitType) {
    case 'users':
      return limits.maxUsers !== -1 && usage.usersCount >= limits.maxUsers;
    case 'projects':
      return limits.maxProjects !== -1 && usage.projectsCount >= limits.maxProjects;
    case 'storage':
      return limits.storageLimitMB !== -1 && usage.storageUsedMB >= limits.storageLimitMB;
    case 'aiTokens':
      return limits.aiTokensPerMonth !== -1 && usage.aiTokensUsed >= limits.aiTokensPerMonth;
    default:
      return false;
  }
};

// Method to add event
subscriptionSchema.methods.addEvent = async function(eventData) {
  this.events.push({
    eventId: eventData.eventId,
    eventType: eventData.eventType,
    provider: eventData.provider || this.provider,
    data: eventData.data,
    processed: eventData.processed || false,
    processedAt: eventData.processedAt,
    errorMessage: eventData.errorMessage
  });

  return this.save();
};

// Method to add invoice
subscriptionSchema.methods.addInvoice = async function(invoiceData) {
  this.invoices.push({
    invoiceId: invoiceData.invoiceId,
    invoiceNumber: invoiceData.invoiceNumber,
    amount: invoiceData.amount,
    currency: invoiceData.currency,
    status: invoiceData.status,
    paidAt: invoiceData.paidAt,
    dueDate: invoiceData.dueDate,
    invoiceUrl: invoiceData.invoiceUrl,
    invoicePdf: invoiceData.invoicePdf,
    attemptCount: invoiceData.attemptCount || 0,
    errorMessage: invoiceData.errorMessage
  });

  return this.save();
};

// Method to record plan change
subscriptionSchema.methods.recordPlanChange = async function(changeData) {
  this.planHistory.push({
    fromPlan: changeData.fromPlan,
    toPlan: changeData.toPlan,
    changedAt: new Date(),
    changedBy: changeData.changedBy,
    reason: changeData.reason,
    prorationAmount: changeData.prorationAmount,
    invoiceId: changeData.invoiceId
  });

  return this.save();
};

// Static method to get active subscription for organization
subscriptionSchema.statics.getActiveForOrganization = async function(organizationId) {
  return this.findOne({
    organizationId,
    status: { $in: ['active', 'trialing'] }
  });
};

// Static method to get expiring soon subscriptions
subscriptionSchema.statics.getExpiringSoon = async function(days = 7) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);

  return this.find({
    status: 'active',
    currentPeriodEnd: { $lte: targetDate },
    cancelAtPeriodEnd: false
  });
};

// Static method to get overdue subscriptions
subscriptionSchema.statics.getOverdue = async function() {
  return this.find({
    status: 'past_due'
  });
};

module.exports = mongoose.model('Subscription', subscriptionSchema);