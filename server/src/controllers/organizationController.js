const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const UsageLog = require('../models/UsageLog');
const Plan = require('../models/Plan');
const { BillingService } = require('../services/billingService');
const emailService = require('../services/emailService');

/**
 * Organization Controller
 *
 * Handles multi-tenant organization management:
 * - CRUD operations
 * - Team invitations
 * - Role management
 * - Plan changes
 */

/**
 * @desc    Create new organization
 * @route   POST /api/organizations
 * @access  Private
 *
 * When a user creates an organization, they automatically become the admin.
 * First user to create an organization gets the 'admin' role.
 */
exports.createOrganization = async (req, res) => {
  console.log('=== createOrganization called ===');
  console.log('Request body:', req.body);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, description, planId, planName, billingCycle, payment } = req.body;
    const userId = req.user._id;

    // Look up the plan by ID to get limits and features
    let plan = null;
    let actualPlanName = planName || 'Free';
    let isPaidPlan = false;

    if (planId) {
      try {
        plan = await Plan.findById(planId);
        if (plan) {
          // Use displayName if available, otherwise use name
          actualPlanName = plan.displayName || plan.name;
          // Check if it's a paid plan
          isPaidPlan = (plan.monthlyPrice > 0 || plan.yearlyPrice > 0);
        }
      } catch (err) {
        console.error('Plan lookup error:', err);
      }
    }

    // ============================================
    // PAYMENT VERIFICATION - TEMPORARILY DISABLED FOR TESTING
    // TODO: Re-enable when Razorpay/Stripe APIs are configured
    // ============================================
    // if (isPaidPlan && payment) {
    //   try {
    //     // Verify payment with provider
    //     if (payment.provider === 'razorpay') {
    //       const RazorpayService = BillingService.getProvider('razorpay');
    //       if (RazorpayService && RazorpayService.isConfigured()) {
    //         // Verify payment signature
    //         const isValid = await RazorpayService.verifyPayment({
    //           orderId: payment.orderId,
    //           paymentId: payment.paymentId,
    //           signature: payment.signature
    //         });
    //
    //         if (!isValid) {
    //           await session.abortTransaction();
    //           return res.status(400).json({
    //             success: false,
    //             message: 'Payment verification failed. Please try again.'
    //           });
    //         }
    //       }
    //     }
    //     // For Stripe, payment is verified via webhook, so we trust the sessionId
    //   } catch (verifyError) {
    //     console.error('Payment verification error:', verifyError);
    //     await session.abortTransaction();
    //     return res.status(400).json({
    //       success: false,
    //       message: 'Payment verification failed. Please contact support.'
    //     });
    //   }
    // } else if (isPaidPlan && !payment) {
    //   // Paid plan but no payment data
    //   await session.abortTransaction();
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Payment is required for this plan.'
    //   });
    // }

    // TEMP: Log warning for paid plans without payment during testing
    if (isPaidPlan) {
      console.log('⚠️ WARNING: Payment verification is disabled. Plan applied without payment verification.');
      console.log(`   Plan: ${actualPlanName}, User: ${userId}`);
    }
    // ============================================

    // Get plan limits and features from the plan document or use defaults
    let planLimits = {};
    let planFeatures = {};

    if (plan) {
      // Use the selected plan's limits and features
      planLimits = plan.limits || {};
      planFeatures = plan.features || {};
    } else {
      // No plan selected - find the default/free plan from database
      let defaultPlan = await Plan.findOne({ isDefault: true, isActive: true }).session(session);

      if (!defaultPlan) {
        // Try to find a free plan by slug or tier
        defaultPlan = await Plan.findOne({
          $or: [
            { slug: 'free' },
            { tier: 'free' }
          ],
          isActive: true
        }).session(session);
      }

      if (defaultPlan) {
        // Use the default/free plan from database
        planLimits = defaultPlan.limits || {};
        planFeatures = defaultPlan.features || {};
        actualPlanName = defaultPlan.displayName || defaultPlan.name;
      } else {
        // Fallback: Use schema defaults from Plan model (no hardcoding)
        planLimits = {
          maxUsers: 3,
          maxProjects: 3,
          maxLandingPages: 5,
          maxLandingPagesPerProject: 5,
          storageLimitMB: 1024,
          aiCallsPerMonth: 50,
          customDomains: 0
        };
        planFeatures = {
          analytics: false,
          whiteLabel: false,
          prioritySupport: false,
          customDomain: false,
          exportData: false,
          apiAccess: false,
          sso: false,
          advancedReports: false,
          teamRoles: false,
          auditLogs: false
        };
        actualPlanName = 'Free';
      }
    }

    // Generate unique slug with timestamp + nanoseconds to guarantee uniqueness
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20); // Limit length to leave room for suffix

    // Add timestamp + nanoseconds + random for guaranteed unique slug
    const now = Date.now();
    const timestamp = now.toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const nanoSuffix = process.hrtime ? process.hrtime.bigint().toString(36).slice(-4) : '';
    const slug = `${baseSlug}-${timestamp}-${randomSuffix}${nanoSuffix}`;

    // Determine subscription status
    const subscriptionStatus = isPaidPlan ? 'active' : 'active';
    const subscriptionProvider = payment?.provider || 'none';

    // Create organization
    const organization = new Organization({
      name,
      slug,
      description,
      plan: plan?.slug || actualPlanName.toLowerCase(),
      planName: actualPlanName,
      planLimits,
      features: planFeatures,
      owner: userId,
      createdBy: userId,
      subscriptionStatus,
      subscriptionProvider,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      // Store payment IDs if paid plan
      razorpayOrderId: payment?.orderId || undefined,
      razorpayPaymentId: payment?.paymentId || undefined,
      // Initialize usage with 1 user (the owner)
      usage: {
        usersCount: 1,
        projectsCount: 0,
        landingPagesCount: 0,
        storageUsedMB: 0,
        aiCallsThisMonth: 0
      }
    });

    await organization.save({ session });

    const org = organization;

    // Create membership (no role - role is on User model)
    await Membership.create([{
      userId,
      organizationId: org._id,
      status: 'active',
      joinedAt: new Date(),
      invitedBy: userId
    }], { session });

    // Create subscription record
    const subscriptionData = {
      organizationId: org._id,
      provider: subscriptionProvider,
      plan: plan?.slug || actualPlanName.toLowerCase(),
      planName: actualPlanName,
      planLimits,
      features: planFeatures,
      status: subscriptionStatus,
      billingCycle: billingCycle || 'monthly',
      // Always set amount (0 for free plans)
      amount: isPaidPlan && plan
        ? (billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice)
        : 0,
      currency: plan?.currency?.code || 'INR'
    };

    await Subscription.create([subscriptionData], { session });

    // Set user as admin (first user to create org becomes admin)
    // Also set their current organization
    await User.findByIdAndUpdate(userId, {
      role: 'admin',
      currentOrganization: org._id
    }, { session });

    // Log action
    await UsageLog.logAction({
      organizationId: org._id,
      userId,
      userRole: 'admin',
      action: 'org.create',
      resource: 'organization',
      resourceId: org._id,
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path
      }
    });

    await session.commitTransaction();

    console.log('=== Organization created successfully, about to send email ===');
    console.log('Org:', org.name);
    console.log('Owner:', req.user?.name, req.user?.email);
    console.log('Plan:', plan?.name);

    // Send email notification to platform admins (async, don't block)
    emailService.sendOrgRegistrationNotification(org, req.user, plan)
      .catch(err => console.error('Failed to send org registration notification:', err));

    // Populate owner info
    await org.populate('owner', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: {
        organization: org,
        membership: {
          status: 'active'
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create organization error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Organization slug already exists. Please choose a different name.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create organization',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get user's organizations
 * @route   GET /api/organizations
 * @access  Private
 */
exports.getOrganizations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all memberships for user
    const memberships = await Membership.find({
      userId,
      status: 'active'
    })
      .populate('organizationId')
      .sort({ createdAt: 1 });

    // Get user's role from User model
    const user = await User.findById(userId).select('role');

    const organizations = memberships.map(membership => ({
      organization: membership.organizationId,
      membership: {
        status: membership.status,
        joinedAt: membership.joinedAt
      }
    }));

    res.json({
      success: true,
      data: organizations,
      currentOrganization: req.user.currentOrganization,
      userRole: user.role
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organizations'
    });
  }
};

/**
 * @desc    Get organization by ID
 * @route   GET /api/organizations/:id
 * @access  Private
 */
exports.getOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify membership
    const membership = await Membership.findOne({
      userId,
      organizationId: id,
      status: 'active'
    }).populate('organizationId');

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this organization'
      });
    }

    // Get user's role from User model
    const user = await User.findById(userId).select('role');

    // Get usage stats
    const organization = membership.organizationId;

    res.json({
      success: true,
      data: {
        organization,
        membership: {
          status: membership.status,
          joinedAt: membership.joinedAt
        },
        userRole: user.role
      }
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organization'
    });
  }
};

