const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Client CRUD routes
router.route('/')
  .get(clientController.getClients)
  .post(clientController.createClient);

router.route('/search')
  .get(clientController.searchClients);

router.route('/:id')
  .get(clientController.getClient)
  .put(clientController.updateClient)
  .delete(clientController.deleteClient);

module.exports = router;