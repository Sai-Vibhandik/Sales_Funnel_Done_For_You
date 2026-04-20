const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  // =====================================
  // MULTI-TENANCY: Organization ID (REQUIRED)
  // =====================================
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required']
  },

  // Client/Company Information
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [100, 'Business name cannot exceed 100 characters']
  },
  // Contact Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
    match: [/^[+]?[\d\s-]{10,15}$/, 'Please enter a valid mobile number']
  },
  alternatePhone: {
    type: String,
    trim: true
  },
  // Business Details
  industry: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  // Address
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String, trim: true }
  },
  // Additional Information
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [5000, 'Notes cannot exceed 5000 characters']
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Track projects for this client
  projectCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for search functionality
clientSchema.index({
  customerName: 'text',
  businessName: 'text',
  email: 'text'
});

// Multi-tenancy indexes
clientSchema.index({ organizationId: 1 });
clientSchema.index({ organizationId: 1, createdAt: -1 });
clientSchema.index({ organizationId: 1, createdBy: 1 });

// Static method to search clients (tenant-scoped)
clientSchema.statics.search = function(query, createdBy, organizationId) {
  const searchQuery = {
    organizationId,
    createdBy
  };

  if (query) {
    searchQuery.$or = [
      { customerName: { $regex: query, $options: 'i' } },
      { businessName: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { mobile: { $regex: query, $options: 'i' } }
    ];
  }

  return this.find(searchQuery).sort({ createdAt: -1 });
};

// Static method to find all clients for organization
clientSchema.statics.findByOrganization = function(organizationId, options = {}) {
  const query = { organizationId };

  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 50);
};

module.exports = mongoose.model('Client', clientSchema);