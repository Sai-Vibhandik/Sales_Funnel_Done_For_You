const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const Organization = require('../models/Organization');

/**
 * Tenant Middleware (Simplified)
 *
 * Provides row-level security for multi-tenancy.
 * Uses User.role for authorization (single role per account).
 * All requests are scoped to a single organization.
 */

/**
 * Set tenant context from request
 *
 * Priority order:
 * 1. X-Organization-Id header (for API calls)
 * 2. User's currentOrganization field (for session-based auth)
 * 3. User's first organization (fallback)
 */
const setTenantContext = async (req, res, next) => {
  try {
    // Skip if no user (public routes)
    if (!req.user) {
      return next();
    }

    let organizationId = null;
    let membership = null;

    // 1. Check X-Organization-Id header
    const headerOrgId = req.headers['x-organization-id'];
    if (headerOrgId) {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(headerOrgId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid organization ID format'
        });
      }

      // Verify user has access to this organization
      membership = await Membership.findOne({
        userId: req.user._id,
        organizationId: headerOrgId,
        status: 'active'
      }).populate('organizationId');

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this organization'
        });
      }

      organizationId = headerOrgId;
    }
    // 2. Check user's current organization
    else if (req.user.currentOrganization) {
      membership = await Membership.findOne({
        userId: req.user._id,
        organizationId: req.user.currentOrganization,
        status: 'active'
      }).populate('organizationId');

      if (membership) {
        organizationId = req.user.currentOrganization;
      }
    }
    // 3. Get user's first active organization
    else {
      membership = await Membership.findOne({
        userId: req.user._id,
        status: 'active'
      })
        .populate('organizationId')
        .sort({ createdAt: 1 });

      if (membership) {
        organizationId = membership.organizationId._id;

        // Update user's current organization
        await mongoose.model('User').findByIdAndUpdate(
          req.user._id,
          { currentOrganization: organizationId }
        );
      }
    }

    // If still no organization, check if user needs to create one
    if (!organizationId) {
      // Platform admins don't need an organization
      if (req.user.role === 'platform_admin') {
        // Continue without organization context for platform admin
        return next();
      }

      // Check if this is an organization creation route
      const allowedRoutes = [
        '/api/organizations',
        '/api/auth/me',
        '/api/auth/logout'
      ];

      const isAllowed = allowedRoutes.some(route =>
        req.originalUrl.startsWith(route)
      );

      if (isAllowed) {
        // Continue without organization context
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'You need to create or join an organization first',
        code: 'NO_ORGANIZATION'
      });
    }

    // Set tenant context
    req.organizationId = organizationId;
    req.organization = membership.organizationId;
    req.membership = membership;
    // Use User.role for authorization (single role per account)
    req.userRole = req.user.role;

    // Update last active timestamp
    await Membership.findByIdAndUpdate(membership._id, {
      lastActiveAt: new Date()
    });

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting tenant context'
    });
  }
};

/**
 * Require organization context
 * Ensures the request has a valid organization context
 * Platform admins can bypass this check
 */
const requireOrganization = (req, res, next) => {
  // Platform admins don't need an organization
  if (req.user?.role === 'platform_admin') {
    return next();
  }

  if (!req.organizationId) {
    return res.status(403).json({
      success: false,
      message: 'Organization context required',
      code: 'NO_ORGANIZATION'
    });
  }
  next();
};

/**
 * Check if user has required role
 * Uses User.role (single role per account)
 *
 * Role hierarchy:
 * - platform_admin: Full platform access (manages all organizations)
 * - admin: Organization admin (manages org, team, billing)
 * - Team roles: performance_marketer, graphic_designer, etc.
 */
const requireOrgRole = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required'
      });
    }

    // Platform admin has access to everything
    if (req.userRole === 'platform_admin') {
      return next();
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.userRole}' is not authorized. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Require platform admin role
 * Only platform_admin can access these routes
 */
const requirePlatformAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'platform_admin') {
    return res.status(403).json({
      success: false,
      message: 'This action requires platform administrator privileges',
      code: 'PLATFORM_ADMIN_REQUIRED'
    });
  }

  next();
};

/**
 * Require organization admin role
 * Admin or platform_admin can access these routes
 */
const requireOrgAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Platform admin has full access
  if (req.user.role === 'platform_admin') {
    return next();
  }

  // Admin role can manage organization
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'This action requires organization administrator privileges',
      code: 'ADMIN_REQUIRED'
    });
  }

  // Verify user belongs to the organization
  if (!req.organizationId || !req.membership) {
    return res.status(403).json({
      success: false,
      message: 'Organization context required',
      code: 'NO_ORGANIZATION'
    });
  }

  next();
};

/**
 * Check if user is organization member
 * Simple membership check - no role restrictions
 */
const requireOrgMember = (req, res, next) => {
  if (!req.membership) {
    return res.status(403).json({
      success: false,
      message: 'You must be a member of this organization',
      code: 'MEMBERSHIP_REQUIRED'
    });
  }

  if (req.membership.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Your membership is not active',
      code: 'MEMBERSHIP_INACTIVE'
    });
  }

  next();
};

/**
 * Check if user can access resource
 * Verifies resource belongs to user's organization
 */
const requireResourceOwnership = (modelName, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const Model = mongoose.model(modelName);
      const resourceId = req.params[resourceIdParam];

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid resource ID format'
        });
      }

      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check organization ownership
      const resourceOrgId = resource.organizationId?.toString();
      const userOrgId = req.organizationId?.toString();

      if (!resourceOrgId || resourceOrgId !== userOrgId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this resource'
        });
      }

      // Attach resource to request
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking resource ownership'
      });
    }
  };
};

