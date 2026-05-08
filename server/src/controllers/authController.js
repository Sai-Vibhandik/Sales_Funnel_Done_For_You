const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { buildUrl } = require('../utils/urlHelper');
const baseTemplate = require('../utils/emailTemplates/baseTemplate');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'performance_marketer'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        availability: user.availability,
        avatar: user.avatar,
        currentOrganization: user.currentOrganization
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const { name, email, specialization, availability } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
      fieldsToUpdate.email = email;
    }
    if (specialization) fieldsToUpdate.specialization = specialization;
    if (availability) fieldsToUpdate.availability = availability;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all team members (within organization)
// @route   GET /api/auth/team
// @access  Private (Admin only)
exports.getTeamMembers = async (req, res, next) => {
  try {
    const { role, availability, search } = req.query;
    const Membership = require('../models/Membership');

    // Get user IDs from memberships in the same organization
    const memberships = await Membership.find({
      organizationId: req.user.currentOrganization,
      status: 'active'
    }).select('userId');

    const userIds = memberships.map(m => m.userId);

    // Build query - only users in the same organization
    let query = {
      _id: { $in: userIds }
    };

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Filter by availability
    if (availability) {
      query.availability = availability;
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new team member
// @route   POST /api/auth/create-user
// @access  Private (Admin only)
exports.createTeamMember = async (req, res, next) => {
  try {
    const { name, email, password, role, specialization, availability, projectId, projectRole } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Validate role
    const validRoles = [
      'platform_admin',
      'admin',
      'performance_marketer',
      'ui_ux_designer',
      'graphic_designer',
      'video_editor',
      'developer',
      'tester',
      'content_creator',
      'content_writer'
    ];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }

    // ===========================================
    // CHECK ORGANIZATION USER LIMIT
    // ===========================================
    const Membership = require('../models/Membership');
    const Organization = require('../models/Organization');

    const organizationId = req.user.currentOrganization;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'No organization found for current user'
      });
    }

    // Get organization and check limits
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Count current active members
    const currentUsersCount = await Membership.countDocuments({
      organizationId: organizationId,
      status: 'active'
    });

    // Get maxUsers limit
    const maxUsers = organization.planLimits?.maxUsers;

    // Detailed logging for debugging
    console.log('='.repeat(60));
    console.log('[createTeamMember] USER LIMIT VALIDATION');
    console.log('='.repeat(60));
    console.log(`  Organization ID: ${organizationId}`);
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
      console.log(`[createTeamMember] ❌ LIMIT EXCEEDED - Blocking user creation`);
      return res.status(402).json({
        success: false,
        message: `You have reached your plan limit for users (${maxUsers} users maximum). Please upgrade your plan to add more team members.`,
        code: 'LIMIT_EXCEEDED',
        limit: maxUsers,
        current: currentUsersCount,
        resourceType: 'users'
      });
    }

    console.log(`[createTeamMember] ✅ LIMIT CHECK PASSED - Proceeding with user creation`);
    // ===========================================
    // END LIMIT CHECK
    // ===========================================

    // Create user with all fields
    const userData = {
      name,
      email,
      password,
      role: role || 'performance_marketer',
      specialization: specialization || '',
      availability: availability || 'available',
      isActive: true,
      currentOrganization: req.user.currentOrganization // Add to same organization
    };

    const user = await User.create(userData);

    // Create membership for the user
    await Membership.create({
      userId: user._id,
      organizationId: req.user.currentOrganization,
      status: 'active',
      invitedBy: req.user._id,
      joinedAt: new Date()
    });

    // Update organization usage count
    await Organization.findByIdAndUpdate(
      req.user.currentOrganization,
      { $inc: { 'usage.usersCount': 1 } }
    );
    console.log(`[createTeamMember] ✅ Updated organization usersCount`);

    // If projectId is provided, assign user to project
    if (projectId && projectRole) {
      try {
        const Project = require('../models/Project');
        const project = await Project.findOne({
          _id: projectId,
          organizationId: req.user.currentOrganization
        });

        if (project) {
          // Map role to project team field
          const roleToTeamField = {
            'performance_marketer': 'performanceMarketer',
            'content_creator': 'contentCreator',
            'content_writer': 'contentWriter',
            'ui_ux_designer': 'uiUxDesigner',
            'graphic_designer': 'graphicDesigner',
            'video_editor': 'videoEditor',
            'developer': 'developer',
            'tester': 'tester'
          };

          const teamField = roleToTeamField[projectRole];
          if (teamField) {
            project.assignedTeam[teamField] = user._id;
            await project.save();
          }
        }
      } catch (projectError) {
        console.error('Error assigning user to project:', projectError);
        // Don't fail user creation if project assignment fails
      }
    }

    // Return created user (without password)
    const createdUser = await User.findById(user._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      data: createdUser
    });
  } catch (error) {
    console.error('Error creating team member:', error);

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

    // Handle specific errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    next(error);
  }
};

