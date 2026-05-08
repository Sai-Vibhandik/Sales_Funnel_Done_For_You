const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema({
  hex: { type: String, default: '' },
  name: { type: String, default: '' }
}, { _id: false });

const typographySchema = new mongoose.Schema({
  fontFamily: { type: String, default: '' }
}, { _id: false });

const brandSettingsSchema = new mongoose.Schema({
  // Multi-tenancy
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
    index: true
  },

  // Project reference
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },

  // Brand Manual PDF
  brandManual: {
    fileName: { type: String },
    filePath: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date }
  },

  // Brand Colors
  colors: {
    primary: { type: colorSchema, default: () => ({ hex: '', name: 'Primary' }) },
    secondary: { type: colorSchema, default: () => ({ hex: '', name: 'Secondary' }) },
    tertiary: { type: colorSchema, default: () => ({ hex: '', name: 'Tertiary' }) }
  },

  // Typography Settings
  typography: {
    title: {
      type: typographySchema,
      default: () => ({ fontFamily: '' })
    },
    subtitle: {
      type: typographySchema,
      default: () => ({ fontFamily: '' })
    },
    body: {
      type: typographySchema,
      default: () => ({ fontFamily: '' })
    }
  },

  // Logo Files
  logos: {
    primary: {
      fileName: { type: String },
      filePath: { type: String },
      publicId: { type: String },
      uploadedAt: { type: Date }
    },
    secondary: {
      fileName: { type: String },
      filePath: { type: String },
      publicId: { type: String },
      uploadedAt: { type: Date }
    },
    favicon: {
      fileName: { type: String },
      filePath: { type: String },
      publicId: { type: String },
      uploadedAt: { type: Date }
    }
  },

  // Additional Brand Assets
  additionalAssets: [{
    fileName: { type: String },
    filePath: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    description: { type: String }
  }],

  // Brand Guidelines Text (extracted or manually entered)
  brandGuidelines: {
    tone: { type: String },
    voice: { type: String },
    dos: [{ type: String }],
    donts: [{ type: String }],
    additionalNotes: { type: String }
  },

  // Extraction Status
  extractionStatus: {
    colorsExtracted: { type: Boolean, default: false },
    typographyExtracted: { type: Boolean, default: false },
    extractedAt: { type: Date },
    extractionError: { type: String }
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
brandSettingsSchema.index({ organizationId: 1, projectId: 1 });

// Method to generate brand prompt for AI
brandSettingsSchema.methods.generateBrandPrompt = function() {
  const parts = [];

  // Colors
  if (this.colors?.primary?.hex) {
    parts.push(`Primary Color: ${this.colors.primary.hex}${this.colors.primary.name ? ` (${this.colors.primary.name})` : ''}`);
  }
  if (this.colors?.secondary?.hex) {
    parts.push(`Secondary Color: ${this.colors.secondary.hex}${this.colors.secondary.name ? ` (${this.colors.secondary.name})` : ''}`);
  }
  if (this.colors?.tertiary?.hex) {
    parts.push(`Tertiary Color: ${this.colors.tertiary.hex}`);
  }

  // Typography
  if (this.typography?.title?.fontFamily) {
    parts.push(`Title Font: ${this.typography.title.fontFamily}`);
  }
  if (this.typography?.subtitle?.fontFamily) {
    parts.push(`Subtitle Font: ${this.typography.subtitle.fontFamily}`);
  }
  if (this.typography?.body?.fontFamily) {
    parts.push(`Body Font: ${this.typography.body.fontFamily}`);
  }

  // Brand Guidelines
  if (this.brandGuidelines?.tone) {
    parts.push(`Brand Tone: ${this.brandGuidelines.tone}`);
  }
  if (this.brandGuidelines?.voice) {
    parts.push(`Brand Voice: ${this.brandGuidelines.voice}`);
  }

  // Logos
  if (this.logos?.primary?.filePath) {
    parts.push(`Primary Logo: ${this.logos.primary.filePath}`);
  }
  if (this.logos?.secondary?.filePath) {
    parts.push(`Secondary Logo: ${this.logos.secondary.filePath}`);
  }
  if (this.logos?.favicon?.filePath) {
    parts.push(`Favicon: ${this.logos.favicon.filePath}`);
  }

  return parts.length > 0 ? `Brand Guidelines:\n${parts.join('\n')}` : '';
};

module.exports = mongoose.model('BrandSettings', brandSettingsSchema);