const mongoose = require('mongoose');

// Import centralized status constants
const {
  TASK_STATUSES,
  PENDING_STATUSES,
  SUBMITTED_STATUSES,
  APPROVED_STATUSES,
  getInitialStatus,
  canSubmit,
  canBeReviewedByTester,
  canBeApprovedByMarketer,
  getValidTransitions
} = require('../constants/taskStatuses');

// Task types for different production workflows
const TASK_TYPES = [
  'content_creation',
  'graphic_design',
  'video_editing',
  'landing_page_design',
  'landing_page_development'
];

// Asset types that can be produced
const ASSET_TYPES = [
  'image_creative',
  'video_creative',
  'carousel_creative',
  'reel',
  'static_ad',
  'landing_page_design',
  'landing_page_page',
  // Content task variants
  'image_creative_content',
  'video_creative_content',
  'carousel_creative_content',
  'reel_content',
  'ugc_content',
  'testimonial_content',
  'demo_video',
  'offer_creative'
];

// Role assignment mapping
const ROLE_ASSIGNMENT = {
  content_creation: 'content_writer',
  graphic_design: 'graphic_designer',
  video_editing: 'video_editor',
  landing_page_design: 'ui_ux_designer',
  landing_page_development: 'developer'
};

const taskSchema = new mongoose.Schema({
  // =====================================
  // MULTI-TENANCY: Organization ID (REQUIRED)
  // =====================================
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required']
  },

  // References
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  creativeStrategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreativeStrategy'
  },
  creativeId: {
    type: mongoose.Schema.Types.ObjectId
  },
  landingPageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LandingPage',
    description: 'Reference to the landing page this task is associated with'
  },
  adTypeKey: {
    type: String,
    description: 'Reference to ad type from creative strategy (awareness, consideration, etc.)'
  },
  creativePlanItemId: {
    type: mongoose.Schema.Types.ObjectId,
    description: 'Reference to the specific creativePlan item this task belongs to (for tracking updates)'
  },

  // Task identification
  taskTitle: {
    type: String,
    required: true
  },
  taskType: {
    type: String,
    enum: TASK_TYPES,
    required: true
  },
  assetType: {
    type: String,
    enum: ASSET_TYPES
  },
  creativeOutputType: {
    type: String,
    enum: ['image_creative', 'video_creative', 'carousel_creative', 'reel', 'ugc_content', 'testimonial_content', 'demo_video', 'offer_creative', null],
    description: 'For content_writer tasks: indicates which type of creative this content is for'
  },

  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Original assignee - tracks who was originally assigned to work on this task
  // This persists even when assignedTo changes during workflow (e.g., submitted to tester)
  originalAssignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'The original assignee who worked on this task'
  },
  assignedRole: {
    type: String,
    enum: ['content_creator', 'content_writer', 'graphic_designer', 'video_editor', 'ui_ux_designer', 'developer', 'tester', 'performance_marketer'],
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Testers assigned to review this task (from project team) - supports multiple testers
  testerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'Testers assigned to review this task'
  }],
  // Legacy field for backward compatibility
  testerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'Legacy: Single tester assigned to review this task (use testerIds for new tasks)'
  },
  // Performance Marketer assigned for final approval
  marketerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'The performance marketer assigned for final approval'
  },
  // Developer to be assigned when design is approved (for landing page development tasks)
  developerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'The developer assigned to implement this task (set when design is approved)'
  },
  // Designer to be assigned when content is approved (for graphic design/video editing tasks)
  designerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'The designer/video editor assigned to this task (set when content is approved)'
  },
  // Parent task dependency (e.g., design task depends on content task)
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    description: 'Parent task that must be completed before this task can start'
  },

  // Status pipeline
  status: {
    type: String,
    enum: TASK_STATUSES,
    default: 'todo'
  },

  // Task details
  description: { type: String },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // AI-generated content
  aiPrompt: {
    type: String,
    description: 'AI-generated prompt for the task based on strategy context'
  },
  aiFramework: {
    type: String,
    enum: [
      'PAS', 'AIDA', 'BAB', '4C', 'STORY', 'DIRECT_RESPONSE',
      'HOOKS', 'OBJECTION', 'PASTOR', 'QUEST', 'ACCA',
      'FAB', '5A', 'SLAP', 'HOOK_STORY_OFFER', '4P', 'MASTER',
      'UI_DESIGN', 'LANDING_PAGE_DEV'
    ],
    description: 'Framework used to generate the AI prompt'
  },
  // Content Planner Framework Selection (from creative strategy)
  contentFramework: {
    type: String,
    enum: [
      'PAS', 'AIDA', 'BAB', '4C', 'STORY', 'DIRECT_RESPONSE',
      'HOOKS', 'OBJECTION', 'PASTOR', 'QUEST', 'ACCA',
      'FAB', '5A', 'SLAP', 'HOOK_STORY_OFFER', '4P', 'MASTER',
      'UI_DESIGN', 'LANDING_PAGE_DEV'
    ],
    description: 'Framework selected by performance marketer for content planner'
  },
  contentSubCategory: {
    type: String,
    description: 'Subcategory within the framework for content planner'
  },
  sopReference: {
    type: String,
    description: 'Reference to standard operating procedure document'
  },

  // Strategy context (for designers - complete creative brief)
  strategyContext: {
    // Business context
    businessName: { type: String },
    industry: { type: String },

    // Creative identification
    funnelStage: {
      type: String,
      description: 'Which funnel stage this creative belongs to (awareness, consideration, conversion)'
    },
    creativeType: {
      type: String,
      description: 'Type of creative (image_creative, video_creative, carousel_creative, reel, static_ad)'
    },
    platform: {
      type: String,
      description: 'Target platform for this specific creative (facebook, instagram, etc.)'
    },
    platforms: [{
      type: String,
      description: 'All applicable platforms for reference'
    }],

    // Creative brief content
    hook: { type: String },
    creativeAngle: { type: String },
    messaging: { type: String },
    headline: { type: String },
    cta: { type: String },

    // Target audience
    targetAudience: { type: String },
    painPoints: [{ type: String }],
    desires: [{ type: String }],

    // Offer information
    offer: { type: String },

    // Additional context
    notes: { type: String },
    adTypeKey: { type: String },
    adTypeName: { type: String },

    // Creative plan fields
    creativeType: { type: String },
    creativeCategory: { type: String },

    // Landing page fields
    landingPageType: { type: String, description: 'Type of landing page (video_sales_letter, lead_generation, etc.)' },
    leadCapture: { type: Object, description: 'Lead capture configuration object' },
    leadCaptureMethod: { type: String, description: 'Lead capture method (form, calendly, whatsapp, free_audit)' }
  },

  // Strategy Context Links (for team members)
  contextLink: {
    type: String,
    description: 'Link to the full strategy summary page'
  },
  contextPdfUrl: {
    type: String,
    description: 'URL to downloadable PDF strategy summary'
  },

  // Due date and timing
  dueDate: { type: Date },
  startedAt: { type: Date },
  submittedAt: { type: Date },
  completedAt: { type: Date },

  // Output/assets
  assetUrl: { type: String },
  outputFiles: [{
    name: { type: String },
    path: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Custom brand logo for UI/UX designer (optional - if different from project brand settings)
  customLogo: {
    name: { type: String },
    path: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Designer's brand overrides (UI/UX designer can modify brand settings for their task)
  designerBrandOverrides: {
    colors: {
      primary: { hex: { type: String }, name: { type: String } },
      secondary: { hex: { type: String }, name: { type: String } },
      tertiary: { hex: { type: String }, name: { type: String } }
    },
    typography: {
      title: { fontFamily: { type: String } },
      subtitle: { fontFamily: { type: String } },
      body: { fontFamily: { type: String } }
    },
    selectedLogo: { type: String, enum: ['brand', 'custom'], default: 'brand' },
    // Brand manual reference for designer's record
    brandManualReference: {
      fileName: { type: String },
      filePath: { type: String },
      acknowledgedAt: { type: Date },
      acknowledged: { type: Boolean, default: false }
    },
    updatedAt: { type: Date },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Content output (for content writing tasks)
  contentOutput: {
    headline: { type: String },
    bodyText: { type: String },
    cta: { type: String },
    script: { type: String },
    notes: { type: String }
  },

  // Content Creator submission fields
  contentLink: {
    type: String,
    description: 'Link to content (Google Docs, Dropbox, etc.)'
  },
  contentFile: {
    name: { type: String },
    path: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  },
  contentNotes: {
    type: String,
    description: 'Notes from content creator'
  },

  // Submission fields (for designer submission)
  creativeLink: {
    type: String,
    description: 'Link to external creative (Figma, Canva, Google Drive, etc.)'
  },
  reviewNotes: {
    type: String,
    description: 'Notes from designer to reviewer'
  },

  // Landing Page Design submission fields (UI/UX Designer)
  designLink: {
    type: String,
    description: 'Link to design file (Figma, Drive, etc.) for landing page'
  },
  designFile: {
    name: { type: String },
    path: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  },
  designNotes: {
    type: String,
    description: 'Notes from UI/UX designer to developer'
  },

  // Designer's AI Prompt - copied from design task to development task
  designerPrompt: {
    type: String,
    description: 'AI prompt/brief used by designer for the design - copied to development task for reference'
  },

  // Designer's brand overrides - copied from design task to development task
  designerBrandOverrides: {
    colors: {
      primary: { hex: { type: String }, name: { type: String } },
      secondary: { hex: { type: String }, name: { type: String } },
      tertiary: { hex: { type: String }, name: { type: String } }
    },
    typography: {
      title: { fontFamily: { type: String } },
      subtitle: { fontFamily: { type: String } },
      body: { fontFamily: { type: String } }
    },
    selectedLogo: { type: String },
    // Brand manual reference for developer's reference
    brandManualReference: {
      fileName: { type: String },
      filePath: { type: String },
      acknowledgedAt: { type: Date },
      acknowledged: { type: Boolean, default: false }
    }
  },

  // Landing Page Development submission fields (Developer)
  implementationUrl: {
    type: String,
    description: 'URL to the implemented landing page'
  },
  repoLink: {
    type: String,
    description: 'Link to code repository (optional)'
  },
  devNotes: {
    type: String,
    description: 'Notes from developer to tester'
  },

  // Review workflow
  rejectionNote: { type: String },
  rejectionReason: { type: String },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: { type: Date },
  testerReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  testerReviewedAt: { type: Date },
  marketerApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  marketerApprovedAt: { type: Date },

  // Revision tracking
  revisionCount: {
    type: Number,
    default: 0
  },
  revisionHistory: [{
    status: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: { type: String }
  }],

  // Progress History - tracks task progress through workflow stages
  progressHistory: [{
    // Which stage/phase the task is in
    stage: {
      type: String,
      enum: [
        'created',           // Task just created
        'assigned',          // Assigned to a team member
        'content_pending',   // Content creation pending
        'content_submitted', // Content submitted for review
        'content_reviewed',  // Content reviewed by tester
        'content_approved',  // Content approved (ready for design)
        'content_rejected',  // Content rejected
        'design_pending',    // Design work pending
        'design_submitted',  // Design submitted for review
        'design_reviewed',   // Design reviewed by tester
        'design_approved',   // Design approved by tester (pending marketer)
        'design_rejected',   // Design rejected
        'development_pending', // Development pending
        'development_submitted', // Development submitted
        'development_reviewed', // Development reviewed by tester
        'development_approved', // Development approved by tester
        'marketer_review',   // Pending marketer final approval
        'final_approved',    // Task completed
        'rejected'           // Task rejected and needs revision
      ],
      required: true
    },
    // Action that occurred
    action: {
      type: String,
      enum: ['created', 'assigned', 'submitted', 'reviewed', 'approved', 'rejected', 'resubmitted', 'completed'],
      required: true
    },
    // Who performed the action
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Role of the actor
    actorRole: {
      type: String,
      enum: ['admin', 'performance_marketer', 'content_creator', 'content_writer', 'graphic_designer', 'video_editor', 'ui_ux_designer', 'developer', 'tester'],
      required: true
    },
    // When this occurred
    timestamp: {
      type: Date,
      default: Date.now
    },
    // Optional notes/comments
    notes: {
      type: String
    },
    // Duration from previous stage (calculated)
    durationFromPrevious: {
      type: Number, // Duration in milliseconds
      default: null
    }
  }],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
// Multi-tenancy index (CRITICAL for tenant isolation)
taskSchema.index({ organizationId: 1 });
taskSchema.index({ organizationId: 1, projectId: 1 });
taskSchema.index({ organizationId: 1, status: 1 });
taskSchema.index({ organizationId: 1, assignedTo: 1 });
taskSchema.index({ organizationId: 1, assignedRole: 1 });

// Project-specific indexes
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedRole: 1, status: 1 });
taskSchema.index({ taskType: 1, status: 1 });
taskSchema.index({ landingPageId: 1 });
taskSchema.index({ creativePlanItemId: 1 }); // Index for matching tasks to creative plan items

// Unique compound index to prevent duplicate tasks for the same creative plan item
// This prevents the same creative from having multiple content or design tasks
taskSchema.index(
  { projectId: 1, creativePlanItemId: 1, taskType: 1 },
  { unique: true, partialFilterExpression: { creativePlanItemId: { $exists: true, $ne: null } } }
);

// Static method to get role for task type
taskSchema.statics.getRoleForTaskType = function(taskType) {
  return ROLE_ASSIGNMENT[taskType] || 'graphic_designer';
};

// Static method to get initial status for task type
// Uses centralized getInitialStatus function from constants
taskSchema.statics.getInitialStatus = function(taskType) {
  return getInitialStatus(taskType);
};

// Method to check if task can be submitted
taskSchema.methods.canSubmit = function() {
  // Use PENDING_STATUSES from constants plus rejected statuses
  const submittableStatuses = [
    ...PENDING_STATUSES,
    'rejected',
    'content_rejected',
    'design_rejected'
  ];
  return submittableStatuses.includes(this.status);
};

// Method to check if task can be reviewed by tester
taskSchema.methods.canBeReviewedByTester = function() {
  return SUBMITTED_STATUSES.includes(this.status);
};

// Method to check if task can be approved by marketer
taskSchema.methods.canBeApprovedByMarketer = function() {
  // Marketer approves after tester approval - final step before completion
  // Content goes through marketer approval before being handed to design
  const marketerApprovableStatuses = [
    'content_approved',      // Content approved by tester, awaiting marketer
    'design_approved',      // Design approved by tester, awaiting marketer (for creative tasks)
    'development_approved', // Development approved by tester, awaiting marketer (for landing pages)
    'approved_by_tester'    // Legacy status for backward compatibility
  ];
  return marketerApprovableStatuses.includes(this.status);
};

// Method to get next status after approval
taskSchema.methods.getNextStatus = function(currentStatus, action, taskType) {
  // Content creation workflow - UPDATED FLOW: Tester approves → Marketer approves → Design starts
  if (currentStatus === 'content_pending' && action === 'submit') return 'content_submitted';
  if (currentStatus === 'content_submitted' && action === 'approve_tester') return 'content_approved'; // Goes to marketer
  if (currentStatus === 'content_submitted' && action === 'reject') return 'content_rejected';
  if (currentStatus === 'content_rejected' && action === 'resubmit') return 'content_submitted';
  if (currentStatus === 'content_approved' && action === 'approve_marketer') return 'content_final_approved'; // Marketer approves
  if (currentStatus === 'content_approved' && action === 'reject') return 'content_rejected';
  if (currentStatus === 'content_final_approved' && action === 'start_design') return 'design_pending';

  // Design workflow (for graphic design/video tasks)
  // Marketer reviews final design
  if (currentStatus === 'design_pending' && action === 'submit') return 'design_submitted';
  if (currentStatus === 'design_submitted' && action === 'approve_tester') return 'design_approved';
  if (currentStatus === 'design_submitted' && action === 'reject') return 'design_rejected';
  if (currentStatus === 'design_rejected' && action === 'resubmit') return 'design_submitted';
  if (currentStatus === 'design_approved' && action === 'approve_marketer') return 'final_approved';
  if (currentStatus === 'design_approved' && action === 'reject') return 'design_rejected';

  // Landing page design workflow (goes to development after marketer approval)
  if (taskType === 'landing_page_design') {
    if (currentStatus === 'design_pending' && action === 'submit') return 'design_submitted';
    if (currentStatus === 'design_submitted' && action === 'approve_tester') return 'design_approved';
    if (currentStatus === 'design_submitted' && action === 'reject') return 'design_rejected';
    if (currentStatus === 'design_rejected' && action === 'resubmit') return 'design_submitted';
    if (currentStatus === 'design_approved' && action === 'approve_marketer') return 'development_pending';
    if (currentStatus === 'design_approved' && action === 'reject') return 'design_rejected';
  }

  // Landing page development workflow
  if (taskType === 'landing_page_development') {
    if (currentStatus === 'development_pending' && action === 'submit') return 'development_submitted';
    if (currentStatus === 'development_submitted' && action === 'approve_tester') return 'development_approved';
    if (currentStatus === 'development_submitted' && action === 'reject') return 'development_pending';
    if (currentStatus === 'development_approved' && action === 'approve_marketer') return 'final_approved';
    if (currentStatus === 'development_approved' && action === 'reject') return 'development_pending';
  }

  // Standard creative workflow (legacy)
  if (currentStatus === 'todo' && action === 'start') return 'in_progress';
  if (currentStatus === 'in_progress' && action === 'submit') return 'submitted';
  if (currentStatus === 'submitted' && action === 'approve_tester') return 'approved_by_tester';
  if (currentStatus === 'submitted' && action === 'reject') return 'rejected';
  if (currentStatus === 'approved_by_tester' && action === 'approve_marketer') return 'final_approved';
  if (currentStatus === 'approved_by_tester' && action === 'reject') return 'rejected';
  if (currentStatus === 'rejected' && action === 'resubmit') return 'submitted';

  return currentStatus;
};

// Add revision to history
taskSchema.methods.addRevision = function(userId, note, oldStatus, newStatus) {
  this.revisionHistory.push({
    status: newStatus,
    changedBy: userId,
    changedAt: new Date(),
    note: note
  });
  this.revisionCount = this.revisionHistory.length;
  return this;
};

// Add progress history entry
// Maps status to progress stage
const STATUS_TO_STAGE = {
  'todo': 'created',
  'in_progress': 'assigned',
  'content_pending': 'content_pending',
  'content_submitted': 'content_submitted',
  'content_final_approved': 'content_approved',
  'content_rejected': 'content_rejected',
  'design_pending': 'design_pending',
  'design_submitted': 'design_submitted',
  'design_approved': 'design_approved',
  'design_rejected': 'design_rejected',
  'development_pending': 'development_pending',
  'development_submitted': 'development_submitted',
  'development_approved': 'development_approved',
  'final_approved': 'final_approved',
  'rejected': 'rejected',
  'approved_by_tester': 'marketer_review',
  'submitted': 'design_submitted'
};

// Map status to action
const STATUS_TO_ACTION = {
  'todo': 'created',
  'in_progress': 'assigned',
  'content_pending': 'assigned',
  'content_submitted': 'submitted',
  'content_final_approved': 'approved',
  'content_rejected': 'rejected',
  'design_pending': 'assigned',
  'design_submitted': 'submitted',
  'design_approved': 'approved',
  'design_rejected': 'rejected',
  'development_pending': 'assigned',
  'development_submitted': 'submitted',
  'development_approved': 'approved',
  'final_approved': 'completed',
  'rejected': 'rejected',
  'approved_by_tester': 'approved',
  'submitted': 'submitted'
};

taskSchema.methods.addProgressEntry = function(userId, userRole, action, notes = null) {
  const stage = STATUS_TO_STAGE[this.status] || this.status;

  // Calculate duration from previous entry
  let durationFromPrevious = null;
  if (this.progressHistory.length > 0) {
    const lastEntry = this.progressHistory[this.progressHistory.length - 1];
    durationFromPrevious = new Date() - lastEntry.timestamp;
  }

  this.progressHistory.push({
    stage: stage,
    action: action,
    actor: userId,
    actorRole: userRole,
    timestamp: new Date(),
    notes: notes,
    durationFromPrevious: durationFromPrevious
  });

  return this;
};

// Get formatted progress timeline for display
taskSchema.methods.getProgressTimeline = function() {
  return this.progressHistory.map((entry, index) => ({
    stage: entry.stage,
    action: entry.action,
    actor: entry.actor,
    actorRole: entry.actorRole,
    timestamp: entry.timestamp,
    notes: entry.notes,
    durationFromPrevious: entry.durationFromPrevious,
    // Calculate human-readable duration
    durationFormatted: entry.durationFromPrevious ? formatDuration(entry.durationFromPrevious) : null
  }));
};

// Helper to format duration in human-readable format
function formatDuration(ms) {
  if (!ms) return null;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

// Pre-validate hook to fix corrupted framework fields (handle legacy array data)
// This runs BEFORE validation so we can fix data before Mongoose validates it
taskSchema.pre('validate', function(next) {
  // Fix aiFramework if it's stored as an array (legacy data)
  if (Array.isArray(this.aiFramework)) {
    this.aiFramework = this.aiFramework[0] || undefined;
  }
  if (this.aiFramework !== undefined && this.aiFramework !== null && typeof this.aiFramework !== 'string') {
    this.aiFramework = String(this.aiFramework).trim();
  }
  if (this.aiFramework === '') {
    this.aiFramework = undefined;
  }

  // Fix contentFramework if it's stored as an array (legacy data)
  if (Array.isArray(this.contentFramework)) {
    this.contentFramework = this.contentFramework[0] || undefined;
  }
  if (this.contentFramework !== undefined && this.contentFramework !== null && typeof this.contentFramework !== 'string') {
    this.contentFramework = String(this.contentFramework).trim();
  }
  if (this.contentFramework === '') {
    this.contentFramework = undefined;
  }

  next();
});

// Pre-save hook to fix corrupted framework fields (handle legacy array data)
taskSchema.pre('save', function(next) {
  // Fix aiFramework if it's stored as an array (legacy data)
  if (Array.isArray(this.aiFramework)) {
    this.aiFramework = this.aiFramework[0] || undefined;
  }
  if (this.aiFramework !== undefined && this.aiFramework !== null && typeof this.aiFramework !== 'string') {
    this.aiFramework = String(this.aiFramework).trim();
  }
  if (this.aiFramework === '') {
    this.aiFramework = undefined;
  }

  // Fix contentFramework if it's stored as an array (legacy data)
  if (Array.isArray(this.contentFramework)) {
    this.contentFramework = this.contentFramework[0] || undefined;
  }
  if (this.contentFramework !== undefined && this.contentFramework !== null && typeof this.contentFramework !== 'string') {
    this.contentFramework = String(this.contentFramework).trim();
  }
  if (this.contentFramework === '') {
    this.contentFramework = undefined;
  }

  next();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
module.exports.TASK_TYPES = TASK_TYPES;
module.exports.TASK_STATUSES = TASK_STATUSES;
module.exports.ASSET_TYPES = ASSET_TYPES;
module.exports.ROLE_ASSIGNMENT = ROLE_ASSIGNMENT;