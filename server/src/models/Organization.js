const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  logo: {
    type: String,
    default: null
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Plan & Billing (Dynamic - set by admin)
  plan: {
    type: String,
    default: 'Free'
  },
  planName: {
    type: String,
    default: 'Free Plan'
  },
  planLimits: {
    maxUsers: { type: Number, default: 3 },
    maxProjects: { type: Number, default: 3 },
    maxLandingPages: { type: Number, default: 5 },
    maxLandingPagesPerProject: { type: Number, default: 5 },
    storageLimitMB: { type: Number, default: 1024 }, // 1GB
    aiTokensPerMonth: { type: Number, default: 10000 }, // AI token limit per month
    customDomains: { type: Number, default: 0 }
  },
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
    auditLogs: { type: Boolean, default: false }
  },

  // Stripe Integration
  stripeCustomerId: {
    type: String,
    sparse: true,
    unique: true
  },
  stripeSubscriptionId: {
    type: String,
    sparse: true
  },
  stripePriceId: {
    type: String
  },

  // Razorpay Integration
  razorpayCustomerId: {
    type: String,
    sparse: true,
    unique: true
  },
  razorpaySubscriptionId: {
    type: String,
    sparse: true
  },
  razorpayPlanId: {
    type: String
  },

  // Subscription Status
  subscriptionStatus: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'unpaid', 'paused'],
    default: 'active'
  },
  subscriptionProvider: {
    type: String,
    enum: ['stripe', 'razorpay', 'manual', 'none'],
    default: 'none'
  },
  trialEndsAt: {
    type: Date
  },
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },
  canceledAt: {
    type: Date
  },

  // Usage Tracking (for billing)
  usage: {
    usersCount: { type: Number, default: 0 },
    projectsCount: { type: Number, default: 0 },
    landingPagesCount: { type: Number, default: 0 },
    storageUsedMB: { type: Number, default: 0 },
    aiTokensUsed: { type: Number, default: 0 }, // AI tokens used this month
    lastUsageUpdate: { type: Date, default: Date.now },
    lastTokenReset: { type: Date, default: Date.now } // When tokens were last reset
  },

  // Settings
  settings: {
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
  
    aiProvider: { type: String, default: 'gemini' },
    weekStartsOn: { type: Number, default: 0 }, // 0 = Sunday
    branding: {
      primaryColor: { type: String, default: '#6366f1' },
      secondaryColor: { type: String, default: '#4f46e5' },
      logo: String,
      favicon: String,
      customDomain: String,
      customDomainVerified: { type: Boolean, default: false }
    },
    notifications: {
      emailOnNewMember: { type: Boolean, default: true },
      emailOnProjectUpdate: { type: Boolean, default: true },
      emailOnTaskAssignment: { type: Boolean, default: true },
      emailOnTaskCompletion: { type: Boolean, default: true },
      emailWeeklySummary: { type: Boolean, default: true }
    }
  },

  // Owner reference
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspendedReason: {
    type: String
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Note: Slug is generated in the controller, not here
// The controller ensures unique slugs using timestamp + random + nanoseconds

// Update usage statistics
organizationSchema.methods.updateUsage = async function() {
  const Membership = mongoose.model('Membership');
  const Project = mongoose.model('Project');

  const [usersCount, projectsCount] = await Promise.all([
    Membership.countDocuments({
      organizationId: this._id,
      status: 'active'
    }),
    Project.countDocuments({ organizationId: this._id })
  ]);

  this.usage.usersCount = usersCount;
  this.usage.projectsCount = projectsCount;
  this.usage.lastUsageUpdate = new Date();

  return this.save();
};

// Check if organization has reached a limit
organizationSchema.methods.hasReachedLimit = function(limitType) {
  const limits = this.planLimits;
  const usage = this.usage;

 switch (limitType) {
  case 'users': {
    const limit = limits.maxUsers;
    if (limit === -1) return false;
    return (usage.usersCount || 0) >= limit;
  }

  case 'projects': {
    const limit = limits.maxProjects;
    if (limit === -1) return false;
    return (usage.projectsCount || 0) >= limit;
  }

  case 'landingPages': {
    const limit = limits.maxLandingPages;
    if (limit === -1) return false;
    return (usage.landingPagesCount || 0) >= limit;
  }

  case 'storage': {
    const limit = limits.storageLimitMB;
    if (limit === -1) return false;
    return (usage.storageUsedMB || 0) >= limit;
  }

  case 'aiTokens': {
    const limit = limits.aiTokensPerMonth;
    if (limit === -1) return false;
    return (usage.aiTokensUsed || 0) >= limit;
  }

  default:
    return false;
}
};

// Check if feature is enabled
organizationSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] === true;
};

// Static method to find by slug
organizationSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

// Static method to find user's organizations
organizationSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.userId': userId }
    ],
    isActive: true
  });
};

// Indexes
// Note: stripeCustomerId and razorpayCustomerId already have unique: true in schema definition
organizationSchema.index({ owner: 1 });
organizationSchema.index({ isActive: 1, isSuspended: 1 });
organizationSchema.index({ 'subscriptionStatus': 1, 'currentPeriodEnd': 1 });

module.exports = mongoose.model('Organization', organizationSchema);