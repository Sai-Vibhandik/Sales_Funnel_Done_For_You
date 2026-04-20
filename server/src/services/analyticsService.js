/**
 * Analytics Service
 *
 * Handles revenue analytics, MRR/ARR calculations, churn tracking,
 * and platform-wide usage metrics for platform admins.
 */

const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

/**
 * Analytics Service
 */
const AnalyticsService = {
  /**
   * Calculate Monthly Recurring Revenue (MRR)
   * @param {Date} date - Date to calculate for (default: now)
   */
  async calculateMRR(date = new Date()) {
    try {
      // Get all active subscriptions
      const activeSubscriptions = await Subscription.find({
        status: { $in: ['active', 'trialing'] }
      });

      // Get all organizations with active subscriptions
      const organizations = await Organization.find({
        subscriptionStatus: { $in: ['active', 'trialing'] }
      });

      let mrr = 0;
      const planBreakdown = {};

      for (const org of organizations) {
        const plan = await Plan.findOne({ slug: org.plan });
        if (!plan) continue;

        // Determine monthly value
        let monthlyValue = 0;
        const subscription = activeSubscriptions.find(s => s.organizationId.toString() === org._id.toString());

        if (subscription) {
          if (subscription.billingPeriod === 'yearly') {
            monthlyValue = (plan.yearlyPrice || plan.monthlyPrice * 12) / 12;
          } else {
            monthlyValue = plan.monthlyPrice;
          }
        } else {
          // Default to monthly price
          monthlyValue = plan.monthlyPrice;
        }

        // Convert to cents if needed (assuming prices are in cents)
        mrr += monthlyValue;

        // Track by plan
        if (!planBreakdown[plan.slug]) {
          planBreakdown[plan.slug] = {
            planName: plan.name,
            count: 0,
            mrr: 0
          };
        }
        planBreakdown[plan.slug].count++;
        planBreakdown[plan.slug].mrr += monthlyValue;
      }

      return {
        mrr: Math.round(mrr),
        mrrFormatted: formatCurrency(mrr),
        planBreakdown,
        totalSubscribers: organizations.length,
        calculatedAt: date
      };
    } catch (error) {
      console.error('Calculate MRR error:', error);
      throw error;
    }
  },

  /**
   * Calculate Annual Recurring Revenue (ARR)
   * @param {Date} date - Date to calculate for (default: now)
   */
  async calculateARR(date = new Date()) {
    try {
      const mrr = await this.calculateMRR(date);
      const arr = mrr.mrr * 12;

      return {
        arr: Math.round(arr),
        arrFormatted: formatCurrency(arr),
        mrr: mrr.mrr,
        mrrFormatted: mrr.mrrFormatted,
        planBreakdown: mrr.planBreakdown,
        totalSubscribers: mrr.totalSubscribers,
        calculatedAt: date
      };
    } catch (error) {
      console.error('Calculate ARR error:', error);
      throw error;
    }
  },

  /**
   * Calculate churn rate
   * @param {number} months - Number of months to look back
   */
  async calculateChurnRate(months = 3) {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

      // Get churned subscriptions in the period
      const churned = await Subscription.find({
        status: 'canceled',
        canceledAt: { $gte: startDate, $lte: now }
      });

      // Get total subscriptions at start of period
      const totalAtStart = await Subscription.countDocuments({
        createdAt: { $lt: startDate },
        status: { $in: ['active', 'canceled'] }
      });

      // Calculate churn rate
      const churnRate = totalAtStart > 0 ? (churned.length / totalAtStart) * 100 : 0;

      // Get new subscriptions in period
      const newSubscriptions = await Subscription.countDocuments({
        createdAt: { $gte: startDate, $lte: now },
        status: 'active'
      });

      // Calculate net growth
      const netGrowth = newSubscriptions - churned.length;
      const growthRate = totalAtStart > 0 ? (netGrowth / totalAtStart) * 100 : 0;

      return {
        churnRate: Math.round(churnRate * 100) / 100,
        churnedCount: churned.length,
        totalAtStart,
        newSubscriptions,
        netGrowth,
        growthRate: Math.round(growthRate * 100) / 100,
        period: {
          start: startDate,
          end: now,
          months
        }
      };
    } catch (error) {
      console.error('Calculate churn rate error:', error);
      throw error;
    }
  },

  /**
   * Get revenue by plan tier
   */
  async getRevenueByPlan() {
    try {
      const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });

      const revenueByPlan = await Promise.all(
        plans.map(async (plan) => {
          const subscribers = await Organization.countDocuments({
            plan: plan.slug,
            subscriptionStatus: { $in: ['active', 'trialing'] }
          });

          const monthlyRevenue = subscribers * plan.monthlyPrice;
          const yearlySubscribers = await Subscription.countDocuments({
            plan: plan.slug,
            billingPeriod: 'yearly',
            status: { $in: ['active', 'trialing'] }
          });

          const yearlyRevenue = yearlySubscribers * (plan.yearlyPrice || plan.monthlyPrice * 12);
          const totalMRR = monthlyRevenue + (yearlyRevenue / 12);

          return {
            plan: {
              id: plan._id,
              name: plan.name,
              slug: plan.slug,
              tier: plan.tier,
              monthlyPrice: plan.monthlyPrice,
              yearlyPrice: plan.yearlyPrice
            },
            subscribers,
            yearlySubscribers,
            monthlyRevenue: Math.round(monthlyRevenue),
            yearlyRevenue: Math.round(yearlyRevenue),
            totalMRR: Math.round(totalMRR),
            percentageOfTotal: 0 // Will be calculated after
          };
        })
      );

      // Calculate percentages
      const totalMRR = revenueByPlan.reduce((sum, p) => sum + p.totalMRR, 0);
      revenueByPlan.forEach(p => {
        p.percentageOfTotal = totalMRR > 0
          ? Math.round((p.totalMRR / totalMRR) * 100)
          : 0;
      });

      return {
        plans: revenueByPlan,
        totalMRR: Math.round(totalMRR),
        totalMRRFormatted: formatCurrency(totalMRR)
      };
    } catch (error) {
      console.error('Get revenue by plan error:', error);
      throw error;
    }
  },

  /**
   * Calculate customer lifetime value
   */
  async calculateCustomerLifetimeValue() {
    try {
      // Get all completed (churned) subscriptions
      const churnedSubscriptions = await Subscription.find({
        status: 'canceled',
        canceledAt: { $exists: true }
      });

      if (churnedSubscriptions.length === 0) {
        return {
          averageLTV: 0,
          medianLTV: 0,
          averageLifespan: 0,
          sampleSize: 0
        };
      }

      // Calculate lifespan and value for each churned subscription
      const lifespans = [];
      const values = [];

      for (const sub of churnedSubscriptions) {
        const start = sub.createdAt;
        const end = sub.canceledAt;
        const lifespanMs = end - start;
        const lifespanDays = lifespanMs / (1000 * 60 * 60 * 24);

        lifespans.push(lifespanDays);

        // Calculate total revenue
        const plan = await Plan.findOne({ slug: sub.plan });
        if (plan) {
          const monthlyValue = sub.billingPeriod === 'yearly'
            ? (plan.yearlyPrice || plan.monthlyPrice * 12) / 12
            : plan.monthlyPrice;
          const totalValue = (lifespanDays / 30) * monthlyValue;
          values.push(totalValue);
        }
      }

      // Calculate averages
      const avgLifespan = lifespans.reduce((a, b) => a + b, 0) / lifespans.length;
      const avgLTV = values.reduce((a, b) => a + b, 0) / values.length;

      // Calculate median
      const sortedValues = [...values].sort((a, b) => a - b);
      const medianLTV = sortedValues.length % 2 === 0
        ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
        : sortedValues[Math.floor(sortedValues.length / 2)];

      return {
        averageLTV: Math.round(avgLTV),
        medianLTV: Math.round(medianLTV),
        averageLifespan: Math.round(avgLifespan),
        averageLifespanMonths: Math.round(avgLifespan / 30 * 10) / 10,
        sampleSize: churnedSubscriptions.length
      };
    } catch (error) {
      console.error('Calculate LTV error:', error);
      throw error;
    }
  },

  /**
   * Get platform-wide usage metrics
   */
  async getPlatformUsage() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Total organizations
      const totalOrganizations = await Organization.countDocuments({ isActive: true });

      // Organizations by subscription status
      const byStatus = await Organization.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$subscriptionStatus', count: { $sum: 1 } } }
      ]);

      // Organizations by plan
      const byPlan = await Organization.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$plan', count: { $sum: 1 } } }
      ]);

      // Total users across all organizations
      const totalUsers = await mongoose.model('Membership').countDocuments({ status: 'active' });

      // New organizations this month
      const newOrganizations = await Organization.countDocuments({
        isActive: true,
        createdAt: { $gte: startOfMonth }
      });

      // New organizations last month
      const newOrganizationsLastMonth = await Organization.countDocuments({
        isActive: true,
        createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }
      });

      // Calculate growth rate
      const orgGrowthRate = newOrganizationsLastMonth > 0
        ? ((newOrganizations - newOrganizationsLastMonth) / newOrganizationsLastMonth) * 100
        : 0;

      // Total usage across all organizations
      const usageAggregate = await Organization.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalProjects: { $sum: '$usage.projectsCount' },
            totalUsers: { $sum: '$usage.usersCount' },
            totalStorageMB: { $sum: '$usage.storageUsedMB' },
            totalAICalls: { $sum: '$usage.aiCallsThisMonth' }
          }
        }
      ]);

      const usage = usageAggregate[0] || {
        totalProjects: 0,
        totalUsers: 0,
        totalStorageMB: 0,
        totalAICalls: 0
      };

      // Trial conversions this month
      const trialConversions = await Organization.countDocuments({
        subscriptionStatus: 'active',
        trialEndsAt: { $exists: true, $lt: now },
        createdAt: { $gte: startOfMonth }
      });

      return {
        organizations: {
          total: totalOrganizations,
          newThisMonth: newOrganizations,
          growthRate: Math.round(orgGrowthRate * 100) / 100,
          byStatus: byStatus.reduce((acc, s) => { acc[s._id || 'none'] = s.count; return acc; }, {}),
          byPlan: byPlan.reduce((acc, p) => { acc[p._id || 'free'] = p.count; return acc; }, {})
        },
        users: {
          total: totalUsers
        },
        usage: {
          totalProjects: usage.totalProjects || 0,
          totalUsers: usage.totalUsers || 0,
          totalStorageMB: usage.totalStorageMB || 0,
          totalStorageGB: Math.round((usage.totalStorageMB || 0) / 1024 * 100) / 100,
          totalAICalls: usage.totalAICalls || 0
        },
        conversions: {
          trialConversions
        },
        period: {
          start: startOfMonth,
          end: now
        }
      };
    } catch (error) {
      console.error('Get platform usage error:', error);
      throw error;
    }
  },

  /**
   * Get subscription details for admin
   * @param {string} subscriptionId - Subscription ID
   */
  async getSubscriptionDetails(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('organizationId', 'name email plan planName');

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get organization with full details
      const organization = await Organization.findById(subscription.organizationId._id);

      // Calculate days until renewal
      const daysUntilRenewal = subscription.currentPeriodEnd
        ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)))
        : null;

      // Get plan details
      const plan = await Plan.findOne({ slug: subscription.plan });

      return {
        subscription: {
          id: subscription._id,
          status: subscription.status,
          provider: subscription.provider,
          billingPeriod: subscription.billingPeriod,
          amount: subscription.amount,
          currency: subscription.currency,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          daysUntilRenewal,
          trialEnd: subscription.trialEnd,
          canceledAt: subscription.canceledAt,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          planHistory: subscription.planHistory,
          invoices: subscription.invoices.slice(-20) // Last 20 invoices
        },
        organization: {
          id: organization._id,
          name: organization.name,
          email: organization.owner?.email,
          plan: organization.plan,
          planName: organization.planName,
          subscriptionStatus: organization.subscriptionStatus,
          usage: organization.usage,
          createdAt: organization.createdAt
        },
        plan: plan ? {
          name: plan.name,
          slug: plan.slug,
          tier: plan.tier,
          limits: plan.limits,
          features: plan.features
        } : null
      };
    } catch (error) {
      console.error('Get subscription details error:', error);
      throw error;
    }
  },

  /**
   * Get all subscriptions with filters
   * @param {Object} filters - Filter options
   */
  async getAllSubscriptions(filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        plan,
        provider,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const query = {};

      if (status) {
        query.status = status;
      }

      if (plan) {
        query.plan = plan;
      }

      if (provider) {
        query.provider = provider;
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Get subscriptions
      let subscriptions = await Subscription.find(query)
        .populate('organizationId', 'name plan planName subscriptionStatus')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Filter by search term if provided
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        subscriptions = subscriptions.filter(sub => {
          const orgName = sub.organizationId?.name || '';
          return searchRegex.test(orgName);
        });
      }

      // Get total count
      const total = await Subscription.countDocuments(query);

      // Get plan details
      const planDetails = {};
      for (const sub of subscriptions) {
        if (sub.plan && !planDetails[sub.plan]) {
          planDetails[sub.plan] = await Plan.findOne({ slug: sub.plan });
        }
      }

      return {
        subscriptions: subscriptions.map(sub => ({
          id: sub._id,
          organization: sub.organizationId,
          plan: sub.plan,
          planName: sub.planName,
          status: sub.status,
          provider: sub.provider,
          billingPeriod: sub.billingPeriod,
          amount: sub.amount,
          currency: sub.currency,
          currentPeriodEnd: sub.currentPeriodEnd,
          canceledAt: sub.canceledAt,
          createdAt: sub.createdAt,
          planDetails: planDetails[sub.plan]
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get all subscriptions error:', error);
      throw error;
    }
  },

  /**
   * Get revenue trends over time
   * @param {number} months - Number of months to analyze
   */
  async getRevenueTrends(months = 12) {
    try {
      const now = new Date();
      const trends = [];

      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mrr = await this.calculateMRR(date);

        trends.push({
          month: date.toISOString().slice(0, 7),
          mrr: mrr.mrr,
          mrrFormatted: mrr.mrrFormatted,
          subscribers: mrr.totalSubscribers
        });
      }

      // Sort by month ascending
      trends.sort((a, b) => a.month.localeCompare(b.month));

      // Calculate growth
      for (let i = 1; i < trends.length; i++) {
        const prevMRR = trends[i - 1].mrr;
        const currMRR = trends[i].mrr;
        trends[i].growth = prevMRR > 0
          ? Math.round(((currMRR - prevMRR) / prevMRR) * 100 * 100) / 100
          : 0;
      }

      return {
        trends,
        totalGrowth: trends.length > 1
          ? Math.round(((trends[trends.length - 1].mrr - trends[0].mrr) / trends[0].mrr) * 100 * 100) / 100
          : 0
      };
    } catch (error) {
      console.error('Get revenue trends error:', error);
      throw error;
    }
  }
};

/**
 * Helper function to format currency
 */
function formatCurrency(amount, currency = 'USD') {
  const value = amount / 100; // Assuming amount is in cents
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(value);
}

module.exports = AnalyticsService;