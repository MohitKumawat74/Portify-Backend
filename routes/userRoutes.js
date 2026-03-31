const express = require('express');

const {
	getOwnProfile,
	updateOwnProfile,
	getAllUsersAdmin,
	getUserByIdAdmin,
	getUserByIdProtected,
	getUserByIdPublic,
	updateUserAdmin,
	deleteUserAdmin,
} = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { validate } = require('../utils/validation');
const { updateProfileSchema } = require('../utils/schemas');

const router = express.Router();

// Admin: list users (supports ?page=&limit=&search=&role=)
router.get('/', isAuthenticated, isAdmin, getAllUsersAdmin);

// Profile routes for authenticated users
router.get('/profile', isAuthenticated, getOwnProfile);
router.put('/profile', isAuthenticated, validate(updateProfileSchema), updateOwnProfile);

// Public: fetch single user by id (minimal profile)
router.get('/public/:id', getUserByIdPublic);

// Protected: fetch full user profile by id (self or admin)
router.get('/:id', isAuthenticated, getUserByIdProtected);

// Admin: update or delete user by id
router.put('/:id', isAuthenticated, isAdmin, updateUserAdmin);
router.delete('/:id', isAuthenticated, isAdmin, deleteUserAdmin);

module.exports = router;
