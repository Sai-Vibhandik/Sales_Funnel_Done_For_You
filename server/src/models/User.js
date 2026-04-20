const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: [
      'platform_admin',      // Platform owner - manages entire platform, prompts, plans
      'admin',               // Organization admin - manages org, team, billing
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
  specialization: {
    type: String,
    trim: true
  },
  availability: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'available'
  },
  avatar: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpire: {
    type: Date
  },

  // =====================================
  // MULTI-TENANCY: Organization Membership
  // =====================================
  // Single role per account - User.role determines everything
  // Membership tracks org membership separately (no role field)
  currentOrganization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },

  // User profile
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    timezone: { type: String, default: 'UTC' },
    avatar: String,
    preferences: {
      theme: { type: String, default: 'light' },
      language: { type: String, default: 'en' },
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true }
    }
  },

  // Account status for SaaS
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },

  // Email verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,

  // Security
  lastPasswordChange: Date,
  passwordHistory: [String],

  // Two-factor authentication (optional feature)
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  twoFactorBackupCodes: [String],

  // Login history (for security)
  loginHistory: [{
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
    successful: { type: Boolean, default: true },
    location: String
  }],

  // AI Provider preference (for content generation)
  preferredAIProvider: {
    type: String,
    enum: ['gemini', 'ollama'],
    default: 'gemini'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error('Password hashing error:', error);
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Static method to find active users by role
userSchema.statics.findActiveByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function() {
  // Generate random token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);