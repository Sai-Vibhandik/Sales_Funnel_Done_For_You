const mongoose = require('mongoose');

const REJECTION_REASONS = [
  'quality',
  'brand',
  'instructions',
  'design',
  'content',
  'technical',
  'other'
];

const rejectionSchema = new mongoose.Schema({
  // Multi-tenancy
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
    index: true
  },

  // Task reference
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },

  // Task info at time of rejection (for historical reference)
  taskTitle: {
    type: String,
    required: true
  },
  taskType: {
    type: String,
    enum: ['content_creation', 'graphic_design', 'video_editing', 'landing_page_design', 'landing_page_development'],
    required: true
  },
  taskLink: {
    type: String,
    description: 'Link to the task for admin reference'
  },

  // The user who was rejected (the role member who submitted the work)
  rejectedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rejectedUserName: {
    type: String,
    required: true
  },
  rejectedUserRole: {
    type: String,
    enum: ['content_writer', 'graphic_designer', 'video_editor', 'ui_ux_designer', 'developer'],
    required: true
  },

  // The user who rejected (tester or performance_marketer)
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rejectedByName: {
    type: String,
    required: true
  },
  rejectedByRole: {
    type: String,
    enum: ['tester', 'performance_marketer'],
    required: true
  },

  // Rejection details
  rejectionReason: {
    type: String,
    enum: REJECTION_REASONS,
    required: true
  },
  rejectionNote: {
    type: String,
    required: true
  },

  // Project reference for filtering
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },

  // Resolution status
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
rejectionSchema.index({ organizationId: 1, createdAt: -1 });
rejectionSchema.index({ organizationId: 1, rejectedUser: 1 });
rejectionSchema.index({ organizationId: 1, rejectedBy: 1 });
rejectionSchema.index({ taskId: 1 });
rejectionSchema.index({ resolved: 1 });

// Static method to get rejection statistics for a user
rejectionSchema.statics.getUserStats = async function(organizationId, userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        rejectedUser: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$rejectionReason',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const totalCount = await this.countDocuments({
    organizationId,
    rejectedUser: userId,
    createdAt: { $gte: startDate }
  });

  return {
    totalRejections: totalCount,
    byReason: stats
  };
};

// Static method to get organization-wide rejection statistics
rejectionSchema.statics.getOrganizationStats = async function(organizationId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$rejectedUser',
        rejectedUserName: { $first: '$rejectedUserName' },
        rejectedUserRole: { $first: '$rejectedUserRole' },
        totalRejections: { $sum: 1 },
        reasons: {
          $push: '$rejectionReason'
        }
      }
    },
    {
      $sort: { totalRejections: -1 }
    }
  ]);

  return stats;
};

// Static method to get users with high rejection counts (for alerts)
rejectionSchema.statics.getHighRejectionUsers = async function(organizationId, threshold = 3, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const highRejectionUsers = await this.aggregate([
    {
      $match: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$rejectedUser',
        rejectedUserName: { $first: '$rejectedUserName' },
        rejectedUserRole: { $first: '$rejectedUserRole' },
        totalRejections: { $sum: 1 },
        lastRejection: { $max: '$createdAt' }
      }
    },
    {
      $match: { totalRejections: { $gte: threshold } }
    },
    {
      $sort: { totalRejections: -1 }
    }
  ]);

  return highRejectionUsers;
};

const Rejection = mongoose.model('Rejection', rejectionSchema);

module.exports = Rejection;
module.exports.REJECTION_REASONS = REJECTION_REASONS;