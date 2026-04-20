/**
 * Rejection Service
 *
 * Handles creation and retrieval of rejection records when testers
 * or marketers reject tasks. Tracks rejection history for admin review.
 */

const mongoose = require('mongoose');
const Rejection = require('../models/Rejection');
const Task = require('../models/Task');
const User = require('../models/User');

const REJECTION_REASONS = {
  quality: 'Quality issues',
  brand: 'Brand guideline mismatch',
  instructions: 'Did not follow instructions',
  design: 'Design/Layout issues',
  content: 'Content/Copy issues',
  technical: 'Technical issues',
  other: 'Other'
};

/**
 * Map task types to rejected user roles
 */
const TASK_TYPE_TO_ROLE = {
  content_creation: 'content_writer',
  graphic_design: 'graphic_designer',
  video_editing: 'video_editor',
  landing_page_design: 'ui_ux_designer',
  landing_page_development: 'developer'
};

const RejectionService = {
  /**
   * Create a rejection record when a task is rejected
   * @param {Object} params - Rejection parameters
   * @param {ObjectId} params.taskId - The rejected task ID
   * @param {ObjectId} params.organizationId - Organization ID
   * @param {ObjectId} params.projectId - Project ID
   * @param {ObjectId} params.rejectedUserId - The user whose work was rejected
   * @param {ObjectId} params.rejectedByUserId - The user who rejected (tester/marketer)
   * @param {String} params.rejectionReason - Category of rejection
   * @param {String} params.rejectionNote - Detailed feedback
   * @param {String} params.rejectedByRole - 'tester' or 'performance_marketer'
   */
  async createRejection(params) {
    try {
      const {
        taskId,
        organizationId,
        projectId,
        rejectedUserId,
        rejectedByUserId,
        rejectionReason,
        rejectionNote,
        rejectedByRole
      } = params;

      // Get task details
      const task = await Task.findById(taskId).populate('assignedTo originalAssignedTo');
      if (!task) {
        throw new Error('Task not found');
      }

      // Get the rejected user's details
      const rejectedUser = await User.findById(rejectedUserId);
      if (!rejectedUser) {
        throw new Error('Rejected user not found');
      }

      // Get the rejecter's details
      const rejectedByUser = await User.findById(rejectedByUserId);
      if (!rejectedByUser) {
        throw new Error('Rejecting user not found');
      }

      // Determine the role of the rejected user based on task type
      const rejectedUserRole = TASK_TYPE_TO_ROLE[task.taskType] || task.assignedRole;

      // Generate task link (frontend URL would be configured)
      const taskLink = `/tasks/${taskId}`;

      // Create rejection record
      const rejection = new Rejection({
        organizationId,
        taskId,
        taskTitle: task.taskTitle,
        taskType: task.taskType,
        taskLink,
        projectId,
        rejectedUser: rejectedUserId,
        rejectedUserName: rejectedUser.name,
        rejectedUserRole,
        rejectedBy: rejectedByUserId,
        rejectedByName: rejectedByUser.name,
        rejectedByRole,
        rejectionReason,
        rejectionNote
      });

      await rejection.save();

      return rejection;
    } catch (error) {
      console.error('Create rejection error:', error);
      throw error;
    }
  },

  /**
   * Get all rejections for an organization with filtering
   * @param {ObjectId} organizationId - Organization ID
   * @param {Object} options - Query options
   */
  async getRejections(organizationId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        userId,
        taskType,
        rejectedByRole,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        startDate,
        endDate,
        resolved
      } = options;

      const query = { organizationId };

      if (userId) {
        query.rejectedUser = new mongoose.Types.ObjectId(userId);
      }

      if (taskType) {
        query.taskType = taskType;
      }

      if (rejectedByRole) {
        query.rejectedByRole = rejectedByRole;
      }

      if (resolved !== undefined) {
        query.resolved = resolved === 'true' || resolved === true;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const rejections = await Rejection.find(query)
        .populate('taskId', 'taskTitle status taskType')
        .populate('rejectedUser', 'name email role')
        .populate('rejectedBy', 'name email role')
        .populate('projectId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Rejection.countDocuments(query);

      return {
        rejections,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get rejections error:', error);
      throw error;
    }
  },

  /**
   * Get rejection statistics for organization
   * @param {ObjectId} organizationId - Organization ID
   * @param {number} days - Number of days to analyze
   */
  async getRejectionStats(organizationId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get overall stats
      const overallStats = await Rejection.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalRejections: { $sum: 1 },
            uniqueUsersRejected: { $addToSet: '$rejectedUser' },
            uniqueRejecters: { $addToSet: '$rejectedBy' }
          }
        },
        {
          $project: {
            totalRejections: 1,
            uniqueUsersRejected: { $size: '$uniqueUsersRejected' },
            uniqueRejecters: { $size: '$uniqueRejecters' }
          }
        }
      ]);

      // Get rejections by reason
      const byReason = await Rejection.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId),
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

      // Get rejections by task type
      const byTaskType = await Rejection.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$taskType',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Get rejections by user role
      const byRole = await Rejection.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$rejectedUserRole',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Get per-user statistics
      const userStats = await Rejection.getOrganizationStats(organizationId, days);

      // Get high rejection users (threshold: 3+ in period)
      const highRejectionUsers = await Rejection.getHighRejectionUsers(organizationId, 3, days);

      return {
        period: { days, startDate, endDate: new Date() },
        overall: overallStats[0] || { totalRejections: 0, uniqueUsersRejected: 0, uniqueRejecters: 0 },
        byReason: byReason.map(r => ({
          reason: r._id,
          reasonLabel: REJECTION_REASONS[r._id] || r._id,
          count: r.count
        })),
        byTaskType: byTaskType.map(t => ({
          taskType: t._id,
          count: t.count
        })),
        byRole: byRole.map(r => ({
          role: r._id,
          count: r.count
        })),
        userStats,
        highRejectionUsers
      };
    } catch (error) {
      console.error('Get rejection stats error:', error);
      throw error;
    }
  },

  /**
   * Get rejection history for a specific user
   * @param {ObjectId} organizationId - Organization ID
   * @param {ObjectId} userId - User ID
   * @param {Object} options - Query options
   */
  async getUserRejectionHistory(organizationId, userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const rejections = await Rejection.find({
        organizationId,
        rejectedUser: new mongoose.Types.ObjectId(userId)
      })
        .populate('taskId', 'taskTitle status taskType')
        .populate('rejectedBy', 'name email role')
        .populate('projectId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Rejection.countDocuments({
        organizationId,
        rejectedUser: new mongoose.Types.ObjectId(userId)
      });

      // Get user's rejection stats
      const stats = await Rejection.getUserStats(organizationId, userId);

      return {
        rejections,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get user rejection history error:', error);
      throw error;
    }
  },

  /**
   * Mark a rejection as resolved
   * @param {ObjectId} rejectionId - Rejection ID
   * @param {ObjectId} resolvedByUserId - User who resolved it
   */
  async resolveRejection(rejectionId, resolvedByUserId) {
    try {
      const rejection = await Rejection.findByIdAndUpdate(
        rejectionId,
        {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: resolvedByUserId
        },
        { new: true }
      );

      if (!rejection) {
        throw new Error('Rejection not found');
      }

      return rejection;
    } catch (error) {
      console.error('Resolve rejection error:', error);
      throw error;
    }
  },

  /**
   * Get users with high rejection counts for alerts
   * @param {ObjectId} organizationId - Organization ID
   * @param {number} threshold - Minimum rejection count threshold
   * @param {number} days - Number of days to analyze
   */
  async getHighRejectionUsers(organizationId, threshold = 3, days = 30) {
    try {
      return await Rejection.getHighRejectionUsers(organizationId, threshold, days);
    } catch (error) {
      console.error('Get high rejection users error:', error);
      throw error;
    }
  },

  /**
   * Get reason label for display
   */
  getReasonLabel(reason) {
    return REJECTION_REASONS[reason] || reason;
  }
};

module.exports = RejectionService;
module.exports.REJECTION_REASONS = REJECTION_REASONS;