/**
 * @desc    Update organization
 * @route   PUT /api/organizations/:id
 * @access  Private (Admin/Platform Admin only)
 */
exports.updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check permission - only admin or platform_admin can update organization
    if (userRole !== 'admin' && userRole !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update organization settings'
      });
    }

    // Verify membership (unless platform_admin)
    if (userRole !== 'platform_admin') {
      const membership = await Membership.findOne({
        userId,
        organizationId: id,
        status: 'active'
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this organization'
        });
      }
    }

    // Allowed fields to update
    const allowedFields = ['name', 'description', 'logo', 'settings'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const organization = await Organization.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // Log action
    await UsageLog.logAction({
      organizationId: id,
      userId,
      userRole: userRole,
      action: 'org.update',
      resource: 'organization',
      resourceId: id,
      changes: {
        before: organization,
        after: updates
      },
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: organization
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organization'
    });
  }
};

/**
 * @desc    Switch current organization
 * @route   PUT /api/organizations/:id/switch
 * @access  Private
 */
exports.switchOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify membership
    const membership = await Membership.findOne({
      userId,
      organizationId: id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this organization'
      });
    }

    // Update user's current organization
    await User.findByIdAndUpdate(userId, {
      currentOrganization: id
    });

    // Update session if exists
    if (req.session) {
      req.session.organizationId = id;
    }

    res.json({
      success: true,
      message: 'Switched organization successfully',
      data: {
        organizationId: id,
        role: membership.role
      }
    });
  } catch (error) {
    console.error('Switch organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to switch organization'
    });
  }
};

