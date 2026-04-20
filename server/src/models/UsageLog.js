const mongoose = require('mongoose');

/**
 * UsageLog Model
 *
 * Tracks all actions and resource usage for:
 * - Audit trail
 * - Billing calculations
 * - Analytics
 * - Security monitoring
 */

const usageLogSchema = new mongoose.Schema({
  // Organization (tenant)
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // User who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // User's role at time of action
  userRole: {
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer']
  },

  // Action Details
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'auth.login',
      'auth.logout',
      'auth.password_change',
      'auth.password_reset',
      'auth.email_verify',

      // Organization
      'org.create',
      'org.update',
      'org.delete',
      'org.settings_change',
      'org.plan_change',
      'org.member_invite',
      'org.member_remove',
      'org.member_role_change',

      // Projects
      'project.create',
      'project.view',
      'project.update',
      'project.delete',
      'project.archive',
      'project.restore',

      // Tasks
      'task.create',
      'task.view',
      'task.update',
      'task.status_change',
      'task.assign',
      'task.complete',
      'task.delete',

      // Clients
      'client.create',
      'client.view',
      'client.update',
      'client.delete',

      // Files/Assets
      'file.upload',
      'file.download',
      'file.delete',

      // AI
      'ai.generate',
      'ai.regenerate',

      // Billing
      'billing.subscribe',
      'billing.cancel',
      'billing.upgrade',
      'billing.downgrade',
      'billing.invoice_paid',
      'billing.invoice_failed',

      // Exports
      'data.export',
      'data.import',

      // Settings
      'settings.update',

      // Security
      'security.suspicious_activity',
      'security.rate_limit_exceeded',
      'security.failed_login',

      // API
      'api.request'
    ]
  },

  // Resource being acted upon
  resource: {
    type: String,
    enum: [
      'organization',
      'user',
      'membership',
      'invitation',
      'project',
      'task',
      'client',
      'market_research',
      'offer',
      'traffic_strategy',
      'landing_page',
      'creative',
      'notification',
      'file',
      'subscription',
      'plan',
      'prompt',
      'framework',
      'ai_content',
      'export',
      'import'
    ]
  },

  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },

  // Action Details (JSON)
  details: {
    type: Object,
    default: {}
  },

  // Changes tracking (for updates)
  changes: {
    before: Object,
    after: Object
  },

  // Request Context
  request: {
    ip: String,
    userAgent: String,
    method: String,
    path: String,
    queryParams: Object,
    referer: String
  },

  // Response Context
  response: {
    statusCode: Number,
    success: { type: Boolean, default: true },
    errorMessage: String,
    duration: Number // in milliseconds
  },

  // Billing/Usage
  billable: {
    type: Boolean,
    default: false
  },
  credits: {
    type: Number,
    default: 0
  },

  // AI Usage
  aiUsage: {
    model: String,
    inputTokens: Number,
    outputTokens: Number,
    totalTokens: Number,
    provider: String
  },

  // Storage Usage
  storageUsage: {
    bytesAdded: Number,
    bytesRemoved: Number,
    totalBytes: Number,
    fileType: String
  },

  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },

  // Severity (for security monitoring)
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },

  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // Only use createdAt
});

// Compound Indexes for efficient queries
usageLogSchema.index({ organizationId: 1, createdAt: -1 });
usageLogSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
usageLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });
usageLogSchema.index({ organizationId: 1, resource: 1, resourceId: 1 });
usageLogSchema.index({ userId: 1, createdAt: -1 });
usageLogSchema.index({ action: 1, createdAt: -1 });
usageLogSchema.index({ status: 1, severity: 1, createdAt: -1 });

// TTL Index for auto-deletion (keep logs for 1 year by default)
usageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static method to log an action
usageLogSchema.statics.logAction = async function(logData) {
  try {
    const log = await this.create({
      organizationId: logData.organizationId,
      userId: logData.userId,
      userRole: logData.userRole,
      action: logData.action,
      resource: logData.resource,
      resourceId: logData.resourceId,
      details: logData.details,
      changes: logData.changes,
      request: logData.request,
      response: logData.response,
      billable: logData.billable || false,
      credits: logData.credits || 0,
      aiUsage: logData.aiUsage,
      storageUsage: logData.storageUsage,
      status: logData.status || 'success',
      severity: logData.severity || 'low'
    });
    return log;
  } catch (error) {
    console.error('Error logging action:', error);
    // Don't throw - logging should not break the application
    return null;
  }
};

