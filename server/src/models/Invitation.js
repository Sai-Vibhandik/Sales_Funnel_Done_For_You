const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Invitation Model (Simplified)
 *
 * Handles team member invitations to organizations.
 * Token-based invitation system with expiry.
 *
 * Note: Role is assigned to User model (single role per account)
 */

const invitationSchema = new mongoose.Schema({
  // Organization
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Invitee details
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },

  // Role to assign (on User model - single role per account)
  role: {
    type: String,
    enum: [
      'admin',
      'performance_marketer',
      'graphic_designer',
      'video_editor',
      'ui_ux_designer',
      'developer',
      'tester',
      'content_writer',
      'content_creator'
    ],
    default: 'performance_marketer'
  },

  // Who sent the invitation
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Invitation token
  token: {
    type: String,
    unique: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'canceled'],
    default: 'pending'
  },

  // Expiry (7 days default)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },

  // User who accepted (if accepted)
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: {
    type: Date
  },

  // Decline/cancel info
  declinedAt: {
    type: Date
  },
  canceledAt: {
    type: Date
  },
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Personal message (optional)
  message: {
    type: String,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },

  // Department/team assignment (optional)
  department: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },

  // Resend tracking
  sendCount: {
    type: Number,
    default: 1
  },
  lastSentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate token before saving
invitationSchema.pre('save', function(next) {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Indexes (token index is already created by unique: true in schema)
invitationSchema.index({ organizationId: 1, email: 1, status: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
invitationSchema.index({ invitedBy: 1, status: 1 });

// Static method to find valid invitation by token
invitationSchema.statics.findValidByToken = async function(token) {
  const invitation = await this.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('organizationId invitedBy');

  return invitation;
};

// Static method to find pending invitations for email
invitationSchema.statics.findPendingForEmail = async function(email) {
  const invitations = await this.find({
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('organizationId invitedBy');

  return invitations;
};

// Static method to check if user has pending invitation
invitationSchema.statics.hasPendingInvitation = async function(organizationId, email) {
  const count = await this.countDocuments({
    organizationId,
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });

  return count > 0;
};

// Static method to get organization's invitations
invitationSchema.statics.getOrganizationInvitations = async function(organizationId, options = {}) {
  const query = { organizationId };

  if (options.status) {
    query.status = options.status;
  } else {
    query.status = { $ne: 'canceled' };
  }

  const invitations = await this.find(query)
    .populate('invitedBy', 'name email')
    .populate('acceptedBy', 'name email')
    .sort({ createdAt: -1 });

  return invitations;
};

// Method to check if invitation is expired
invitationSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

// Method to check if invitation is pending
invitationSchema.methods.isPending = function() {
  return this.status === 'pending' && !this.isExpired();
};

// Method to accept invitation
invitationSchema.methods.accept = async function(userId) {
  this.status = 'accepted';
  this.acceptedBy = userId;
  this.acceptedAt = new Date();
  return this.save();
};

// Method to decline invitation
invitationSchema.methods.decline = async function() {
  this.status = 'declined';
  this.declinedAt = new Date();
  return this.save();
};

// Method to cancel invitation
invitationSchema.methods.cancel = async function(canceledByUserId) {
  this.status = 'canceled';
  this.canceledBy = canceledByUserId;
  this.canceledAt = new Date();
  return this.save();
};

// Method to resend invitation
invitationSchema.methods.resend = async function() {
  // Reset expiry to 7 days from now
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  this.status = 'pending';
  this.sendCount += 1;
  this.lastSentAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Invitation', invitationSchema);