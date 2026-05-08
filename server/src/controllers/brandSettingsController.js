const BrandSettings = require('../models/BrandSettings');
const Project = require('../models/Project');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Helper to check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME &&
         process.env.CLOUDINARY_API_KEY &&
         process.env.CLOUDINARY_API_SECRET &&
         process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
         process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
         process.env.CLOUDINARY_API_SECRET !== 'your_api_secret';
};

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
      // Clean up uploaded file
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
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

    // Delete old brand manual file if exists (local storage)
    if (brandSettings.brandManual?.publicId) {
      const oldFilePath = brandSettings.brandManual.publicId;
      // Check if it's a local file (not a Cloudinary public_id which contains '/')
      if (!oldFilePath.includes('/')) {
        const fullOldPath = path.join(__dirname, '../../uploads/brand-manuals', oldFilePath);
        if (fs.existsSync(fullOldPath)) {
          fs.unlinkSync(fullOldPath);
        }
      }
    }

    // Multer already saved the file to uploads/brand-manuals/
    // Get the filename from the path
    const fileName = path.basename(req.file.path);

    // Construct URL for serving the file
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const filePath = `${baseUrl}/api/brand-settings/${projectId}/manual/file`;

    // Update brand manual info
    brandSettings.brandManual = {
      fileName: req.file.originalname,
      filePath: filePath,
      publicId: fileName, // Store filename as publicId for local files
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
    // Clean up uploaded file if error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Serve brand manual file
// @route   GET /api/brand-settings/:projectId/manual/file
// @access  Public (for viewing/downloading brand manuals)
exports.serveBrandManual = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings?.brandManual) {
      return res.status(404).json({
        success: false,
        message: 'Brand manual not found'
      });
    }

    const { publicId, fileName, filePath: storedFilePath } = brandSettings.brandManual;
    const brandManualsDir = path.join(__dirname, '../../uploads/brand-manuals');

    // Helper function to serve a local file
    const serveLocalFile = (filePath, res, fileName) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileName || 'brand-manual.pdf'}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Error streaming file' });
        }
      });
      return fileStream.pipe(res);
    };

    // Helper function to try finding local file by various patterns
    const findLocalFile = () => {
      // Check if publicId is already a local filename (no '/')
      if (publicId && !publicId.includes('/')) {
        const localPath = path.join(brandManualsDir, publicId);
        if (fs.existsSync(localPath)) {
          return localPath;
        }
      }

      // Try to find a matching local file by projectId prefix
      try {
        const files = fs.readdirSync(brandManualsDir);
        // Look for files that might match this project
        const matchingFiles = files.filter(f => f.startsWith('manual-'));
        // Return the most recent file for now (could be improved with project-specific matching)
        if (matchingFiles.length > 0) {
          // Sort by modification time, most recent first
          const sortedFiles = matchingFiles.sort((a, b) => {
            const statA = fs.statSync(path.join(brandManualsDir, a));
            const statB = fs.statSync(path.join(brandManualsDir, b));
            return statB.mtimeMs - statA.mtimeMs;
          });
          // Return the most recent as a fallback
          return path.join(brandManualsDir, sortedFiles[0]);
        }
      } catch (e) {
        console.error('Error reading brand-manuals directory:', e);
      }

      return null;
    };

    // Strategy 1: Check if publicId is a local filename
    if (publicId && !publicId.includes('/')) {
      const localFilePath = path.join(brandManualsDir, publicId);
      if (fs.existsSync(localFilePath)) {
        console.log('Serving brand manual from local storage:', publicId);
        return serveLocalFile(localFilePath, res, fileName);
      }
    }

    // Strategy 2: Check if filePath points to a local file path pattern
    if (storedFilePath) {
      // Check if it's a local file reference (e.g., contains /uploads/ or is a local path)
      if (storedFilePath.includes('/uploads/')) {
        const localPath = path.join(__dirname, '../../..', storedFilePath.replace(/^.*\/uploads\//, 'uploads/'));
        if (fs.existsSync(localPath)) {
          console.log('Serving brand manual from uploads path:', localPath);
          return serveLocalFile(localPath, res, fileName);
        }
      }

      // Check if it's stored as a relative path
      const possiblePaths = [
        path.join(__dirname, '../../uploads/brand-manuals', path.basename(storedFilePath)),
        path.join(brandManualsDir, path.basename(storedFilePath))
      ];

      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          console.log('Serving brand manual from derived path:', possiblePath);
          return serveLocalFile(possiblePath, res, fileName);
        }
      }
    }

    // Strategy 3: Try to find any matching local file
    const foundLocalFile = findLocalFile();
    if (foundLocalFile) {
      console.log('Serving brand manual from fallback local file:', path.basename(foundLocalFile));
      // Update the database to use this local file for future requests
      brandSettings.brandManual.publicId = path.basename(foundLocalFile);
      brandSettings.brandManual.filePath = `${process.env.BASE_URL || `${req.protocol}://${req.get('host')}`}/api/brand-settings/${projectId}/manual/file`;
      await brandSettings.save();
      return serveLocalFile(foundLocalFile, res, fileName);
    }

    // Strategy 4: Try Cloudinary if configured
    if (publicId && publicId.includes('/')) {
      // Check if Cloudinary is configured
      if (!isCloudinaryConfigured()) {
        console.log('Cloudinary not configured, cannot download:', publicId);
        return res.status(404).json({
          success: false,
          message: 'Brand manual file not found locally. Please re-upload the brand manual.'
        });
      }

      console.log('Attempting to download brand manual from Cloudinary:', publicId);

      // Generate signed URL for download
      const signedUrl = cloudinary.url(publicId, {
        sign_url: true,
        secure: true,
        resource_type: 'raw',
        type: 'authenticated'
      });

      console.log('Signed URL generated');

      // Download file from Cloudinary
      const https = require('https');
      const http = require('http');

      const downloadFile = (url) => {
        return new Promise((resolve, reject) => {
          const protocol = url.startsWith('https') ? https : http;
          const chunks = [];

          protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
              // Follow redirect
              return downloadFile(response.headers.location).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download: ${response.statusCode}`));
              return;
            }

            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          }).on('error', reject);
        });
      };

      try {
        const fileBuffer = await downloadFile(signedUrl);

        // Save to local storage for future requests
        if (!fs.existsSync(brandManualsDir)) {
          fs.mkdirSync(brandManualsDir, { recursive: true });
        }

        const newLocalFileName = `migrated-${Date.now()}.pdf`;
        const newLocalFilePath = path.join(brandManualsDir, newLocalFileName);
        fs.writeFileSync(newLocalFilePath, fileBuffer);

        // Update database to use local file
        brandSettings.brandManual.publicId = newLocalFileName;
        brandSettings.brandManual.filePath = `${process.env.BASE_URL || `${req.protocol}://${req.get('host')}`}/api/brand-settings/${projectId}/manual/file`;
        await brandSettings.save();

        console.log('Brand manual migrated to local storage');

        return serveLocalFile(newLocalFilePath, res, fileName);
      } catch (downloadError) {
        console.error('Error downloading from Cloudinary:', downloadError);

        // Try direct URL without signing
        if (storedFilePath && storedFilePath.startsWith('http')) {
          let directUrl = storedFilePath;
          if (directUrl.includes('/image/upload/')) {
            directUrl = directUrl.replace('/image/upload/', '/raw/upload/');
          }
          console.log('Trying direct URL:', directUrl);

          try {
            const fileBuffer = await downloadFile(directUrl);

            // Save to local storage
            if (!fs.existsSync(brandManualsDir)) {
              fs.mkdirSync(brandManualsDir, { recursive: true });
            }

            const newLocalFileName = `migrated-${Date.now()}.pdf`;
            const newLocalFilePath = path.join(brandManualsDir, newLocalFileName);
            fs.writeFileSync(newLocalFilePath, fileBuffer);

            // Update database
            brandSettings.brandManual.publicId = newLocalFileName;
            await brandSettings.save();

            return serveLocalFile(newLocalFilePath, res, fileName);
          } catch (directError) {
            console.error('Direct URL also failed:', directError);
          }
        }

        return res.status(404).json({
          success: false,
          message: 'Brand manual file could not be loaded from cloud storage. Please re-upload the brand manual.'
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: 'Brand manual file not found. Please re-upload the brand manual.'
    });
  } catch (error) {
    console.error('Serve brand manual error:', error);
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

    console.log('\n=== LOGO UPLOAD REQUEST ===');
    console.log('Project ID:', projectId);
    console.log('Organization ID:', req.organizationId);
    console.log('User:', req.user?._id, req.user?.role);
    console.log('File received:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'NO FILE');
    console.log('Logo type:', logoType);
    console.log('Body:', req.body);

    if (!req.file) {
      console.log('ERROR: No file uploaded');
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
      console.log('ERROR: Project not found for projectId:', projectId, 'organizationId:', req.organizationId);
      // Clean up uploaded file
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    console.log('Project found:', project._id, project.projectName || project.businessName);

    // Find or create brand settings
    let brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings) {
      console.log('Creating new brand settings for project:', projectId);
      brandSettings = new BrandSettings({
        organizationId: req.organizationId,
        projectId,
        createdBy: req.user._id
      });
    }

    // Normalize logo type - accept 'logo' as 'primary' for backward compatibility
    const type = (logoType === 'logo' || !logoType) ? 'primary' : logoType;
    console.log('Logo type to save:', type);

    // Delete old logo if exists
    if (brandSettings.logos && brandSettings.logos[type]?.publicId) {
      const oldPublicId = brandSettings.logos[type].publicId;
      console.log('Deleting old logo:', oldPublicId);

      // Check if it's a local file or Cloudinary file
      if (oldPublicId && !oldPublicId.includes('/')) {
        // Local file
        const oldFilePath = path.join(__dirname, '../../uploads/brand-assets', oldPublicId);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('Deleted local file:', oldFilePath);
        }
      } else if (oldPublicId && isCloudinaryConfigured()) {
        // Cloudinary file
        try {
          await cloudinary.uploader.destroy(oldPublicId);
          console.log('Deleted from Cloudinary:', oldPublicId);
        } catch (cloudinaryError) {
          console.error('Error deleting old logo from Cloudinary:', cloudinaryError.message);
        }
      }
    }

    let logoData;

    // Try Cloudinary first if configured
    if (isCloudinaryConfigured()) {
      console.log('Cloudinary configured, attempting upload...');
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: `brand-logos/${projectId}`,
          resource_type: 'image'
        });

        console.log('Cloudinary upload successful:', result.public_id);

        logoData = {
          fileName: req.file.originalname,
          filePath: result.secure_url,
          publicId: result.public_id,
          uploadedAt: new Date()
        };

        // Clean up local file after successful Cloudinary upload
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('Cleaned up local file:', req.file.path);
        }
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed:', cloudinaryError.message);
        console.log('Falling back to local storage...');
        // Fall back to local storage
      }
    } else {
      console.log('Cloudinary not configured, using local storage');
    }

    // Use local storage if Cloudinary is not configured or upload failed
    if (!logoData) {
      // File is already saved by multer to uploads/brand-assets/
      const fileName = path.basename(req.file.path);
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const filePath = `${baseUrl}/uploads/brand-assets/${fileName}`;

      console.log('Using local storage:', {
        fileName,
        filePath,
        localPath: req.file.path
      });

      logoData = {
        fileName: req.file.originalname,
        filePath: filePath,
        publicId: fileName, // Store filename as publicId for local files
        uploadedAt: new Date()
      };
    }

    // Initialize logos object if not exists
    if (!brandSettings.logos) {
      brandSettings.logos = {};
    }

    brandSettings.logos[type] = logoData;
    brandSettings.updatedBy = req.user._id;

    await brandSettings.save();

    console.log('=== LOGO UPLOAD SUCCESS ===');
    console.log('Logo saved:', logoData);
    console.log('Brand settings ID:', brandSettings._id);
    console.log('Logos in DB:', brandSettings.logos);

    res.status(200).json({
      success: true,
      data: brandSettings,
      message: `${type} logo uploaded successfully`
    });
  } catch (error) {
    console.error('=== LOGO UPLOAD ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    // Clean up uploaded file if error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

    // Check if it's a local file or Cloudinary file
    const publicId = brandSettings.brandManual.publicId;
    if (publicId && !publicId.includes('/')) {
      // Local file - delete from filesystem
      const filePath = path.join(__dirname, '../../uploads/brand-manuals', publicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else if (publicId) {
      // Cloudinary file - delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue even if Cloudinary delete fails
      }
    }

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

    // Normalize logo type - accept 'logo' as 'primary' for backward compatibility
    const type = (logoType === 'logo') ? 'primary' : logoType;

    const brandSettings = await BrandSettings.findOne({ projectId });

    if (!brandSettings || !brandSettings.logos?.[type]?.publicId) {
      return res.status(404).json({
        success: false,
        message: 'Logo not found'
      });
    }

    const publicId = brandSettings.logos[type].publicId;

    // Check if it's a local file or Cloudinary file
    if (publicId && !publicId.includes('/')) {
      // Local file - delete from filesystem
      const filePath = path.join(__dirname, '../../uploads/brand-assets', publicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else if (publicId && isCloudinaryConfigured()) {
      // Cloudinary file - delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting logo from Cloudinary:', cloudinaryError);
        // Continue even if Cloudinary delete fails
      }
    }

    // Clear logo
    brandSettings.logos[type] = {};
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