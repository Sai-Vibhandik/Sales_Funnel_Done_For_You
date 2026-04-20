const mongoose = require('mongoose');

/**
 * FrameworkCategory Model
 *
 * Represents subcategories within a framework type.
 * This allows for more granular organization of prompts.
 *
 * System categories (isSystem: true) are predefined defaults that cannot be deleted.
 * Custom categories (isSystem: false) are created by admins.
 *
 * Example:
 * - Framework: PAS
 * - Subcategories: problem_hook, pain_point, fear_based
 *
 * Hierarchy: Framework → SubCategory → Prompt
 */
const frameworkCategorySchema = new mongoose.Schema({
  // The framework type this category belongs to
  // Can be a predefined framework or a custom one created by admin
  frameworkType: {
    type: String,
    required: [true, 'Framework type is required'],
    trim: true,
    maxlength: [100, 'Framework type cannot exceed 100 characters']
  },

  // Unique key/slug for the category (e.g., 'problem_hook')
  key: {
    type: String,
    required: [true, 'Category key is required'],
    trim: true,
    lowercase: true,
    maxlength: [100, 'Key cannot exceed 100 characters'],
    match: [/^[a-z0-9_]+$/, 'Key must contain only lowercase letters, numbers, and underscores']
  },

  // Display name shown in UI (e.g., 'Problem Hook Ads')
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [200, 'Display name cannot exceed 200 characters']
  },

  // Optional description of what this category is for
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Whether this is a system predefined category (cannot be deleted)
  isSystem: {
    type: Boolean,
    default: false
  },

  // Whether this category is active and available for use
  isActive: {
    type: Boolean,
    default: true
  },

  // User who created this category (optional for system categories)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index: frameworkType + key must be unique
frameworkCategorySchema.index({ frameworkType: 1, key: 1 }, { unique: true });

// Index for efficient queries by frameworkType
frameworkCategorySchema.index({ frameworkType: 1, isActive: 1 });
frameworkCategorySchema.index({ frameworkType: 1, isSystem: 1 });

// Static method to get all active categories for a framework
frameworkCategorySchema.statics.getActiveByFramework = function(frameworkType) {
  return this.find({ frameworkType, isActive: true }).sort({ isSystem: -1, displayName: 1 });
};

// Static method to get all categories (including inactive) for a framework
frameworkCategorySchema.statics.getAllByFramework = function(frameworkType) {
  return this.find({ frameworkType }).sort({ isSystem: -1, displayName: 1 });
};

// Static method to check if a category exists
frameworkCategorySchema.statics.exists = async function(frameworkType, key) {
  const category = await this.findOne({ frameworkType, key, isActive: true });
  return !!category;
};

// Static method to get category by framework and key
frameworkCategorySchema.statics.getByFrameworkAndKey = function(frameworkType, key) {
  return this.findOne({ frameworkType, key });
};

// Method to soft delete (deactivate) - only for non-system categories
frameworkCategorySchema.methods.deactivate = function() {
  if (this.isSystem) {
    throw new Error('System categories cannot be deleted');
  }
  this.isActive = false;
  return this.save();
};

// Method to reactivate
frameworkCategorySchema.methods.reactivate = function() {
  this.isActive = true;
  return this.save();
};

module.exports = mongoose.model('FrameworkCategory', frameworkCategorySchema);