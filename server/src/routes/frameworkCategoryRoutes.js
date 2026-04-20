const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getFrameworkCategories,
  getFrameworkCategory,
  getCategoriesByFramework,
  createFrameworkCategory,
  updateFrameworkCategory,
  deleteFrameworkCategory,
  reactivateFrameworkCategory,
  checkCategoryExists
} = require('../controllers/frameworkCategoryController');

// All routes require authentication
router.use(protect);

// @route   GET /api/framework-categories/check/:frameworkType/:key
// @desc    Check if a subcategory key exists for a framework
// @access  Private
router.get('/check/:frameworkType/:key', checkCategoryExists);

// @route   GET /api/framework-categories/by-framework/:frameworkType
// @desc    Get categories by framework type
// @access  Private
router.get('/by-framework/:frameworkType', getCategoriesByFramework);

// @route   GET /api/framework-categories
// @desc    Get all framework categories (with optional filters)
// @access  Private
router.get('/', getFrameworkCategories);

// @route   GET /api/framework-categories/:id
// @desc    Get single framework category
// @access  Private
router.get('/:id', getFrameworkCategory);

// @route   POST /api/framework-categories
// @desc    Create new framework category
// @access  Private (Admin only)
router.post('/', createFrameworkCategory);

// @route   PUT /api/framework-categories/:id
// @desc    Update framework category
// @access  Private (Admin only)
router.put('/:id', updateFrameworkCategory);

// @route   PUT /api/framework-categories/:id/reactivate
// @desc    Reactivate a deleted framework category
// @access  Private (Admin only)
router.put('/:id/reactivate', reactivateFrameworkCategory);

// @route   DELETE /api/framework-categories/:id
// @desc    Delete framework category (soft delete)
// @access  Private (Admin only)
router.delete('/:id', deleteFrameworkCategory);

module.exports = router;