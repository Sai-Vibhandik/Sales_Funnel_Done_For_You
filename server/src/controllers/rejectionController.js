/**
 * Rejection Controller
 *
 * Handles rejection tracking for admin dashboard.
 * Allows admins to view rejection history and statistics.
 */

const mongoose = require('mongoose');
const RejectionService = require('../services/rejectionService');

// @desc    Get all rejections for organization
// @route   GET /api/rejections
// @access  Private (Admin only)
exports.getRejections = async (req, res, next) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view rejection history'
      });
    }

    const organizationId = req.organizationId;

    const result = await RejectionService.getRejections(organizationId, {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      userId: req.query.userId,
      taskType: req.query.taskType,
      rejectedByRole: req.query.rejectedByRole,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      resolved: req.query.resolved
    });

    res.status(200).json({
      success: true,
      data: result.rejections,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rejection statistics for organization
// @route   GET /api/rejections/stats
// @access  Private (Admin only)
exports.getRejectionStats = async (req, res, next) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view rejection statistics'
      });
    }

    const organizationId = req.organizationId;
    const days = parseInt(req.query.days) || 30;

    const stats = await RejectionService.getRejectionStats(organizationId, days);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rejection history for specific user
// @route   GET /api/rejections/user/:userId
// @access  Private (Admin only)
exports.getUserRejectionHistory = async (req, res, next) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view user rejection history'
      });
    }

    const { userId } = req.params;
    const organizationId = req.organizationId;

    const result = await RejectionService.getUserRejectionHistory(
      organizationId,
      userId,
      {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      }
    );

    res.status(200).json({
      success: true,
      data: result.rejections,
      stats: result.stats,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users with high rejection counts
// @route   GET /api/rejections/alerts
// @access  Private (Admin only)
exports.getHighRejectionUsers = async (req, res, next) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view rejection alerts'
      });
    }

    const organizationId = req.organizationId;
    const threshold = parseInt(req.query.threshold) || 3;
    const days = parseInt(req.query.days) || 30;

    const highRejectionUsers = await RejectionService.getHighRejectionUsers(
      organizationId,
      threshold,
      days
    );

    res.status(200).json({
      success: true,
      data: highRejectionUsers,
      threshold,
      period: { days }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a rejection as resolved
// @route   PUT /api/rejections/:rejectionId/resolve
// @access  Private (Admin only)
exports.resolveRejection = async (req, res, next) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can resolve rejections'
      });
    }

    const { rejectionId } = req.params;
    const resolvedByUserId = req.user._id;

    const rejection = await RejectionService.resolveRejection(
      rejectionId,
      resolvedByUserId
    );

    res.status(200).json({
      success: true,
      data: rejection
    });
  } catch (error) {
    next(error);
  }
};