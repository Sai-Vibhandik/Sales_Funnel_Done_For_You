const mongoose = require('mongoose');

/**
 * Plan Model
 *
 * Dynamic pricing plans that can be created/modified by admin.
 * Supports both Stripe and Razorpay plan configurations.
 */

const planSchema = new mongoose.Schema({
  // Plan Identification
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [50, 'Plan name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Plan Tier (optional - for internal categorization)
  tier: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'starter'
  },

  // Pricing - Monthly
  monthlyPrice: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  monthlyStripePriceId: {
    type: String,
    sparse: true
  },
  monthlyRazorpayPlanId: {
    type: String,
    sparse: true
  },

  // Pricing - Yearly (with discount)
  yearlyPrice: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  yearlyDiscount: {
    type: Number, // Percentage discount
    min: 0,
    max: 100
  },
  yearlyStripePriceId: {
    type: String,
    sparse: true
  },
  yearlyRazorpayPlanId: {
    type: String,
    sparse: true
  },

  // Currency
  currency: {
    code: { type: String, default: 'INR' },
    symbol: { type: String, default: '₹' }
  },

  // Limits
  limits: {
    maxUsers: { type: Number, default: 3 },
    maxProjects: { type: Number, default: 3 },
    maxLandingPages: { type: Number, default: 5 },
    maxLandingPagesPerProject: { type: Number, default: 5 },
    storageLimitMB: { type: Number, default: 1024 }, // 1GB
    aiCallsPerMonth: { type: Number, default: 50 },
    customDomains: { type: Number, default: 0 }
  },

  // Features
  features: {
    analytics: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false },
    exportData: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    sso: { type: Boolean, default: false },
    advancedReports: { type: Boolean, default: false },
    teamRoles: { type: Boolean, default: false },
    auditLogs: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    dedicatedSupport: { type: Boolean, default: false },
    sla: { type: Boolean, default: false },
    dataRetention: { type: Number, default: 90 }, // days
    backupFrequency: { type: String, default: 'daily' }, // 'hourly', 'daily', 'weekly'
    maxApiCalls: { type: Number, default: 1000 },
    maxTeamMembers: { type: Number, default: 10 }
  },

  // Feature list for display (user-friendly descriptions)
  featureList: [{
    icon: String,
    text: String,
    highlighted: { type: Boolean, default: false }
  }],

  // Trial Settings
  trialDays: {
    type: Number,
    default: 0,
    min: 0,
    max: 365
  },

  // Plan Status
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true // If false, only admin can assign
  },
  isDefault: {
    type: Boolean,
    default: false // Default plan for new signups
  },
  sortOrder: {
    type: Number,
    default: 0
  },

  // Display Settings
  highlightColor: {
    type: String,
    default: '#6366f1'
  },
  badge: {
    text: String, // e.g., "Most Popular", "Best Value"
    color: String
  },

  // Upgrade/Downgrade Rules
  upgradeFrom: [{
    type: String, // Tier slug
  }],
  downgradeTo: [{
    type: String, // Tier slug
  }],

  // Stripe Product ID
  stripeProductId: {
    type: String,
    sparse: true
  },

  // Razorpay Product ID
  razorpayProductId: {
    type: String,
    sparse: true
  },

  // Admin Only
  internalNotes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },

  // Usage Statistics (computed periodically)
  stats: {
    activeSubscribers: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 }, // in cents
    churnRate: { type: Number, default: 0 },
    avgLifetimeValue: { type: Number, default: 0 },
    lastStatsUpdate: { type: Date }
  },

  // Created/Updated By
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
// Note: slug already has unique: true in schema definition
planSchema.index({ tier: 1, isActive: 1 });
planSchema.index({ isPublic: 1, isActive: 1 });
planSchema.index({ sortOrder: 1 });

// Generate slug before saving
planSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Calculate yearly discount if not set
  if (this.monthlyPrice > 0 && this.yearlyPrice > 0) {
    const yearlyAtMonthly = this.monthlyPrice * 12;
    const savings = yearlyAtMonthly - this.yearlyPrice;
    this.yearlyDiscount = Math.round((savings / yearlyAtMonthly) * 100);
  }

  next();
});

