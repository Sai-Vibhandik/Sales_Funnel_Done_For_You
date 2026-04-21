const BrandSettings = require('../models/BrandSettings');
const Project = require('../models/Project');
const cloudinary = require('cloudinary').v2;

// @desc    Get brand settings for a project
// @route   GET /api/brand-settings/:projectId
// @access  Private
exports.getBrandSettings = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const brandSettings = await BrandSettings.findOne({ projectId })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!brandSettings) {
      // Return empty settings if not found
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No brand settings found for this project'
      });
    }

    res.status(200).json({
      success: true,
      data: brandSettings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update brand settings
// @route   PUT /api/brand-settings/:projectId
// @access  Private (Admin or Performance Marketer)
exports.upsertBrandSettings = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { colors, typography, brandGuidelines } = req.body;

    // Verify project exists
    const project = await Project.findOne({
      _id: projectId,
      organizationId: req.organizationId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check authorization
    const isAuthorized = req.user.role === 'admin' ||
                         req.user.role === 'performance_marketer';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Only admins or performance marketers can update brand settings'
      });
    }

    // Find existing or create new
    let brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings) {
      brandSettings = new BrandSettings({
        organizationId: req.organizationId,
        projectId,
        createdBy: req.user._id
      });
    }

    brandSettings.updatedBy = req.user._id;

    // Update colors if provided
    if (colors) {
      brandSettings.colors = {
        ...brandSettings.colors,
        ...colors
      };
    }

    // Update typography if provided
    if (typography) {
      brandSettings.typography = {
        ...brandSettings.typography,
        ...typography
      };
    }

    // Update brand guidelines if provided
    if (brandGuidelines) {
      brandSettings.brandGuidelines = {
        ...brandSettings.brandGuidelines,
        ...brandGuidelines
      };
    }

    await brandSettings.save();

    res.status(200).json({
      success: true,
      data: brandSettings,
      message: 'Brand settings saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload brand manual
// @route   POST /api/brand-settings/:projectId/upload-manual
// @access  Private (Admin or Performance Marketer)
exports.uploadBrandManual = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify project exists
    const project = await Project.findOne({
      _id: projectId,
      organizationId: req.organizationId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Find or create brand settings
    let brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings) {
      brandSettings = new BrandSettings({
        organizationId: req.organizationId,
        projectId,
        createdBy: req.user._id
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `brand-manuals/${projectId}`,
      resource_type: 'auto'
    });

    // Update brand manual info
    brandSettings.brandManual = {
      fileName: req.file.originalname,
      filePath: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date()
    };
    brandSettings.updatedBy = req.user._id;

    await brandSettings.save();

    res.status(200).json({
      success: true,
      data: brandSettings,
      message: 'Brand manual uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload logo
// @route   POST /api/brand-settings/:projectId/upload-logo
// @access  Private (Admin or Performance Marketer)
exports.uploadLogo = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { logoType } = req.body; // 'primary', 'secondary', 'favicon'

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify project exists
    const project = await Project.findOne({
      _id: projectId,
      organizationId: req.organizationId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Find or create brand settings
    let brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings) {
      brandSettings = new BrandSettings({
        organizationId: req.organizationId,
        projectId,
        createdBy: req.user._id
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `brand-logos/${projectId}`,
      resource_type: 'image'
    });

    // Update logo based on type
    const logoData = {
      fileName: req.file.originalname,
      filePath: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date()
    };

    const type = logoType || 'primary';
    brandSettings.logos[type] = logoData;
    brandSettings.updatedBy = req.user._id;

    await brandSettings.save();

    res.status(200).json({
      success: true,
      data: brandSettings,
      message: `${type} logo uploaded successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Extract brand data from manual using OCR
// @route   POST /api/brand-settings/:projectId/extract
// @access  Private (Admin or Performance Marketer)
exports.extractFromManual = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    console.log('=== Brand Extraction Request ===');
    console.log('Project ID:', projectId);

    const brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings) {
      console.log('ERROR: No brand settings found for project');
      return res.status(400).json({
        success: false,
        message: 'No brand settings found. Please save brand settings first.'
      });
    }

    if (!brandSettings.brandManual?.filePath) {
      console.log('ERROR: No brand manual uploaded');
      return res.status(400).json({
        success: false,
        message: 'No brand manual uploaded for this project'
      });
    }

    console.log('Brand manual file path:', brandSettings.brandManual.filePath);

    // Use extraction service
    const { extractBrandInfo } = require('../services/brandExtractionService');

    let extractedData;
    try {
      extractedData = await extractBrandInfo(brandSettings.brandManual.filePath);
      console.log('Extraction result:', JSON.stringify(extractedData, null, 2));
    } catch (extractError) {
      console.error('Extraction failed:', extractError.message);
      // Return empty extraction with error message
      return res.status(200).json({
        success: true,
        data: brandSettings,
        extractedData: {
          colors: { primary: { hex: '', name: 'Primary' }, secondary: { hex: '', name: 'Secondary' }, tertiary: { hex: '', name: 'Tertiary' } },
          typography: { title: { fontFamily: '', fontSize: '', fontWeight: '700' }, subtitle: { fontFamily: '', fontSize: '', fontWeight: '500' }, body: { fontFamily: '', fontSize: '', fontWeight: '400' } },
          extractionFailed: true,
          message: 'Could not extract data from PDF. The PDF may be image-based or corrupted.'
        },
        message: 'Could not extract brand information from PDF'
      });
    }

    // Check what we extracted
    const hasPrimaryColor = extractedData?.colors?.primary?.hex;
    const hasSecondaryColor = extractedData?.colors?.secondary?.hex;
    const hasTertiaryColor = extractedData?.colors?.tertiary?.hex;
    const hasTitleFont = extractedData?.typography?.title?.fontFamily;
    const hasSubtitleFont = extractedData?.typography?.subtitle?.fontFamily;
    const hasBodyFont = extractedData?.typography?.body?.fontFamily;

    const colorsFound = [hasPrimaryColor, hasSecondaryColor, hasTertiaryColor].filter(Boolean).length;
    const fontsFound = [hasTitleFont, hasSubtitleFont, hasBodyFont].filter(Boolean).length;

    console.log('=== Extraction Summary ===');
    console.log('Colors found:', colorsFound);
    console.log('Fonts found:', fontsFound);

    // Update brand settings with extracted data
    if (extractedData?.colors) {
      brandSettings.colors = {
        ...brandSettings.colors,
        ...extractedData.colors
      };
    }

    if (extractedData?.typography) {
      brandSettings.typography = {
        ...brandSettings.typography,
        ...extractedData.typography
      };
    }

    brandSettings.extractionStatus = {
      colorsExtracted: colorsFound > 0,
      typographyExtracted: fontsFound > 0,
      extractedAt: new Date(),
      extractionError: null
    };

    brandSettings.updatedBy = req.user._id;
    await brandSettings.save();

    console.log('=== Brand Extraction Complete ===');

    // Determine message based on extraction results
    let message = 'Brand information extracted successfully';
    if (colorsFound === 0 && fontsFound === 0) {
      message = 'No brand information could be extracted from the PDF. Please enter details manually.';
    } else if (colorsFound < 3 || fontsFound < 3) {
      message = `Extracted ${colorsFound} color(s) and ${fontsFound} font(s). Fill in any missing fields manually.`;
    }

    res.status(200).json({
      success: true,
      data: brandSettings,
      extractedData: {
        colors: extractedData.colors,
        typography: extractedData.typography,
        colorsFound,
        fontsFound
      },
      message
    });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract brand information',
      error: error.message
    });
  }
};

// @desc    Upload additional brand asset
// @route   POST /api/brand-settings/:projectId/upload-asset
// @access  Private (Admin or Performance Marketer)
exports.uploadAsset = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify project exists
    const project = await Project.findOne({
      _id: projectId,
      organizationId: req.organizationId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Find or create brand settings
    let brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings) {
      brandSettings = new BrandSettings({
        organizationId: req.organizationId,
        projectId,
        createdBy: req.user._id
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `brand-assets/${projectId}`,
      resource_type: 'auto'
    });

    // Add to additional assets
    brandSettings.additionalAssets.push({
      fileName: req.file.originalname,
      filePath: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date(),
      description: description || ''
    });
    brandSettings.updatedBy = req.user._id;

    await brandSettings.save();

    res.status(200).json({
      success: true,
      data: brandSettings,
      message: 'Asset uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete brand asset
// @route   DELETE /api/brand-settings/:projectId/asset/:assetId
// @access  Private (Admin or Performance Marketer)
exports.deleteAsset = async (req, res, next) => {
  try {
    const { projectId, assetId } = req.params;

    const brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings) {
      return res.status(404).json({
        success: false,
        message: 'Brand settings not found'
      });
    }

    // Find and remove the asset
    const assetIndex = brandSettings.additionalAssets.findIndex(
      asset => asset._id.toString() === assetId
    );

    if (assetIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    const asset = brandSettings.additionalAssets[assetIndex];

    // Delete from Cloudinary
    if (asset.publicId) {
      await cloudinary.uploader.destroy(asset.publicId);
    }

    // Remove from array
    brandSettings.additionalAssets.splice(assetIndex, 1);
    brandSettings.updatedBy = req.user._id;

    await brandSettings.save();

    res.status(200).json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete brand manual
// @route   DELETE /api/brand-settings/:projectId/manual
// @access  Private (Admin or Performance Marketer)
exports.deleteBrandManual = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings || !brandSettings.brandManual?.publicId) {
      return res.status(404).json({
        success: false,
        message: 'No brand manual found'
      });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(brandSettings.brandManual.publicId);

    // Clear brand manual
    brandSettings.brandManual = {};
    brandSettings.updatedBy = req.user._id;

    await brandSettings.save();

    res.status(200).json({
      success: true,
      message: 'Brand manual deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete logo
// @route   DELETE /api/brand-settings/:projectId/logo/:logoType
// @access  Private (Admin or Performance Marketer)
exports.deleteLogo = async (req, res, next) => {
  try {
    const { projectId, logoType } = req.params;

    const brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings || !brandSettings.logos[logoType]?.publicId) {
      return res.status(404).json({
        success: false,
        message: 'Logo not found'
      });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(brandSettings.logos[logoType].publicId);

    // Clear logo
    brandSettings.logos[logoType] = {};
    brandSettings.updatedBy = req.user._id;

    await brandSettings.save();

    res.status(200).json({
      success: true,
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};