// Static method to get organization activity
usageLogSchema.statics.getOrganizationActivity = async function(organizationId, options = {}) {
  const query = { organizationId };

  if (options.userId) query.userId = options.userId;
  if (options.action) query.action = options.action;
  if (options.resource) query.resource = options.resource;
  if (options.status) query.status = options.status;

  const startDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options.endDate ? new Date(options.endDate) : new Date();
  query.createdAt = { $gte: startDate, $lte: endDate };

  return this.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

// Static method to get user activity
usageLogSchema.statics.getUserActivity = async function(userId, options = {}) {
  const query = { userId };

  if (options.organizationId) query.organizationId = options.organizationId;

  const startDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options.endDate ? new Date(options.endDate) : new Date();
  query.createdAt = { $gte: startDate, $lte: endDate };

  return this.find(query)
    .populate('organizationId', 'name')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to get usage statistics
usageLogSchema.statics.getUsageStats = async function(organizationId, period = 'month') {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'day':
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  const stats = await this.aggregate([
    {
      $match: {
        organizationId: mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        totalCredits: { $sum: '$credits' },
        avgDuration: { $avg: '$response.duration' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  // Get AI usage
  const aiUsage = await this.aggregate([
    {
      $match: {
        organizationId: mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: startDate },
        'aiUsage.totalTokens': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$aiUsage.provider',
        totalCalls: { $sum: 1 },
        totalTokens: { $sum: '$aiUsage.totalTokens' },
        totalInputTokens: { $sum: '$aiUsage.inputTokens' },
        totalOutputTokens: { $sum: '$aiUsage.outputTokens' }
      }
    }
  ]);

  // Get storage usage
  const storageUsage = await this.aggregate([
    {
      $match: {
        organizationId: mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: startDate },
        action: { $in: ['file.upload', 'file.delete'] }
      }
    },
    {
      $group: {
        _id: null,
        bytesUploaded: { $sum: '$storageUsage.bytesAdded' },
        bytesDeleted: { $sum: '$storageUsage.bytesRemoved' }
      }
    }
  ]);

  return {
    actions: stats,
    aiUsage,
    storageUsage: storageUsage[0] || { bytesUploaded: 0, bytesDeleted: 0 }
  };
};

// Static method to get security events
usageLogSchema.statics.getSecurityEvents = async function(organizationId, options = {}) {
  const query = {
    organizationId,
    $or: [
      { severity: { $in: ['high', 'critical'] } },
      { action: { $regex: /^security\./ } }
    ]
  };

  if (options.startDate) {
    query.createdAt = { $gte: new Date(options.startDate) };
  }

  return this.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to get AI usage for billing
usageLogSchema.statics.getAIUsageForBilling = async function(organizationId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const usage = await this.aggregate([
    {
      $match: {
        organizationId: mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: startDate, $lte: endDate },
        'aiUsage.totalTokens': { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        totalTokens: { $sum: '$aiUsage.totalTokens' },
        totalInputTokens: { $sum: '$aiUsage.inputTokens' },
        totalOutputTokens: { $sum: '$aiUsage.outputTokens' },
        byModel: {
          $push: {
            model: '$aiUsage.model',
            tokens: '$aiUsage.totalTokens'
          }
        }
      }
    }
  ]);

  return usage[0] || {
    totalCalls: 0,
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0
  };
};

// Method to check if action is suspicious
usageLogSchema.methods.isSuspicious = function() {
  // Multiple failed login attempts
  if (this.action === 'security.failed_login' && this.severity === 'high') {
    return true;
  }

  // Rate limit exceeded
  if (this.action === 'security.rate_limit_exceeded') {
    return true;
  }

  // Suspicious activity flag
  if (this.action === 'security.suspicious_activity') {
    return true;
  }

  // Unusual hours (2 AM - 5 AM)
  const hour = new Date(this.createdAt).getHours();
  if (hour >= 2 && hour <= 5 && this.severity === 'high') {
    return true;
  }

  return false;
};

module.exports = mongoose.model('UsageLog', usageLogSchema);