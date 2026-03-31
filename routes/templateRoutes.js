const express = require('express');
const router = express.Router();
const {
	create,
	update,
	remove,
	getAll,
	getBySlug,
	toggleStatus,
} = require('../controllers/templateController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// Public routes
router.get('/', getAll);
router.get('/:slug', protect, getBySlug);

// Admin-only routes
router.post('/', protect, adminOnly, create);
router.put('/id/:id', protect, adminOnly, update);
router.patch('/id/:id/toggle', protect, adminOnly, toggleStatus);
router.delete('/id/:id', protect, adminOnly, remove);

module.exports = router;