// @desc    Update team member
// @route   PUT /api/auth/users/:id
// @access  Private (Admin only)
exports.updateTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, specialization, availability, isActive } = req.body;
    const Membership = require('../models/Membership');

    // Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Verify user is in the same organization
    const membership = await Membership.findOne({
      userId: id,
      organizationId: req.user.currentOrganization
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You can only update users in your organization'
      });
    }

    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (email !== undefined) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
      fieldsToUpdate.email = email;
    }
    if (role !== undefined) {
      // Validate role
      const validRoles = [
        'admin',
        'performance_marketer',
        'ui_ux_designer',
        'graphic_designer',
        'video_editor',
        'developer',
        'tester',
        'content_creator',
        'content_writer'
      ];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
        });
      }
      fieldsToUpdate.role = role;
    }
    if (specialization !== undefined) fieldsToUpdate.specialization = specialization;
    if (availability !== undefined) {
      // Validate availability
      const validAvailability = ['available', 'busy', 'offline'];
      if (!validAvailability.includes(availability)) {
        return res.status(400).json({
          success: false,
          message: `Invalid availability. Valid values are: ${validAvailability.join(', ')}`
        });
      }
      fieldsToUpdate.availability = availability;
    }
    if (isActive !== undefined) fieldsToUpdate.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Team member updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    next(error);
  }
};

