const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth');
const brandSettingsController = require('../controllers/brandSettingsController');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = file.fieldname === 'manual' ? 'brand-manuals' : 'brand-assets';
    const dir = path.join(uploadsDir, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept PDFs for brand manuals
  if (file.fieldname === 'manual') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for brand manuals'), false);
    }
  }
  // Accept images for logos
  else if (file.fieldname === 'logo') {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and WEBP files are allowed for logos'), false);
    }
  }
  // Accept all common asset types
  else {
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/svg+xml',
      'application/postscript', // .ai files
      'application/illustrator',
      'image/tiff',
      'image/bmp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Serve brand manual file (public access for viewing)
// This must be before protect middleware to allow public access
router.get('/:projectId/manual/file', brandSettingsController.serveBrandManual);

// All other routes require authentication
router.use(protect);

// Get brand settings for a project
router.get('/:projectId', brandSettingsController.getBrandSettings);

// Create or update brand settings (admin or performance_marketer only)
router.put('/:projectId', authorize('admin', 'performance_marketer'), brandSettingsController.upsertBrandSettings);

// Upload brand manual (PDF)
router.post(
  '/:projectId/upload-manual',
  authorize('admin', 'performance_marketer'),
  upload.single('manual'),
  brandSettingsController.uploadBrandManual
);

// Upload logo (PNG, JPG, WEBP)
router.post(
  '/:projectId/upload-logo',
  authorize('admin', 'performance_marketer'),
  upload.single('logo'),
  brandSettingsController.uploadLogo
);

// Extract brand data from manual using AI
router.post(
  '/:projectId/extract',
  authorize('admin', 'performance_marketer'),
  brandSettingsController.extractFromManual
);

// Upload additional brand asset
router.post(
  '/:projectId/upload-asset',
  authorize('admin', 'performance_marketer'),
  upload.single('asset'),
  brandSettingsController.uploadAsset
);

// Delete additional asset
router.delete(
  '/:projectId/asset/:assetId',
  authorize('admin', 'performance_marketer'),
  brandSettingsController.deleteAsset
);

// Delete brand manual
router.delete(
  '/:projectId/manual',
  authorize('admin', 'performance_marketer'),
  brandSettingsController.deleteBrandManual
);

// Delete logo
router.delete(
  '/:projectId/logo/:logoType',
  authorize('admin', 'performance_marketer'),
  brandSettingsController.deleteLogo
);

module.exports = router;