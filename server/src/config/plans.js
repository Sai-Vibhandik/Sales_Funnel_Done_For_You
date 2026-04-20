/**
 * Plans Configuration
 *
 * IMPORTANT: This file is ONLY for seeding default plans.
 * At runtime, all plan data should be fetched from the database (Plan model).
 *
 * Platform Admins can create/edit/delete plans through the UI.
 * Changes made through the UI are immediately reflected.
 *
 * Default plans seeded on first run.
 * Structure:
 * - tier: Plan tier identifier
 * - name: Display name
 * - limits: Resource limits
 * - features: Feature flags
 * - pricing: Stripe/Razorpay price IDs
 */

// Default plans seeded on first install
// These are ONLY used for seeding - runtime uses database
const DEFAULT_PLANS = [
  {
    name: 'Free',
    slug: 'free',
    tier: 'free',
    description: 'Perfect for trying out the platform',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: { code: 'USD', symbol: '$' },
    trialDays: 0,
    limits: {
      maxUsers: 3,
      maxProjects: 3,
      maxLandingPages: 5,
      maxLandingPagesPerProject: 5,
      storageLimitMB: 1024, // 1GB
      aiCallsPerMonth: 50,
      customDomains: 0
    },
    features: {
      analytics: false,
      whiteLabel: false,
      prioritySupport: false,
      customDomain: false,
      exportData: false,
      apiAccess: false,
      sso: false,
      advancedReports: false,
      teamRoles: false,
      auditLogs: false,
      customBranding: false,
      dedicatedSupport: false,
      sla: false,
      dataRetention: 30,
      backupFrequency: 'weekly',
      maxApiCalls: 1000,
      maxTeamMembers: 3
    },
    featureList: [
      { text: 'Up to 3 team members' },
      { text: 'Up to 3 projects' },
      { text: '5 landing pages per project' },
      { text: '1GB storage' },
      { text: '50 AI generations/month' },
      { text: 'Basic support' }
    ],
    isActive: true,
    isPublic: true,
    isDefault: true,
    sortOrder: 1,
    highlightColor: '#6b7280'
  },
  {
    name: 'Starter',
    slug: 'starter',
    tier: 'starter',
    description: 'Great for small teams getting started',
    monthlyPrice: 2900, // $29.00 in cents
    yearlyPrice: 29000, // $290/year (~$24/month)
    currency: { code: 'USD', symbol: '$' },
    trialDays: 14,
    limits: {
      maxUsers: 5,
      maxProjects: 10,
      maxLandingPages: 20,
      maxLandingPagesPerProject: 10,
      storageLimitMB: 5120, // 5GB
      aiCallsPerMonth: 200,
      customDomains: 1
    },
    features: {
      analytics: true,
      whiteLabel: false,
      prioritySupport: false,
      customDomain: true,
      exportData: true,
      apiAccess: false,
      sso: false,
      advancedReports: false,
      teamRoles: true,
      auditLogs: false,
      customBranding: false,
      dedicatedSupport: false,
      sla: false,
      dataRetention: 60,
      backupFrequency: 'daily',
      maxApiCalls: 5000,
      maxTeamMembers: 5
    },
    featureList: [
      { text: 'Up to 5 team members' },
      { text: 'Up to 10 projects' },
      { text: '20 landing pages' },
      { text: '5GB storage' },
      { text: '200 AI generations/month' },
      { text: '1 custom domain' },
      { text: 'Basic analytics', highlighted: true },
      { text: 'Export data' }
    ],
    isActive: true,
    isPublic: true,
    isDefault: false,
    sortOrder: 2,
    highlightColor: '#3b82f6',
    badge: { text: 'Popular', color: '#3b82f6' }
  },
  {
    name: 'Pro',
    slug: 'pro',
    tier: 'pro',
    description: 'For growing teams and agencies',
    monthlyPrice: 9900, // $99.00
    yearlyPrice: 99000, // $990/year (~$82.50/month, ~17% savings)
    currency: { code: 'USD', symbol: '$' },
    trialDays: 14,
    limits: {
      maxUsers: 20,
      maxProjects: 50,
      maxLandingPages: 100,
      maxLandingPagesPerProject: 20,
      storageLimitMB: 20480, // 20GB
      aiCallsPerMonth: 1000,
      customDomains: 5
    },
    features: {
      analytics: true,
      whiteLabel: false,
      prioritySupport: true,
      customDomain: true,
      exportData: true,
      apiAccess: true,
      sso: false,
      advancedReports: true,
      teamRoles: true,
      auditLogs: true,
      customBranding: true,
      dedicatedSupport: false,
      sla: false,
      dataRetention: 180,
      backupFrequency: 'daily',
      maxApiCalls: 50000,
      maxTeamMembers: 20
    },
    featureList: [
      { text: 'Up to 20 team members' },
      { text: 'Up to 50 projects' },
      { text: '100 landing pages' },
      { text: '20GB storage' },
      { text: '1000 AI generations/month' },
      { text: '5 custom domains' },
      { text: 'Advanced analytics', highlighted: true },
      { text: 'API access', highlighted: true },
      { text: 'Priority support' },
      { text: 'Audit logs' },
      { text: 'Custom branding' }
    ],
    isActive: true,
    isPublic: true,
    isDefault: false,
    sortOrder: 3,
    highlightColor: '#8b5cf6',
    badge: { text: 'Best Value', color: '#8b5cf6' }
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    tier: 'enterprise',
    description: 'For large organizations with custom needs',
    monthlyPrice: 29900, // $299.00
    yearlyPrice: 299000, // $2990/year (~$249/month, ~17% savings)
    currency: { code: 'USD', symbol: '$' },
    trialDays: 30,
    limits: {
      maxUsers: -1, // Unlimited
      maxProjects: -1, // Unlimited
      maxLandingPages: -1, // Unlimited
      maxLandingPagesPerProject: -1, // Unlimited
      storageLimitMB: 102400, // 100GB
      aiCallsPerMonth: -1, // Unlimited
      customDomains: -1 // Unlimited
    },
    features: {
      analytics: true,
      whiteLabel: true,
      prioritySupport: true,
      customDomain: true,
      exportData: true,
      apiAccess: true,
      sso: true,
      advancedReports: true,
      teamRoles: true,
      auditLogs: true,
      customBranding: true,
      dedicatedSupport: true,
      sla: true,
      dataRetention: 365,
      backupFrequency: 'hourly',
      maxApiCalls: -1, // Unlimited
      maxTeamMembers: -1 // Unlimited
    },
    featureList: [
      { text: 'Unlimited team members', highlighted: true },
      { text: 'Unlimited projects', highlighted: true },
      { text: 'Unlimited landing pages', highlighted: true },
      { text: '100GB storage' },
      { text: 'Unlimited AI generations', highlighted: true },
      { text: 'Unlimited custom domains' },
      { text: 'White-label branding', highlighted: true },
      { text: 'SSO integration', highlighted: true },
      { text: 'Dedicated account manager' },
      { text: 'SLA guarantee' },
      { text: 'Hourly backups' },
      { text: '1 year data retention' }
    ],
    isActive: true,
    isPublic: true,
    isDefault: false,
    sortOrder: 4,
    highlightColor: '#f59e0b',
    badge: { text: 'Enterprise', color: '#f59e0b' }
  }
];

