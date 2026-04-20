const mongoose = require('mongoose');

/**
 * Membership Model (Simplified)
 *
 * Junction collection between Users and Organizations.
 * Role is stored on User model (single role per account).
 * This model only tracks organization membership status.
 */

const membershipSchema = new mongoose.Schema({
  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'removed'],
    default: 'pending'
  },

  // Invitation tracking
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitedAt: {
    type: Date
  },
  joinedAt: {
    type: Date
  },

  // User preferences for this organization
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    taskReminders: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: true },
    projectUpdates: { type: Boolean, default: true }
  },

  // User's display name in this organization (optional)
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },

  // Department/team within organization (optional)
  department: {
    type: String,
    trim: true
  },

  // Job title within organization (optional)
  jobTitle: {
    type: String,
    trim: true
  },

  // Last activity
  lastActiveAt: {
    type: Date,
    default: Date.now
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

/**
 * PRE-SAVE HOOK: Validate organization user limit
 * This runs BEFORE any membership is saved to the database
 * It catches ALL user additions regardless of which API endpoint is used
 */
membershipSchema.pre('save', async function(next) {
  // Check if this is a new active membership OR status is changing to 'active'
  const isNewActive = this.isNew && this.status === 'active';
  const isBecomingActive = !this.isNew && this.isModified('status') && this.status === 'active';

  if (isNewActive || isBecomingActive) {
    try {
      const Organization = mongoose.model('Organization');

      // Get the session from the document (for transaction support)
      const session = this.$session();

      // Get the organization (use session if available)
      const organization = await Organization.findById(this.organizationId).session(session);

      if (!organization) {
        const error = new Error('Organization not found');
        error.code = 'ORG_NOT_FOUND';
        return next(error);
      }

      // Count current active members (excluding the one being added)
      const currentCount = await mongoose.model('Membership').countDocuments({
        organizationId: this.organizationId,
        status: 'active'
      }).session(session);

      // Get the maxUsers limit
      const maxUsers = organization.planLimits?.maxUsers;

      console.log('='.repeat(60));
      console.log('[Membership.pre-save] USER LIMIT VALIDATION');
      console.log('='.repeat(60));
      console.log(`  Organization: ${organization.name} (${this.organizationId})`);
      console.log(`  Current members: ${currentCount}`);
      console.log(`  maxUsers limit: ${maxUsers}`);
      console.log(`  Is new: ${this.isNew}`);
      console.log(`  Status modified: ${this.isModified ? this.isModified('status') : 'N/A'}`);
      console.log(`  Action: ${isNewActive ? 'New member' : 'Status change to active'}`);
      console.log(`  Session: ${session ? 'Yes' : 'No'}`);
      console.log('='.repeat(60));

      // -1 means unlimited
      if (maxUsers !== undefined && maxUsers !== null && maxUsers !== -1) {
        if (currentCount >= maxUsers) {
          console.log(`[Membership.pre-save] ❌ LIMIT EXCEEDED - Blocking`);
          const error = new Error(
            `LIMIT_EXCEEDED: Organization has reached its user limit (${maxUsers} users maximum). ` +
            `Current: ${currentCount}, Max: ${maxUsers}. ` +
            `Please upgrade the plan to add more team members.`
          );
          error.code = 'LIMIT_EXCEEDED';
          error.limit = maxUsers;
          error.current = currentCount;
          error.resourceType = 'users';
          return next(error);
        }
      }

      console.log(`[Membership.pre-save] ✅ LIMIT OK - Proceeding`);
    } catch (err) {
      console.error('[Membership.pre-save] Error:', err);
      return next(err);
    }
  }

  next();
});

// Compound index for unique membership
membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

// Index for querying by organization
membershipSchema.index({ organizationId: 1, status: 1 });

// Index for querying by user
membershipSchema.index({ userId: 1, status: 1 });

// Static method to get all members of organization
membershipSchema.statics.getOrganizationMembers = async function(organizationId, options = {}) {
  const query = { organizationId, status: { $ne: 'removed' } };

  const memberships = await this.find(query)
    .populate('userId', 'name email avatar isActive role lastLogin')
    .populate('invitedBy', 'name email')
    .sort({ createdAt: 1 });

  return memberships;
};

// Static method to get user's organizations
membershipSchema.statics.getUserOrganizations = async function(userId) {
  const memberships = await this.find({
    userId,
    status: 'active'
  })
    .populate('organizationId')
    .sort({ createdAt: -1 });

  return memberships;
};

// Static method to check if user is member of organization
membershipSchema.statics.isMember = async function(userId, organizationId) {
  const membership = await this.findOne({
    userId,
    organizationId,
    status: 'active'
  });
  return !!membership;
};

// Static method to get active membership
membershipSchema.statics.getActiveMembership = async function(userId, organizationId) {
  return this.findOne({
    userId,
    organizationId,
    status: 'active'
  });
};

// Method to check if membership is active
membershipSchema.methods.isActive = function() {
  return this.status === 'active';
};

module.exports = mongoose.model('Membership', membershipSchema);