const FrameworkCategory = require('../models/FrameworkCategory');

/**
 * @desc    Get all framework categories
 * @route   GET /api/framework-categories
 * @access  Private
 * @query   frameworkType - Filter by framework type (optional)
 * @query   includeInactive - Include inactive categories (optional, admin only)
 */
exports.getFrameworkCategories = async (req, res, next) => {
  try {
    const { frameworkType, includeInactive } = req.query;
    const isAdmin = req.user?.role === 'admin';

    const query = {};

    // Filter by framework type if provided
    if (frameworkType) {
      query.frameworkType = frameworkType;
    }

    // Only show active categories unless admin explicitly requests inactive
    if (!isAdmin || includeInactive !== 'true') {
      query.isActive = true;
    }

    const categories = await FrameworkCategory.find(query)
      .populate('createdBy', 'name email')
      .sort({ frameworkType: 1, displayName: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single framework category by ID
 * @route   GET /api/framework-categories/:id
 * @access  Private
 */
exports.getFrameworkCategory = async (req, res, next) => {
  try {
    const category = await FrameworkCategory.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Framework category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get categories by framework type
 * @route   GET /api/framework-categories/by-framework/:frameworkType
 * @access  Private
 */
exports.getCategoriesByFramework = async (req, res, next) => {
  try {
    const { frameworkType } = req.params;

    const categories = await FrameworkCategory.getActiveByFramework(frameworkType);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new framework category
 * @route   POST /api/framework-categories
 * @access  Private (Admin only)
 */
exports.createFrameworkCategory = async (req, res, next) => {
  try {
    // Only admin can create categories
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create framework categories'
      });
    }

    const { frameworkType, key, displayName, description } = req.body;

    // Validate required fields
    if (!frameworkType || !key || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Framework type, key, and display name are required'
      });
    }

    // Check if category already exists
    const existingCategory = await FrameworkCategory.getByFrameworkAndKey(frameworkType, key.toLowerCase());
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'A category with this key already exists for this framework type'
      });
    }

    // Create the category
    const category = await FrameworkCategory.create({
      frameworkType,
      key: key.toLowerCase(),
      displayName,
      description: description || '',
      createdBy: req.user._id
    });

    await category.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: category,
      message: 'Framework category created successfully'
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A category with this key already exists for this framework type'
      });
    }
    next(error);
  }
};

/**
 * @desc    Update framework category
 * @route   PUT /api/framework-categories/:id
 * @access  Private (Admin only)
 */
exports.updateFrameworkCategory = async (req, res, next) => {
  try {
    // Only admin can update categories
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update framework categories'
      });
    }

    const { displayName, description, isActive } = req.body;

    const category = await FrameworkCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Framework category not found'
      });
    }

    // Update fields
    if (displayName !== undefined) category.displayName = displayName;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    await category.populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      data: category,
      message: 'Framework category updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete framework category (soft delete - sets isActive to false)
 * @route   DELETE /api/framework-categories/:id
 * @access  Private (Admin only)
 */
exports.deleteFrameworkCategory = async (req, res, next) => {
  try {
    // Only admin can delete categories
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete framework categories'
      });
    }

    const category = await FrameworkCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Framework category not found'
      });
    }

    // Prevent deletion of system categories
    if (category.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'System categories cannot be deleted. They are predefined defaults.'
      });
    }

    // Soft delete - set isActive to false
    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Framework category deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reactivate a deleted framework category
 * @route   PUT /api/framework-categories/:id/reactivate
 * @access  Private (Admin only)
 */
exports.reactivateFrameworkCategory = async (req, res, next) => {
  try {
    // Only admin can reactivate categories
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can reactivate framework categories'
      });
    }

    const category = await FrameworkCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Framework category not found'
      });
    }

    await category.reactivate();
    await category.populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      data: category,
      message: 'Framework category reactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if subcategory key exists for a framework
 * @route   GET /api/framework-categories/check/:frameworkType/:key
 * @access  Private
 */
exports.checkCategoryExists = async (req, res, next) => {
  try {
    const { frameworkType, key } = req.params;

    const exists = await FrameworkCategory.exists(frameworkType, key.toLowerCase());

    res.status(200).json({
      success: true,
      exists
    });
  } catch (error) {
    next(error);
  }
};