/**
 * @desc    Get organization members
 * @route   GET /api/organizations/:id/members
 * @access  Private
 */
exports.getMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify membership
    const userMembership = await Membership.findOne({
      userId,
      organizationId: id,
      status: 'active'
    });

    if (!userMembership) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this organization'
      });
    }

    // Get all members with user info (including role from User model)
    const memberships = await Membership.find({
      organizationId: id,
      status: { $ne: 'removed' }
    })
      .populate('userId', 'name email avatar isActive lastLogin role')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: 1 });

    const members = memberships.map(m => ({
      _id: m._id,
      user: m.userId,
      // Role comes from User model, not Membership
      role: m.userId?.role || 'performance_marketer',
      status: m.status,
      department: m.department,
      jobTitle: m.jobTitle,
      joinedAt: m.joinedAt,
      invitedBy: m.invitedBy,
      lastActiveAt: m.lastActiveAt
    }));

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organization members'
    });
  }
};

/**
 * @desc    Invite member to organization
 * @route   POST /api/organizations/:id/invite
 * @access  Private (Admin only)
 */
exports.inviteMember = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { email, role = 'performance_marketer', department, jobTitle, message } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check permission - only admin can invite members
    if (userRole !== 'admin' && userRole !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only organization admins can invite members'
      });
    }

    // Verify membership (unless platform_admin)
    if (userRole !== 'platform_admin') {
      const membership = await Membership.findOne({
        userId,
        organizationId: id,
        status: 'active'
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this organization'
        });
      }
    }

    // Validate role
    const validRoles = [
      'admin',
      'performance_marketer',
      'graphic_designer',
      'video_editor',
      'ui_ux_designer',
      'developer',
      'tester',
      'content_writer',
      'content_creator'
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }

    // Check organization limits - count actual members from database
    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const currentUsersCount = await Membership.countDocuments({
      organizationId: id,
      status: 'active'
    });

    // Get maxUsers with fallback chain
    let maxUsers = organization.planLimits?.maxUsers;

    // Detailed logging for debugging
    console.log('='.repeat(60));
    console.log('[inviteMember] USER LIMIT VALIDATION');
    console.log('='.repeat(60));
    console.log(`  Organization ID: ${id}`);
    console.log(`  Organization Name: ${organization.name}`);
    console.log(`  Organization Plan: ${organization.plan} / ${organization.planName}`);
    console.log(`  Current Users Count: ${currentUsersCount}`);
    console.log(`  maxUsers from planLimits: ${maxUsers}`);
    console.log(`  planLimits object:`, JSON.stringify(organization.planLimits, null, 2));
    console.log(`  Checking condition:`);
    console.log(`    - maxUsers !== undefined: ${maxUsers !== undefined}`);
    console.log(`    - maxUsers !== null: ${maxUsers !== null}`);
    console.log(`    - maxUsers !== -1: ${maxUsers !== -1}`);
    console.log(`    - currentUsersCount >= maxUsers: ${currentUsersCount >= (maxUsers || 0)}`);
    console.log('='.repeat(60));

    // -1 means unlimited, also check if maxUsers is undefined/null (no limit set)
    if (maxUsers !== undefined && maxUsers !== null && maxUsers !== -1 && currentUsersCount >= maxUsers) {
      console.log(`[inviteMember] ❌ LIMIT EXCEEDED - Blocking invitation`);
      return res.status(402).json({
        success: false,
        message: `You have reached your plan limit for users (${maxUsers} users maximum). Please upgrade your plan to invite more team members.`,
        code: 'LIMIT_EXCEEDED',
        limit: maxUsers,
        current: currentUsersCount,
        resourceType: 'users'
      });
    }

    console.log(`[inviteMember] ✅ LIMIT CHECK PASSED - Proceeding with invitation`);

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    // Check for pending invitation
    const existingInvitation = await Invitation.findOne({
      organizationId: id,
      email: email.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'An invitation is already pending for this email'
      });
    }

    // Create invitation
    const invitation = await Invitation.create([{
      organizationId: id,
      email: email.toLowerCase(),
      role, // This will be the User.role for the invited user
      invitedBy: userId,
      department,
      jobTitle,
      message
    }], { session });

    // Log action
    await UsageLog.logAction({
      organizationId: id,
      userId,
      userRole: userRole,
      action: 'org.member_invite',
      resource: 'invitation',
      resourceId: invitation[0]._id,
      details: { email, role },
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    }, { session });

    await session.commitTransaction();

    // Send invitation email (async, don't block)
    emailService.sendTeamInvitation(invitation[0], organization, req.user)
      .catch(err => console.error('Failed to send team invitation email:', err));

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitation: invitation[0],
        existingUser: !!existingUser
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Invite member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitation'
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Accept invitation
 * @route   POST /api/invitations/accept/:token
 * @access  Public (requires valid token)
 *
 * When a user accepts an invitation:
 * 1. If new user: They register with the role specified in the invitation
 * 2. If existing user: Their role is updated to match the invitation
 */
