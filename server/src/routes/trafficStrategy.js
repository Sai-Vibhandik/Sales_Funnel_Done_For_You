const express = require('express');
const router = express.Router();
const {
  getTrafficStrategy,
  upsertTrafficStrategy,
  addHook,
  removeHook,
  toggleChannel
} = require('../controllers/trafficStrategyController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// GET routes - Admin can view (read-only)
router.get('/:projectId', authorize('admin', 'performance_marketer'), getTrafficStrategy);

// POST/PUT/PATCH/DELETE routes - Only performance_marketer can edit
router.post('/:projectId', authorize('performance_marketer'), upsertTrafficStrategy);
router.post('/:projectId/hooks', authorize('performance_marketer'), addHook);
router.delete('/:projectId/hooks/:hookId', authorize('performance_marketer'), removeHook);
router.patch('/:projectId/channels/:channelName', authorize('performance_marketer'), toggleChannel);

module.exports = router;