// Static method to get all active public plans
planSchema.statics.getPublicPlans = async function() {
  return this.find({
    isActive: true,
    isPublic: true
  }).sort({ sortOrder: 1 });
};

// Static method to get default plan
planSchema.statics.getDefaultPlan = async function() {
  return this.findOne({
    isDefault: true,
    isActive: true
  });
};

// Static method to get plan by tier
planSchema.statics.getByTier = async function(tier) {
  return this.findOne({
    tier: tier,
    isActive: true
  });
};

// Method to calculate proration for plan change
planSchema.methods.calculateProration = function(currentPlan, daysRemaining, billingPeriod) {
  const currentMonthly = currentPlan.monthlyPrice;
  const newMonthly = this.monthlyPrice;
  const daysInMonth = 30; // Approximate

  if (billingPeriod === 'yearly') {
    // For yearly, calculate based on yearly prices
    const currentYearly = currentPlan.yearlyPrice || currentPlan.monthlyPrice * 12;
    const newYearly = this.yearlyPrice || this.monthlyPrice * 12;
    const remainingYears = daysRemaining / 365;

    return {
      credit: Math.round(currentYearly * remainingYears),
      charge: Math.round(newYearly * remainingYears),
      net: Math.round((newYearly - currentYearly) * remainingYears)
    };
  }

  // For monthly
  const credit = Math.round((currentMonthly / daysInMonth) * daysRemaining);
  const charge = Math.round((newMonthly / daysInMonth) * daysRemaining);

  return {
    credit,
    charge,
    net: charge - credit // Positive = user pays more, Negative = user gets credit
  };
};

// Method to check if plan supports feature
planSchema.methods.supportsFeature = function(featureName) {
  return this.features && this.features[featureName] === true;
};

// Method to check if limit is exceeded
planSchema.methods.isLimitExceeded = function(limitType, currentCount) {
  const limit = this.limits && this.limits[limitType];
  if (limit === undefined || limit === null) return false;
  if (limit === -1) return false; // -1 means unlimited
  return currentCount >= limit;
};

// Method to get price for billing period
planSchema.methods.getPriceForPeriod = function(period) {
  if (period === 'yearly' && this.yearlyPrice) {
    return {
      amount: this.yearlyPrice,
      discount: this.yearlyDiscount || 0,
      monthlyEquivalent: Math.round(this.yearlyPrice / 12)
    };
  }
  return {
    amount: this.monthlyPrice,
    discount: 0,
    monthlyEquivalent: this.monthlyPrice
  };
};

// Method to format feature list for display
planSchema.methods.formatFeatureList = function() {
  const features = [];

  // User limit
  if (this.limits.maxUsers === -1) {
    features.push({ text: 'Unlimited team members', highlighted: true });
  } else {
    features.push({ text: `Up to ${this.limits.maxUsers} team members` });
  }

  // Projects limit
  if (this.limits.maxProjects === -1) {
    features.push({ text: 'Unlimited projects', highlighted: true });
  } else {
    features.push({ text: `Up to ${this.limits.maxProjects} projects` });
  }

  // Storage
  if (this.limits.storageLimitMB >= 1024) {
    features.push({ text: `${this.limits.storageLimitMB / 1024}GB storage` });
  } else {
    features.push({ text: `${this.limits.storageLimitMB}MB storage` });
  }

  // Feature flags
  if (this.features.analytics) features.push({ text: 'Advanced analytics' });
  if (this.features.whiteLabel) features.push({ text: 'White-label branding', highlighted: true });
  if (this.features.prioritySupport) features.push({ text: 'Priority support' });
  if (this.features.customDomain) features.push({ text: 'Custom domain' });
  if (this.features.apiAccess) features.push({ text: 'API access' });
  if (this.features.sso) features.push({ text: 'SSO integration', highlighted: true });
  if (this.features.auditLogs) features.push({ text: 'Audit logs' });

  // Add custom features from featureList
  if (this.featureList && this.featureList.length > 0) {
    features.push(...this.featureList);
  }

  return features;
};

module.exports = mongoose.model('Plan', planSchema);