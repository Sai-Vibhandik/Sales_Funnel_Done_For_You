const express = require('express');
const router = express.Router();
const {
  getCreativeStrategy,
  upsertCreativeStrategy,
  addCreative,
  updateCreative,
  deleteCreative,
  generateCreativeCards,
  addAdType,
  removeAdType,
  updateAdType,
  updateAdditionalNotes
} = require('../controllers/creativeController');
const { protect, authorize } = require('../middleware/auth');
const { checkStageAccess } = require('../middleware/stageGating');

// All routes are protected
router.use(protect);

// GET routes - Admin can view (read-only)
router.get('/:projectId', authorize('admin', 'performance_marketer'), checkStageAccess('creativeStrategy'), getCreativeStrategy);

// POST/PUT/DELETE routes - Only performance_marketer can edit
router.post('/:projectId', authorize('performance_marketer'), checkStageAccess('creativeStrategy'), upsertCreativeStrategy);
router.post('/:projectId/generate', authorize('performance_marketer'), checkStageAccess('creativeStrategy'), generateCreativeCards);
router.post('/:projectId/ad-types', authorize('performance_marketer'), checkStageAccess('creativeStrategy'), addAdType);
router.put('/:projectId/ad-types/:typeKey', authorize('performance_marketer'), checkStageAccess('creativeStrategy'), updateAdType);
router.delete('/:projectId/ad-types/:typeKey', authorize('performance_marketer'), checkStageAccess('creativeStrategy'), removeAdType);
router.put('/:projectId/notes', authorize('performance_marketer'), checkStageAccess('creativeStrategy'), updateAdditionalNotes);
router.post('/:projectId/stages/:stage/creatives', authorize('performance_marketer'), checkStageAccess('creativeStrategy'), addCreative);
router.put('/:projectId/stages/:stage/creatives/:creativeId', authorize('performance_marketer'), checkStageAccess('creativeStrategy'), updateCreative);
router.delete('/:projectId/stages/:stage/creatives/:creativeId', authorize('performance_marketer'), checkStageAccess('creativeStrategy'), deleteCreative);

module.exports = router;