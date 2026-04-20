const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getMarketResearch,
  upsertMarketResearch,
  uploadVisionBoard,
  uploadStrategySheet
} = require('../controllers/marketResearchController');
const { protect, authorize } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images and documents are allowed.'));
  }
});

// All routes are protected
router.use(protect);

// GET routes - Admin can view (read-only)
router.get('/:projectId', authorize('admin', 'performance_marketer'), getMarketResearch);

// POST/PUT routes - Only performance_marketer can edit
router.post('/:projectId', authorize('performance_marketer'), upsertMarketResearch);
router.post('/:projectId/vision-board', authorize('performance_marketer'), upload.single('file'), uploadVisionBoard);
router.post('/:projectId/strategy-sheet', authorize('performance_marketer'), upload.single('file'), uploadStrategySheet);

module.exports = router;