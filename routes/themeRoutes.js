const express = require('express');
const router = express.Router();
const { create, update, remove, getAll } = require('../controllers/themeController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// All admin theme routes require authentication + admin role
router.use(protect, adminOnly);

// GET  /api/admin/themes
router.get('/', getAll);

// POST /api/admin/themes
router.post('/', create);

// PUT  /api/admin/themes/:id
router.put('/:id', update);

// DELETE /api/admin/themes/:id
router.delete('/:id', remove);

module.exports = router;
