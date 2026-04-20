const express = require('express');
const router = express.Router();
const {
  getLandingPages,
  getLandingPage,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
  completeLandingPage,
  addNurturing,
  removeNurturing
} = require('../controllers/landingPageController');
const { protect, authorize } = require('../middleware/auth');
const { checkOrgLimits } = require('../middleware/tenant');

// All routes are protected
router.use(protect);

// GET routes - Admin can view (read-only)
router.get('/:projectId', authorize('admin', 'performance_marketer'), getLandingPages);
router.get('/:projectId/:landingPageId', authorize('admin', 'performance_marketer'), getLandingPage);

// POST/PUT/DELETE routes - Only performance_marketer can edit
router.post('/:projectId', authorize('performance_marketer'), checkOrgLimits('landingPage'), createLandingPage);
router.put('/:projectId/:landingPageId', authorize('performance_marketer'), updateLandingPage);
router.delete('/:projectId/:landingPageId', authorize('performance_marketer'), deleteLandingPage);
router.post('/:projectId/:landingPageId/complete', authorize('performance_marketer'), completeLandingPage);
router.post('/:projectId/:landingPageId/nurturing', authorize('performance_marketer'), addNurturing);
router.delete('/:projectId/:landingPageId/nurturing/:nurturingId', authorize('performance_marketer'), removeNurturing);

module.exports = router;