/**
 * Add organization filter to query
 * Automatically adds organizationId to Mongoose queries
 */
const addOrgFilter = (req, res, next) => {
  if (req.organizationId) {
    req.query = req.query || {};
    req.query.organizationId = req.organizationId;
  }
  next();
};

/**
 * Add organization to body
 * Automatically adds organizationId to request body
 */
const addOrgToBody = (req, res, next) => {
  if (req.organizationId && req.method !== 'GET') {
    req.body = req.body || {};
    req.body.organizationId = req.organizationId;
  }
  next();
};

/**
 * Check organization limits
 * Validates against plan limits before allowing resource creation
 */
const checkOrgLimits = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return next();
      }

      // Fetch fresh organization data from database to get current usage
      const org = await Organization.findById(req.organizationId);

      if (!org) {
        return next();
      }

      const limits = org.planLimits || {};
      const usage = org.usage || {};

      let limitKey, currentCount, displayType;

      switch (resourceType) {
        case 'user':
        case 'users':
          limitKey = 'maxUsers';
          // Count actual members from database for accuracy
          currentCount = await Membership.countDocuments({
            organizationId: req.organizationId,
            status: 'active'
          });
          displayType = 'users';
          break;
        case 'project':
        case 'projects':
          limitKey = 'maxProjects';
          // Count ALL projects (isActive is for activation status, not soft-delete)
          // Projects use hard delete, so we count all existing projects
          const Project = require('../models/Project');
          currentCount = await Project.countDocuments({
            organizationId: req.organizationId
          });
          displayType = 'projects';
          break;
        case 'landingPage':
        case 'landingPages':
          limitKey = 'maxLandingPages';
          // Count actual landing pages from database for accuracy
          const LandingPage = require('../models/LandingPage');
          const ProjectModel = require('../models/Project');

          // Count standalone landing pages (isActive filter is correct for soft-delete)
          const standaloneCount = await LandingPage.countDocuments({
            organizationId: req.organizationId,
            isActive: { $ne: false }
          });

          // Count embedded landing pages in projects
          // Note: Projects use hard delete, so we count all projects regardless of isActive
          const projects = await ProjectModel.find({
            organizationId: req.organizationId
          });
          let embeddedCount = 0;
          for (const project of projects) {
            if (project.landingPages && project.landingPages.length > 0) {
              embeddedCount += project.landingPages.length;
            }
          }
          currentCount = standaloneCount + embeddedCount;
          displayType = 'landing pages';
          break;
        case 'storage':
          limitKey = 'storageLimitMB';
          currentCount = usage.storageUsedMB || 0;
          displayType = 'storage';
          break;
        case 'aiCalls':
          limitKey = 'aiCallsPerMonth';
          currentCount = usage.aiCallsThisMonth || 0;
          displayType = 'AI calls';
          break;
        default:
          return next();
      }

      const limit = limits[limitKey];

      console.log(`[checkOrgLimits] ${resourceType}: current=${currentCount}, limit=${limit}`);

      // -1 means unlimited
      if (limit === -1) {
        return next();
      }

      if (currentCount >= limit) {
        console.log(`[checkOrgLimits] Limit exceeded for ${resourceType}`);
        return res.status(402).json({
          success: false,
          message: `You have reached your plan limit for ${displayType} (${limit} ${displayType} maximum). Please upgrade your plan to add more.`,
          code: 'LIMIT_EXCEEDED',
          limit: limit,
          current: currentCount,
          resourceType: displayType
        });
      }

      next();
    } catch (error) {
      console.error('Limit check error:', error);
      next(); // Don't block on error
    }
  };
};

/**
 * Check feature access
 * Validates that organization has access to a feature
 */
const checkFeature = (featureName) => {
  return (req, res, next) => {
    if (!req.organization) {
      return next();
    }

    if (!req.organization.hasFeature(featureName)) {
      return res.status(402).json({
        success: false,
        message: `This feature requires a higher plan. Please upgrade to access ${featureName}.`,
        code: 'FEATURE_NOT_AVAILABLE',
        feature: featureName
      });
    }

    next();
  };
};

/**
 * Check subscription status
 * Ensures organization has active subscription
 */
const checkSubscription = (req, res, next) => {
  if (!req.organization) {
    return next();
  }

  const org = req.organization;

  // Check if organization is suspended
  if (org.isSuspended) {
    return res.status(403).json({
      success: false,
      message: 'Your organization account is suspended. Please contact support.',
      code: 'ORG_SUSPENDED'
    });
  }

  // Check subscription status
  const validStatuses = ['active', 'trialing'];
  if (!validStatuses.includes(org.subscriptionStatus)) {
    return res.status(402).json({
      success: false,
      message: 'Your subscription is not active. Please update your payment method.',
      code: 'SUBSCRIPTION_INACTIVE',
      status: org.subscriptionStatus
    });
  }

  // Check if trial expired
  if (org.trialEndsAt && new Date(org.trialEndsAt) < new Date()) {
    return res.status(402).json({
      success: false,
      message: 'Your trial period has ended. Please subscribe to continue.',
      code: 'TRIAL_EXPIRED'
    });
  }

  next();
};

module.exports = {
  setTenantContext,
  requireOrganization,
  requireOrgRole,
  requireOrgAdmin,
  requireOrgMember,
  requirePlatformAdmin,
  requireResourceOwnership,
  addOrgFilter,
  addOrgToBody,
  checkOrgLimits,
  checkFeature,
  checkSubscription
};