exports.acceptInvitation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { token } = req.params;
    const userId = req.user?._id;

    // Find invitation
    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('organizationId');

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation'
      });
    }

    // Check if user is logged in
    if (!userId) {
      // Return invitation details for registration
      return res.json({
        success: true,
        requiresAuth: true,
        data: {
          email: invitation.email,
          organization: invitation.organizationId,
          role: invitation.role
        }
      });
    }

    // Check if user email matches invitation
    const user = await User.findById(userId);
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'This invitation is for a different email address'
      });
    }

    // Check if already a member
    const existingMembership = await Membership.findOne({
      userId,
      organizationId: invitation.organizationId._id
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this organization'
      });
    }

    // Check organization user limit before accepting invitation
    const currentUsersCount = await Membership.countDocuments({
      organizationId: invitation.organizationId._id,
      status: 'active'
    });
    const maxUsers = invitation.organizationId.planLimits?.maxUsers;

    console.log(`[acceptInvitation] Limit check: currentUsers=${currentUsersCount}, maxUsers=${maxUsers}, planLimits=`, invitation.organizationId.planLimits);

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

    // Create membership (no role - role is on User model)
    await Membership.create([{
      userId,
      organizationId: invitation.organizationId._id,
      status: 'active',
      joinedAt: new Date(),
      invitedBy: invitation.invitedBy,
      department: invitation.department,
      jobTitle: invitation.jobTitle
    }], { session });

    // Update user's role to match invitation
    await User.findByIdAndUpdate(userId, {
      role: invitation.role,
      currentOrganization: invitation.organizationId._id
    }, { session });

    // Update invitation
    await invitation.updateOne({
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: new Date()
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
};

/**
 * @desc    Update member role (changes User.role)
 * @route   PUT /api/organizations/:id/members/:userId/role
 * @access  Private (Admin only)
 *
 * Note: This updates the User's role globally (single role per account)
 */
exports.updateMemberRole = async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user._id;
    const currentUserRole = req.user.role;

    // Check permission - only admin or platform_admin can change roles
    if (currentUserRole !== 'admin' && currentUserRole !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update member roles'
      });
    }

    // Validate role
    const validRoles = [
      'admin',
      'performance_marketer',
      'graphic_designer',
      'video_editor',
      'ui_ux_designer',
      'developer',
      'tester',
      'content_writer',
      'content_creator'
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }

    // Cannot change to platform_admin
    if (role === 'platform_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign platform_admin role. This can only be set by system.'
      });
    }

    // Find target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot modify platform_admin
    if (targetUser.role === 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify platform administrator'
      });
    }

    // Verify membership (unless platform_admin)
    if (currentUserRole !== 'platform_admin') {
      const targetMembership = await Membership.findOne({
        userId: targetUserId,
        organizationId: id
      });

      if (!targetMembership) {
        return res.status(404).json({
          success: false,
          message: 'Member not found in this organization'
        });
      }
    }

    // Update user's role
    targetUser.role = role;
    await targetUser.save();

    // Log action
    await UsageLog.logAction({
      organizationId: id,
      userId: currentUserId,
      userRole: currentUserRole,
      action: 'org.member_role_change',
      resource: 'user',
      resourceId: targetUserId,
      details: {
        targetUser: targetUserId,
        newRole: role
      },
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: {
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role
        }
      }
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update member role'
    });
  }
};

