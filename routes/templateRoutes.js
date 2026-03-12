const express = require('express');
const router = express.Router();
const { create, update, remove, getAll, getOne, toggleStatus } = require('../controllers/templateController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// Public routes
router.get('/', getAll);
router.get('/:id', getOne);

// Admin-only routes
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.patch('/:id/toggle', protect, adminOnly, toggleStatus);
router.delete('/:id', protect, adminOnly, remove);

module.exports = router;
