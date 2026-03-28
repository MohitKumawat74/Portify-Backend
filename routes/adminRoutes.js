const express = require('express');

const { getAllUsersAdmin, deleteUserAdmin } = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { validate } = require('../utils/validation');
const { adminDeleteUserParamsSchema } = require('../utils/schemas');

const router = express.Router();

router.get('/users', isAuthenticated, isAdmin, getAllUsersAdmin);
router.delete(
  '/user/:id',
  isAuthenticated,
  isAdmin,
  validate(adminDeleteUserParamsSchema, 'params'),
  deleteUserAdmin
);

module.exports = router;
