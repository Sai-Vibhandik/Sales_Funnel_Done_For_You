const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requirePlatformAdmin } = require('../middleware/tenant');
const {
  getPrompts,
  getPrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  togglePromptActive,
  getPromptsByRole,
  generatePrompt,
  getOllamaStatus,
  getFrameworkTypes
} = require('../controllers/promptController');

// All routes require authentication
router.use(protect);

// ============================================
// Public Routes (authenticated users can read)
// ============================================

// IMPORTANT: Static routes must be defined BEFORE dynamic routes (/:id)
// Otherwise Express will match /:id first and treat static paths as IDs

// @route   GET /api/prompts/frameworks
// @desc    Get available framework types for Content Planner
// @access  Private (All authenticated users)
router.get('/frameworks', getFrameworkTypes);

// @route   GET /api/prompts/by-role/:role
// @desc    Get prompts by role
// @access  Private (All authenticated users)
router.get('/by-role/:role', getPromptsByRole);

// @route   GET /api/prompts
// @desc    Get all prompts (with filters)
// @access  Private (All authenticated users)
router.get('/', getPrompts);

// ============================================
// Platform Admin Only Routes (static routes)
// ============================================

// @route   GET /api/prompts/ollama-status
// @desc    Check Ollama health status
// @access  Private (Platform Admin only)
// NOTE: Must be BEFORE /:id route
router.get('/ollama-status', requirePlatformAdmin, getOllamaStatus);

// @route   POST /api/prompts/generate
// @desc    Generate AI prompt using Ollama
// @access  Private (Platform Admin only)
router.post('/generate', requirePlatformAdmin, generatePrompt);

// ============================================
// Dynamic Routes (with :id parameter)
// ============================================

// @route   GET /api/prompts/:id
// @desc    Get single prompt
// @access  Private (All authenticated users)
router.get('/:id', getPrompt);

// @route   POST /api/prompts
// @desc    Create new prompt
// @access  Private (Platform Admin only)
router.post('/', requirePlatformAdmin, createPrompt);

// @route   PUT /api/prompts/:id
// @desc    Update prompt
// @access  Private (Platform Admin only)
router.put('/:id', requirePlatformAdmin, updatePrompt);

// @route   PUT /api/prompts/:id/toggle-active
// @desc    Toggle prompt active status
// @access  Private (Platform Admin only)
router.put('/:id/toggle-active', requirePlatformAdmin, togglePromptActive);

// @route   DELETE /api/prompts/:id
// @desc    Delete prompt
// @access  Private (Platform Admin only)
router.delete('/:id', requirePlatformAdmin, deletePrompt);

module.exports = router;