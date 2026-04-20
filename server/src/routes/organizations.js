const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { protect } = require('../middleware/auth');
const { setTenantContext, requireOrganization, requireOrgRole, requireOrgAdmin } = require('../middleware/tenant');
const { orgCreationLimiter, invitationLimiter } = require('../middleware/rateLimiter');
const { auditLog } = require('../middleware/security');

// All routes require authentication
router.use(protect);

/**
 * Organization Routes
 */

// Create organization (no tenant context needed)
router.post('/',
  orgCreationLimiter,
  auditLog('org.create'),
  organizationController.createOrganization
);

// Get user's organizations (no specific tenant context)
router.get('/',
  organizationController.getOrganizations
);

// Get current organization context
router.get('/current',
  setTenantContext,
  requireOrganization,
  organizationController.getOrganization
);

// Get available plans
router.get('/plans',
  async (req, res) => {
    const Plan = require('../models/Plan');
    const plans = await Plan.find({ isActive: true, isPublic: true }).sort({ sortOrder: 1 });
    res.json({ success: true, data: plans });
  }
);

// Switch organization
router.put('/:id/switch',
  setTenantContext,
  organizationController.switchOrganization
);

// Get organization by ID
router.get('/:id',
  setTenantContext,
  requireOrganization,
  organizationController.getOrganization
);

// Update organization (requires admin/owner)
router.put('/:id',
  setTenantContext,
  requireOrganization,
  requireOrgAdmin,
  auditLog('org.update'),
  organizationController.updateOrganization
);

// Delete organization (owner only)
router.delete('/:id',
  setTenantContext,
  requireOrganization,
  requireOrgRole('owner'),
  auditLog('org.delete'),
  organizationController.deleteOrganization
);

/**
 * Member Routes
 */

// Get organization members
router.get('/:id/members',
  setTenantContext,
  requireOrganization,
  organizationController.getMembers
);

// Invite member (requires invite permission)
router.post('/:id/invite',
  setTenantContext,
  requireOrganization,
  requireOrgAdmin,
  invitationLimiter,
  auditLog('org.member_invite'),
  organizationController.inviteMember
);

// Update member role (requires manage roles permission)
router.put('/:id/members/:userId',
  setTenantContext,
  requireOrganization,
  requireOrgAdmin,
  auditLog('org.member_role_change'),
  organizationController.updateMemberRole
);

// Remove member (requires remove members permission)
router.delete('/:id/members/:userId',
  setTenantContext,
  requireOrganization,
  requireOrgAdmin,
  auditLog('org.member_remove'),
  organizationController.removeMember
);

/**
 * Invitation Acceptance Route (Public - requires valid token)
 * This is handled separately without tenant context
 */
router.post('/invitations/accept/:token',
  protect,
  organizationController.acceptInvitation
);

/**
 * Organization Settings Routes
 */

// Get organization settings
router.get('/:id/settings',
  setTenantContext,
  requireOrganization,
  requireOrgAdmin,
  async (req, res) => {
    const Organization = require('../models/Organization');
    const organization = await Organization.findById(req.organizationId)
      .select('settings branding');

    res.json({
      success: true,
      data: organization
    });
  }
);

// Update organization settings
router.put('/:id/settings',
  setTenantContext,
  requireOrganization,
  requireOrgAdmin,
  auditLog('org.settings_change'),
  async (req, res) => {
    const Organization = require('../models/Organization');
    const { settings, branding } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      req.organizationId,
      {
        $set: {
          ...(settings && { settings }),
          ...(branding && { 'settings.branding': branding })
        }
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: organization
    });
  }
);

/**
 * Organization Usage Stats
 */
router.get('/:id/usage',
  setTenantContext,
  requireOrganization,
  requireOrgAdmin,
  async (req, res) => {
    const UsageLog = require('../models/UsageLog');
    const Organization = require('../models/Organization');

    const [organization, usageStats] = await Promise.all([
      Organization.findById(req.organizationId),
      UsageLog.getUsageStats(req.organizationId, 'month')
    ]);

    res.json({
      success: true,
      data: {
        current: organization.usage,
        limits: organization.planLimits,
        plan: organization.plan,
        stats: usageStats
      }
    });
  }
);

/**
 * Organization Audit Log
 */
router.get('/:id/audit-log',
  setTenantContext,
  requireOrganization,
  requireOrgRole('owner', 'admin'),
  async (req, res) => {
    const UsageLog = require('../models/UsageLog');
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;

    const logs = await UsageLog.find({
      organizationId: req.organizationId,
      ...(action && { action }),
      ...(startDate && { createdAt: { $gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { $lte: new Date(endDate) } })
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await UsageLog.countDocuments({
      organizationId: req.organizationId,
      ...(action && { action }),
      ...(startDate && { createdAt: { $gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { $lte: new Date(endDate) } })
    });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  }
);

/**
 * Leave Organization
 */
router.post('/:id/leave',
  setTenantContext,
  requireOrganization,
  async (req, res) => {
    const session = require('mongoose').startSession();
    session.startTransaction();

    try {
      const Membership = require('../models/Membership');
      const User = require('../models/User');

      const membership = await Membership.findOne({
        userId: req.user._id,
        organizationId: req.organizationId,
        status: 'active'
      });

      if (!membership) {
        return res.status(400).json({
          success: false,
          message: 'You are not a member of this organization'
        });
      }

      if (membership.role === 'owner') {
        return res.status(400).json({
          success: false,
          message: 'Owner cannot leave the organization. Transfer ownership first or delete the organization.'
        });
      }

      // Remove membership
      await membership.updateOne({ status: 'removed' }, { session });

      // Update user
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { organizations: { organizationId: req.organizationId } },
        ...(req.user.currentOrganization?.toString() === req.organizationId.toString() && {
          currentOrganization: null
        })
      }, { session });

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'You have left the organization'
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
);

module.exports = router;