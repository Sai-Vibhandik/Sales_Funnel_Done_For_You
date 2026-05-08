const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Global search
router.get('/', searchController.globalSearch);

module.exports = router;