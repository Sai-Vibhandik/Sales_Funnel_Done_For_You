const express = require('express');
const router = express.Router();
const {
  getOffer,
  upsertOffer,
  addBonus,
  removeBonus
} = require('../controllers/offerController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// GET routes - Admin can view (read-only)
router.get('/:projectId', authorize('admin', 'performance_marketer'), getOffer);

// POST/PUT/DELETE routes - Only performance_marketer can edit
router.post('/:projectId', authorize('performance_marketer'), upsertOffer);
router.post('/:projectId/bonuses', authorize('performance_marketer'), addBonus);
router.delete('/:projectId/bonuses/:bonusId', authorize('performance_marketer'), removeBonus);

module.exports = router;