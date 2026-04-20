const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');

/**
 * @desc    Get all active public plans (for landing page)
 * @route   GET /api/plans/public
 * @access  Public
 */
router.get('/public', async (req, res) => {
  try {
    const plans = await Plan.find({
      isActive: true,
      isPublic: true
    }).sort({ sortOrder: 1, createdAt: 1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get public plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plans'
    });
  }
});

/**
 * @desc    Get a single public plan by ID or slug
 * @route   GET /api/plans/public/:identifier
 * @access  Public
 */
router.get('/public/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find by ID first, then by slug
    let plan = await Plan.findOne({
      _id: identifier,
      isActive: true,
      isPublic: true
    });

    if (!plan) {
      plan = await Plan.findOne({
        slug: identifier,
        isActive: true,
        isPublic: true
      });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Get public plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plan'
    });
  }
});

module.exports = router;