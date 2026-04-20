const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // =====================================
  // MULTI-TENANCY: Organization ID (REQUIRED)
  // =====================================
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required']
  },

  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'project_assigned',
      'project_updated',
      'stage_completed',
      'comment',
      'project_activated',
      'strategy_completed',
      'strategy_reviewed',
      // Task-related notifications
      'task_assigned',
      'task_submitted',
      'task_approved_by_tester',
      'task_approved_by_marketer',
      'task_rejected',
      'task_revision_requested',
      'design_approved_for_development',
      // Content workflow notifications
      'content_final_approved',
      'content_approved',
      // Organization notifications
      'org.member_invite',
      'org.member_joined',
      'org.member_removed',
      'org.plan_change',
      'org.billing_reminder'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  // Link to navigate to when notification is clicked
  link: {
    type: String
  },
  // Additional metadata
  metadata: {
    type: Object,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  // Email notification sent
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
// Multi-tenancy index
notificationSchema.index({ organizationId: 1 });
notificationSchema.index({ organizationId: 1, recipient: 1 });
notificationSchema.index({ organizationId: 1, recipient: 1, isRead: 1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });

// Legacy index
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Mark as read method
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = await this.create(data);
  return notification;
};

// Static method to get unread count (tenant-scoped)
notificationSchema.statics.getUnreadCount = async function(userId, organizationId) {
  const query = { recipient: userId, isRead: false };
  if (organizationId) {
    query.organizationId = organizationId;
  }
  return await this.countDocuments(query);
};

// Static method to get notifications for user (tenant-scoped)
notificationSchema.statics.getForUser = async function(userId, organizationId, options = {}) {
  const query = { recipient: userId };
  if (organizationId) {
    query.organizationId = organizationId;
  }

  return await this.find(query)
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 50)
    .populate('projectId', 'projectName customerName')
    .populate('taskId', 'taskTitle status');
};

module.exports = mongoose.model('Notification', notificationSchema);