// Currency configuration for Stripe and Razorpay
const CURRENCIES = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    stripeSupported: true,
    razorpaySupported: false
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    stripeSupported: true,
    razorpaySupported: true
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    stripeSupported: true,
    razorpaySupported: false
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    stripeSupported: true,
    razorpaySupported: false
  }
};

// Billing period display names
const BILLING_PERIODS = {
  monthly: {
    name: 'Monthly',
    discount: 0,
    description: 'Billed monthly'
  },
  yearly: {
    name: 'Yearly',
    discount: 17, // Approximate yearly discount
    description: 'Billed annually (Save ~17%)'
  }
};

// Plan upgrade/downgrade rules
const PLAN_TRANSITIONS = {
  free: {
    canUpgradeTo: ['starter', 'pro', 'enterprise'],
    canDowngradeTo: []
  },
  starter: {
    canUpgradeTo: ['pro', 'enterprise'],
    canDowngradeTo: ['free']
  },
  pro: {
    canUpgradeTo: ['enterprise'],
    canDowngradeTo: ['free', 'starter']
  },
  enterprise: {
    canUpgradeTo: [],
    canDowngradeTo: ['free', 'starter', 'pro']
  }
};

// Get plan limits for a tier
const getPlanLimits = (tier) => {
  const plan = DEFAULT_PLANS.find(p => p.tier === tier);
  return plan ? plan.limits : DEFAULT_PLANS[0].limits;
};

// Get plan features for a tier
const getPlanFeatures = (tier) => {
  const plan = DEFAULT_PLANS.find(p => p.tier === tier);
  return plan ? plan.features : DEFAULT_PLANS[0].features;
};

// Calculate proration for plan change
const calculateProration = (currentPlan, newPlan, daysRemaining, billingPeriod) => {
  const currentPrice = billingPeriod === 'yearly'
    ? currentPlan.yearlyPrice
    : currentPlan.monthlyPrice;

  const newPrice = billingPeriod === 'yearly'
    ? newPlan.yearlyPrice
    : newPlan.monthlyPrice;

  const daysInPeriod = billingPeriod === 'yearly' ? 365 : 30;

  const credit = Math.round((currentPrice / daysInPeriod) * daysRemaining);
  const charge = Math.round((newPrice / daysInPeriod) * daysRemaining);
  const net = charge - credit;

  return {
    credit,
    charge,
    net,
    daysRemaining,
    billingPeriod
  };
};

// Check if transition is allowed
const isTransitionAllowed = (fromTier, toTier) => {
  const transitions = PLAN_TRANSITIONS[fromTier];
  if (!transitions) return false;

  return transitions.canUpgradeTo.includes(toTier) ||
         transitions.canDowngradeTo.includes(toTier);
};

// Get upgrade/downgrade type
const getTransitionType = (fromTier, toTier) => {
  const tiers = ['free', 'starter', 'pro', 'enterprise'];
  const fromIndex = tiers.indexOf(fromTier);
  const toIndex = tiers.indexOf(toTier);

  if (toIndex > fromIndex) return 'upgrade';
  if (toIndex < fromIndex) return 'downgrade';
  return 'same';
};

module.exports = {
  DEFAULT_PLANS,
  CURRENCIES,
  BILLING_PERIODS,
  PLAN_TRANSITIONS,
  getPlanLimits,
  getPlanFeatures,
  calculateProration,
  isTransitionAllowed,
  getTransitionType
};