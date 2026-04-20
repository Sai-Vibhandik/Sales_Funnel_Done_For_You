const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getRejections,
  getRejectionStats,
  getUserRejectionHistory,
  getHighRejectionUsers,
  resolveRejection
} = require('../controllers/rejectionController');

// All routes require authentication
router.use(protect);

// ===========================================
// Rejection Management Routes (Admin only)
// ===========================================

// Get rejection statistics
router.get('/stats', getRejectionStats);

// Get users with high rejection counts (alerts)
router.get('/alerts', getHighRejectionUsers);

// Get all rejections with filtering
router.get('/', getRejections);

// Get rejection history for specific user
router.get('/user/:userId', getUserRejectionHistory);

// Mark a rejection as resolved
router.put('/:rejectionId/resolve', resolveRejection);

module.exports = router;