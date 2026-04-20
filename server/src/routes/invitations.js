const express = require('express');
const router = express.Router();
const Invitation = require('../models/Invitation');
const Membership = require('../models/Membership');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

/**
 * Invitation Routes
 *
 * Handles invitation acceptance for team members.
 * These routes are mostly public (token-based authentication).
 */

/**
 * @desc    Verify invitation token (get invitation details)
 * @route   GET /api/invitations/verify/:token
 * @access  Public
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findValidByToken(token);

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation',
        code: 'INVALID_INVITATION'
      });
    }

    // Get inviter details
    const inviter = await User.findById(invitation.invitedBy).select('name email avatar');

    res.json({
      success: true,
      data: {
        organization: invitation.organizationId,
        role: invitation.role,
        department: invitation.department,
        jobTitle: invitation.jobTitle,
        message: invitation.message,
        invitedBy: inviter,
        expiresAt: invitation.expiresAt,
        email: invitation.email
      }
    });
  } catch (error) {
    console.error('Verify invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify invitation'
    });
  }
});

/**
 * @desc    Accept invitation (logged-in user)
 * @route   POST /api/invitations/accept/:token
 * @access  Private
 */
router.post('/accept/:token', protect, async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { token } = req.params;
    const userId = req.user._id;
    const userEmail = req.user.email;

    // Find valid invitation
    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('organizationId').session(session);

    if (!invitation) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation',
        code: 'INVALID_INVITATION'
      });
    }

    // Check if user email matches invitation
    if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'This invitation was sent to a different email address',
        code: 'EMAIL_MISMATCH',
        invitationEmail: invitation.email
      });
    }

    // Check if already a member
    const existingMembership = await Membership.findOne({
      userId,
      organizationId: invitation.organizationId._id
    }).session(session);

    if (existingMembership) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this organization',
        code: 'ALREADY_MEMBER'
      });
    }

    // Check organization user limit before accepting invitation
    const currentUsersCount = await Membership.countDocuments({
      organizationId: invitation.organizationId._id,
      status: 'active'
    }).session(session);
    const maxUsers = invitation.organizationId.planLimits?.maxUsers;

    // -1 means unlimited, also check if maxUsers is undefined/null (no limit set)
    if (maxUsers !== undefined && maxUsers !== null && maxUsers !== -1 && currentUsersCount >= maxUsers) {
      await session.abortTransaction();
      return res.status(402).json({
        success: false,
        message: `This organization has reached its member limit (${maxUsers} users maximum). Please contact the organization admin to upgrade the plan.`,
        code: 'LIMIT_EXCEEDED',
        limit: maxUsers,
        current: currentUsersCount,
        resourceType: 'users'
      });
    }

    // Create membership (role is on User model, not Membership)
    const membership = await Membership.create([{
      userId,
      organizationId: invitation.organizationId._id,
      status: 'active',
      joinedAt: new Date(),
      invitedBy: invitation.invitedBy,
      department: invitation.department,
      jobTitle: invitation.jobTitle
    }], { session });

    // Update invitation status
    await invitation.updateOne({
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: new Date()
    }, { session });

    // Update user's role and current organization
    await User.findByIdAndUpdate(userId, {
      role: invitation.role,
      currentOrganization: invitation.organizationId._id
    }, { session });

    // Update organization usage
    await Organization.findByIdAndUpdate(
      invitation.organizationId._id,
      { $inc: { 'usage.usersCount': 1 } },
      { session }
    );

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Successfully joined organization',
      data: {
        organization: invitation.organizationId,
        role: invitation.role
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Accept invitation error:', error);

    // Handle limit exceeded error from Membership pre-save hook
    if (error.code === 'LIMIT_EXCEEDED' || error.message?.includes('LIMIT_EXCEEDED')) {
      return res.status(402).json({
        success: false,
        message: error.message || 'User limit exceeded',
        code: 'LIMIT_EXCEEDED',
        limit: error.limit,
        current: error.current,
        resourceType: error.resourceType || 'users'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to accept invitation'
    });
  } finally {
    session.endSession();
  }
});

/**
 * @desc    Decline invitation
 * @route   POST /api/invitations/decline/:token
 * @access  Private
 */
router.post('/decline/:token', protect, async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation',
        code: 'INVALID_INVITATION'
      });
    }

    // Update invitation status
    await invitation.updateOne({
      status: 'declined',
      declinedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Invitation declined'
    });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline invitation'
    });
  }
});

/**
 * @desc    Get pending invitations for current user
 * @route   GET /api/invitations/pending
 * @access  Private
 */
router.get('/pending', protect, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const invitations = await Invitation.find({
      email: userEmail.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .populate('organizationId', 'name logo description')
      .populate('invitedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invitations
    });
  } catch (error) {
    console.error('Get pending invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending invitations'
    });
  }
});

/**
 * @desc    Cancel invitation (admin only)
 * @route   DELETE /api/invitations/:id
 * @access  Private (Admin/Owner)
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const invitation = await Invitation.findById(id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    // Check if user has permission (invitedBy or admin of org)
    if (invitation.invitedBy.toString() !== userId.toString()) {
      const membership = await Membership.findOne({
        userId,
        organizationId: invitation.organizationId,
        role: { $in: ['owner', 'admin'] }
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to cancel this invitation'
        });
      }
    }

    // Cancel invitation
    await invitation.updateOne({
      status: 'canceled',
      canceledBy: userId,
      canceledAt: new Date()
    });

    res.json({
      success: true,
      message: 'Invitation canceled'
    });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel invitation'
    });
  }
});

/**
 * @desc    Resend invitation (admin only)
 * @route   POST /api/invitations/:id/resend
 * @access  Private (Admin/Owner)
 */
router.post('/:id/resend', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const invitation = await Invitation.findById(id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    // Check permission
    const membership = await Membership.findOne({
      userId,
      organizationId: invitation.organizationId,
      role: { $in: ['owner', 'admin'] }
    });

    if (!membership && invitation.invitedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to resend this invitation'
      });
    }

    // Resend invitation
    await invitation.resend();

    // TODO: Send invitation email

    res.json({
      success: true,
      message: 'Invitation resent',
      data: {
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend invitation'
    });
  }
});

module.exports = router;