/**
 * @desc    Remove member from organization
 * @route   DELETE /api/organizations/:id/members/:userId
 * @access  Private (Admin only)
 */
exports.removeMember = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id, userId: targetUserId } = req.params;
    const currentUserId = req.user._id;
    const currentUserRole = req.user.role;

    // Check permission - only admin or platform_admin can remove members
    if (currentUserRole !== 'admin' && currentUserRole !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to remove members'
      });
    }

    // Find target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot remove platform_admin
    if (targetUser.role === 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot remove platform administrator'
      });
    }

    // Find target membership
    const targetMembership = await Membership.findOne({
      userId: targetUserId,
      organizationId: id
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this organization'
      });
    }

    // Remove membership - use save() instead of updateOne() for proper session handling
    targetMembership.status = 'removed';
    await targetMembership.save({ session });

    // Update organization usage
    await Organization.findByIdAndUpdate(
      id,
      { $inc: { 'usage.usersCount': -1 } },
      { session }
    );

    // Check if user has any other active memberships
    const remainingMemberships = await Membership.countDocuments({
      userId: targetUserId,
      status: 'active'
    }).session(session);

    // If no active memberships left, deactivate the user
    if (remainingMemberships === 0) {
      await User.findByIdAndUpdate(targetUserId, {
        isActive: false,
        currentOrganization: null
      }, { session });
    }

    // Log action
    await UsageLog.logAction({
      organizationId: id,
      userId: currentUserId,
      userRole: currentUserRole,
      action: 'org.member_remove',
      resource: 'membership',
      resourceId: targetMembership._id,
      details: {
        removedUser: targetUserId
      },
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    }, { session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member'
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Delete organization (soft delete)
 * @route   DELETE /api/organizations/:id
 * @access  Private (Admin only)
 */
exports.deleteOrganization = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check permission - only admin or platform_admin can delete
    if (userRole !== 'admin' && userRole !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only organization admin can delete the organization'
      });
    }

    // Verify membership (unless platform_admin)
    if (userRole !== 'platform_admin') {
      const membership = await Membership.findOne({
        userId,
        organizationId: id,
        status: 'active'
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this organization'
        });
      }
    }

    // Get all users who are members of this organization
    const orgMembers = await Membership.find({ organizationId: id }).session(session);
    const memberUserIds = orgMembers.map(m => m.userId);

    // Soft delete organization
    await Organization.findByIdAndUpdate(id, {
      isActive: false
    }, { session });

    // Deactivate all memberships for this organization
    await Membership.updateMany({
      organizationId: id
    }, {
      status: 'removed'
    }, { session });

    // For each user who was a member, check if they have any other active memberships
    for (const memberId of memberUserIds) {
      const activeMemberships = await Membership.countDocuments({
        userId: memberId,
        status: 'active'
      }).session(session);

      // If no active memberships left, deactivate the user
      if (activeMemberships === 0) {
        await User.findByIdAndUpdate(memberId, {
          isActive: false,
          currentOrganization: null
        }, { session });
      }
    }

    // Log action
    await UsageLog.logAction({
      organizationId: id,
      userId,
      userRole: userRole,
      action: 'org.delete',
      resource: 'organization',
      resourceId: id,
      request: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    }, { session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Delete organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete organization'
    });
  } finally {
    session.endSession();
  }
};