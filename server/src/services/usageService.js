/**
 * Usage Service
 *
 * Handles usage tracking and limit enforcement for organizations.
 * Tracks users, projects, landing pages, storage, and AI calls.
 */

const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const UsageLog = require('../models/UsageLog');

/**
 * Usage Service
 */
const UsageService = {
  /**
   * Track usage event
   * @param {string} organizationId - Organization ID
   * @param {string} type - Usage type (users, projects, landingPages, storage, aiCalls)
   * @param {number} amount - Amount to add (default: 1)
   */
  async trackUsage(organizationId, type, amount = 1) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const usage = organization.usage || {};

      switch (type) {
        case 'users':
          usage.usersCount = (usage.usersCount || 0) + amount;
          break;
        case 'projects':
          usage.projectsCount = (usage.projectsCount || 0) + amount;
          break;
        case 'landingPages':
          usage.landingPagesCount = (usage.landingPagesCount || 0) + amount;
          break;
        case 'storage':
          usage.storageUsedMB = (usage.storageUsedMB || 0) + amount;
          break;
        case 'aiCalls':
          usage.aiCallsThisMonth = (usage.aiCallsThisMonth || 0) + amount;
          break;
        default:
          throw new Error(`Unknown usage type: ${type}`);
      }

      usage.lastUsageUpdate = new Date();
      organization.usage = usage;
      await organization.save();

      return organization.usage;
    } catch (error) {
      console.error('Track usage error:', error);
      throw error;
    }
  },

  /**
   * Decrease usage (for deletions)
   * @param {string} organizationId - Organization ID
   * @param {string} type - Usage type
   * @param {number} amount - Amount to subtract (default: 1)
   */
  async decreaseUsage(organizationId, type, amount = 1) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const usage = organization.usage || {};

      switch (type) {
        case 'users':
          usage.usersCount = Math.max(0, (usage.usersCount || 0) - amount);
          break;
        case 'projects':
          usage.projectsCount = Math.max(0, (usage.projectsCount || 0) - amount);
          break;
        case 'landingPages':
          usage.landingPagesCount = Math.max(0, (usage.landingPagesCount || 0) - amount);
          break;
        case 'storage':
          usage.storageUsedMB = Math.max(0, (usage.storageUsedMB || 0) - amount);
          break;
        case 'aiCalls':
          // AI calls don't decrease - they're monthly counters
          break;
        default:
          throw new Error(`Unknown usage type: ${type}`);
      }

      usage.lastUsageUpdate = new Date();
      organization.usage = usage;
      await organization.save();

      return organization.usage;
    } catch (error) {
      console.error('Decrease usage error:', error);
      throw error;
    }
  },

  /**
   * Get current usage for organization
   * @param {string} organizationId - Organization ID
   * @param {string} period - Period (current, all) - not used currently
   */
  async getUsage(organizationId, period = 'current') {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const usage = organization.usage || {};
      const limits = organization.planLimits || {};

      return {
        usage: {
          users: {
            count: usage.usersCount || 0,
            limit: limits.maxUsers || -1
          },
          projects: {
            count: usage.projectsCount || 0,
            limit: limits.maxProjects || -1
          },
          landingPages: {
            count: usage.landingPagesCount || 0,
            limit: limits.maxLandingPages || -1
          },
          storage: {
            usedMB: usage.storageUsedMB || 0,
            limitMB: limits.storageLimitMB || -1
          },
          aiCalls: {
            count: usage.aiCallsThisMonth || 0,
            limit: limits.aiCallsPerMonth || -1
          }
        },
        lastUpdated: usage.lastUsageUpdate || null,
        period
      };
    } catch (error) {
      console.error('Get usage error:', error);
      throw error;
    }
  },

  /**
   * Check if organization has reached limit
   * @param {string} organizationId - Organization ID
   * @param {string} type - Resource type
   */
  async checkLimit(organizationId, type) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const usage = organization.usage || {};
      const limits = organization.planLimits || {};

      let currentCount, limit;

      switch (type) {
        case 'users':
          currentCount = usage.usersCount || 0;
          limit = limits.maxUsers || -1;
          break;
        case 'projects':
          currentCount = usage.projectsCount || 0;
          limit = limits.maxProjects || -1;
          break;
        case 'landingPages':
          currentCount = usage.landingPagesCount || 0;
          limit = limits.maxLandingPages || -1;
          break;
        case 'storage':
          currentCount = usage.storageUsedMB || 0;
          limit = limits.storageLimitMB || -1;
          break;
        case 'aiCalls':
          currentCount = usage.aiCallsThisMonth || 0;
          limit = limits.aiCallsPerMonth || -1;
          break;
        default:
          throw new Error(`Unknown resource type: ${type}`);
      }

      // -1 means unlimited
      const isUnlimited = limit === -1;
      const isExceeded = !isUnlimited && currentCount >= limit;
      const isNearLimit = !isUnlimited && currentCount >= (limit * 0.8);

      return {
        resourceType: type,
        current: currentCount,
        limit,
        isUnlimited,
        isExceeded,
        isNearLimit,
        remaining: isUnlimited ? 'unlimited' : Math.max(0, limit - currentCount),
        percentage: isUnlimited ? 0 : Math.round((currentCount / limit) * 100)
      };
    } catch (error) {
      console.error('Check limit error:', error);
      throw error;
    }
  },

  /**
   * Get detailed usage report for organization
   * @param {string} organizationId - Organization ID
   */
  async getUsageReport(organizationId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const usage = organization.usage || {};
      const limits = organization.planLimits || {};
      const features = organization.features || {};

      // Get usage logs for the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usageLogs = await UsageLog.find({
        organizationId,
        createdAt: { $gte: startOfMonth }
      }).sort({ createdAt: -1 });

      // Calculate usage breakdown
      const aiCallLogs = usageLogs.filter(log => log.action?.includes('ai'));
      const projectLogs = usageLogs.filter(log => log.action?.includes('project'));
      const userLogs = usageLogs.filter(log => log.action?.includes('user') || log.action?.includes('member'));

      // Resource usage summary
      const resources = {
        users: {
          used: usage.usersCount || 0,
          limit: limits.maxUsers || -1,
          unlimited: limits.maxUsers === -1,
          featureEnabled: true,
          warnings: []
        },
        projects: {
          used: usage.projectsCount || 0,
          limit: limits.maxProjects || -1,
          unlimited: limits.maxProjects === -1,
          featureEnabled: true,
          warnings: []
        },
        landingPages: {
          used: usage.landingPagesCount || 0,
          limit: limits.maxLandingPages || -1,
          unlimited: limits.maxLandingPages === -1,
          featureEnabled: true,
          warnings: []
        },
        storage: {
          usedMB: usage.storageUsedMB || 0,
          limitMB: limits.storageLimitMB || -1,
          unlimited: limits.storageLimitMB === -1,
          featureEnabled: true,
          warnings: []
        },
        aiCalls: {
          used: usage.aiCallsThisMonth || 0,
          limit: limits.aiCallsPerMonth || -1,
          unlimited: limits.aiCallsPerMonth === -1,
          featureEnabled: features.apiAccess || false,
          resetDate: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1),
          warnings: []
        }
      };

      // Generate warnings for near-limit resources
      for (const [key, resource] of Object.entries(resources)) {
        if (!resource.unlimited && resource.limit > 0) {
          const limit = resource.limit;
          const used = resource.usedMB || resource.used;
          const percentage = (used / limit) * 100;

          if (percentage >= 100) {
            resource.warnings.push({
              type: 'exceeded',
              message: `${key} limit exceeded. Please upgrade your plan.`
            });
          } else if (percentage >= 90) {
            resource.warnings.push({
              type: 'critical',
              message: `${key} usage is at ${Math.round(percentage)}%. Consider upgrading.`
            });
          } else if (percentage >= 80) {
            resource.warnings.push({
              type: 'warning',
              message: `${key} usage is at ${Math.round(percentage)}%.`
            });
          }
        }
      }

      return {
        organization: {
          id: organization._id,
          name: organization.name,
          plan: organization.plan,
          planName: organization.planName,
          subscriptionStatus: organization.subscriptionStatus
        },
        period: {
          start: startOfMonth,
          end: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0)
        },
        resources,
        features: {
          analytics: features.analytics || false,
          whiteLabel: features.whiteLabel || false,
          prioritySupport: features.prioritySupport || false,
          customDomain: features.customDomain || false,
          apiAccess: features.apiAccess || false
        },
        recentActivity: {
          aiCalls: aiCallLogs.slice(0, 20),
          projects: projectLogs.slice(0, 20),
          users: userLogs.slice(0, 20)
        }
      };
    } catch (error) {
      console.error('Get usage report error:', error);
      throw error;
    }
  },

  /**
   * Reset monthly usage counters
   * Called by cron job at the start of each month
   * @param {string} organizationId - Organization ID (optional, if not provided resets all)
   */
  async resetMonthlyUsage(organizationId = null) {
    try {
      const query = {};
      if (organizationId) {
        query._id = organizationId;
      }

      const result = await Organization.updateMany(query, {
        $set: {
          'usage.aiCallsThisMonth': 0,
          'usage.lastUsageUpdate': new Date()
        }
      });

      console.log(`Reset monthly usage for ${result.modifiedCount} organizations`);
      return result;
    } catch (error) {
      console.error('Reset monthly usage error:', error);
      throw error;
    }
  },

  /**
   * Recalculate usage from database counts
   * Useful for fixing inconsistencies
   * @param {string} organizationId - Organization ID
   */
  async recalculateUsage(organizationId) {
    try {
      const User = mongoose.model('User');
      const Project = mongoose.model('Project');
      const Membership = mongoose.model('Membership');
      const LandingPage = mongoose.model('LandingPage');

      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Count users
      const usersCount = await Membership.countDocuments({
        organizationId,
        status: 'active'
      });

      // Count projects
      const projectsCount = await Project.countDocuments({
        organizationId,
        isActive: true
      });

      // Count landing pages (both standalone and embedded in projects)
      let landingPagesCount = await LandingPage.countDocuments({
        organizationId,
        isActive: true
      });

      // Also count embedded landing pages in projects
      const projects = await Project.find({ organizationId, isActive: true });
      for (const project of projects) {
        if (project.landingPages && project.landingPages.length > 0) {
          landingPagesCount += project.landingPages.length;
        }
      }

      // Update organization
      organization.usage.usersCount = usersCount;
      organization.usage.projectsCount = projectsCount;
      organization.usage.landingPagesCount = landingPagesCount;
      organization.usage.lastUsageUpdate = new Date();
      await organization.save();

      return organization.usage;
    } catch (error) {
      console.error('Recalculate usage error:', error);
      throw error;
    }
  },

  /**
   * Log usage action (wrapper for UsageLog.logAction)
   * @param {Object} params - Log parameters
   */
  async logUsage(params) {
    try {
      return await UsageLog.logAction({
        organizationId: params.organizationId,
        userId: params.userId,
        userRole: params.userRole,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details,
        request: params.request
      });
    } catch (error) {
      console.error('Log usage error:', error);
      // Don't throw - logging should not break operations
    }
  }
};

module.exports = UsageService;