// @desc    Delete/Deactivate team member
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin only)
exports.deleteTeamMember = async (req, res, next) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const Membership = require('../models/Membership');
    const Organization = require('../models/Organization');

    // Verify user is in the same organization
    const membership = await Membership.findOne({
      userId: id,
      organizationId: req.user.currentOrganization
    }).session(session);

    if (!membership) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'You can only delete users in your organization'
      });
    }

    const user = await User.findById(id).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (id === req.user._id.toString()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Set membership status to 'removed' (soft delete) instead of hard delete
    membership.status = 'removed';
    await membership.save({ session });

    // Decrement organization usage count
    await Organization.findByIdAndUpdate(
      req.user.currentOrganization,
      { $inc: { 'usage.usersCount': -1 } },
      { session }
    );

    // Soft delete - just deactivate the user
    user.isActive = false;
    await user.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Permanently delete a team member
// @route   DELETE /api/auth/users/:id/permanent
// @access  Private (Admin only)
exports.permanentDeleteTeamMember = async (req, res, next) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const Membership = require('../models/Membership');
    const Organization = require('../models/Organization');

    // Verify user is in the same organization
    const membership = await Membership.findOne({
      userId: id,
      organizationId: req.user.currentOrganization
    }).session(session);

    if (!membership) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'You can only delete users in your organization'
      });
    }

    const user = await User.findById(id).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (id === req.user._id.toString()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Prevent deletion if user is currently assigned to active projects
    const Project = require('../models/Project');
    const assignedProjects = await Project.find({
      $or: [
        { 'assignedTeam.performanceMarketer': id },
        { 'assignedTeam.contentCreator': id },
        { 'assignedTeam.contentWriter': id },
        { 'assignedTeam.uiUxDesigner': id },
        { 'assignedTeam.graphicDesigner': id },
        { 'assignedTeam.videoEditor': id },
        { 'assignedTeam.developer': id },
        { 'assignedTeam.tester': id },
        { 'assignedTeam.performanceMarketers': id },
        { 'assignedTeam.contentWriters': id },
        { 'assignedTeam.uiUxDesigners': id },
        { 'assignedTeam.graphicDesigners': id },
        { 'assignedTeam.videoEditors': id },
        { 'assignedTeam.developers': id },
        { 'assignedTeam.testers': id }
      ],
      isActive: true
    }).session(session);

    if (assignedProjects.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot permanently delete user. They are assigned to ${assignedProjects.length} active project(s). Remove them from projects first.`
      });
    }

    // Delete membership first
    await Membership.deleteOne({ userId: id, organizationId: req.user.currentOrganization }).session(session);

    // Decrement organization usage count
    await Organization.findByIdAndUpdate(
      req.user.currentOrganization,
      { $inc: { 'usage.usersCount': -1 } },
      { session }
    );

    // Check if user has any other memberships
    const otherMemberships = await Membership.countDocuments({ userId: id }).session(session);

    // Only permanently delete user if they have no other memberships
    if (otherMemberships === 0) {
      await User.findByIdAndDelete(id).session(session);
    } else {
      // User is in other organizations, just deactivate
      user.isActive = false;
      await user.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'User permanently deleted'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get team members by role
// @route   GET /api/auth/team/by-role
// @access  Private
exports.getTeamByRole = async (req, res, next) => {
  try {
    const Membership = require('../models/Membership');

    // Get user IDs from memberships in the same organization
    const memberships = await Membership.find({
      organizationId: req.user.currentOrganization,
      status: 'active'
    }).select('userId');

    const userIds = memberships.map(m => m.userId);

    const roles = [
      'admin',
      'performance_marketer',
      'content_creator',
      'content_writer',
      'ui_ux_designer',
      'graphic_designer',
      'video_editor',
      'developer',
      'tester'
    ];

    const teamByRole = {};

    for (const role of roles) {
      const members = await User.find({
        _id: { $in: userIds },
        role,
        isActive: true
      }).select('name email specialization availability avatar');

      teamByRole[role] = members;
    }

    res.status(200).json({
      success: true,
      data: teamByRole
    });
  } catch (error) {
    console.error('getTeamByRole error:', error);
    next(error);
  }
};

// @desc    Debug: Test database connection and user creation
// @route   GET /api/auth/debug/test-db
// @access  Private (Admin only)
exports.debugTestDb = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');

    // Test database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Count users
    const userCount = await User.countDocuments();
    const activeUserCount = await User.countDocuments({ isActive: true });

    // Test user creation (dry run - just validate)
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'test123',
      role: 'performance_marketer'
    };

    // Check if test email exists
    const existingTestUser = await User.findOne({ email: testUser.email });

    res.status(200).json({
      success: true,
      data: {
        database: {
          state: dbStates[dbState],
          readyState: dbState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        },
        users: {
          total: userCount,
          active: activeUserCount
        },
        testUser: {
          canCreate: !existingTestUser,
          existingTestUser: existingTestUser ? { email: existingTestUser.email, role: existingTestUser.role } : null
        }
      }
    });
  } catch (error) {
    console.error('Debug test error:', error);
    next(error);
  }
};

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal whether user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If a user with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();

    // Save user with reset token
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = buildUrl(`/reset-password/${resetToken}`);

    // Create email message
    const message = `
You are receiving this email because you (or someone else) has requested a password reset for your account.

Please click on the following link to reset your password:
${resetUrl}

This link will expire in 10 minutes.

If you did not request this, please ignore this email and your password will remain unchanged.
`;

    const content = `
      <p class="greeting">Dear ${user.name || 'User'},</p>
      <p>We received a request to reset the password for your Growth Valley account. If you made this request, please click the button below to create a new password.</p>

      <div class="button-wrapper">
        <a href="${resetUrl}" class="primary-button">Reset Password</a>
      </div>

      <p class="text-center text-muted text-small">
        Or copy and paste this link into your browser:<br>
        <a href="${resetUrl}" class="secondary-link" style="font-size: 12px; word-break: break-all;">${resetUrl}</a>
      </p>

      <div class="alert alert-warning">
        <div class="alert-title">Security Notice</div>
        <p style="margin: 8px 0 0;">This password reset link will expire in <strong>10 minutes</strong> for your security. If you do not reset your password within this time, you will need to request a new link.</p>
      </div>

      <hr class="divider">

      <p class="text-center text-muted text-small">
        If you did not request this password reset, you may safely ignore this email. Your password will remain unchanged.
      </p>
    `;

    const html = baseTemplate(content, { title: 'Password Reset' });

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset - Growth Valley Dashboard',
        message,
        html,
        resetUrl
      });

      res.status(200).json({
        success: true,
        message: 'If a user with that email exists, a password reset link has been sent.'
      });
    } catch (err) {
      console.error('Email sending error:', err);

      // Clear reset token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Hash the token to compare with stored hash
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new token for auto-login
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: jwtToken
    });
  } catch (error) {
    next(error);
  }
};