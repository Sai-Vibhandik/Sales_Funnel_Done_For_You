const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  generateContentBrief,
  regenerateContentBrief,
  getAIStatus,
  getFrameworks,
  getAIProviders,
  setAIProvider
} = require('../controllers/aiController');

// All routes require authentication
router.use(protect);

// @route   GET /api/ai/frameworks
// @desc    Get available frameworks
// @access  Private
router.get('/frameworks', getFrameworks);

// @route   GET /api/ai/providers
// @desc    Get available AI providers
// @access  Private
router.get('/providers', getAIProviders);

// @route   PUT /api/ai/provider
// @desc    Set user's preferred AI provider
// @access  Private
router.put('/provider', setAIProvider);

// @route   GET /api/ai/status
// @desc    Get AI service status
// @access  Private (Admin only)
router.get('/status', getAIStatus);

// @route   POST /api/ai/generate-brief
// @desc    Generate AI Content Brief for a task
// @access  Private (Content Writer)
router.post('/generate-brief', generateContentBrief);

// @route   POST /api/ai/regenerate-brief/:taskId
// @desc    Regenerate AI Content Brief
// @access  Private (Content Writer)
router.post('/regenerate-brief/:taskId', regenerateContentBrief);

module.exports = router;