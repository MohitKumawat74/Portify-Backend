const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateProfile,
  updateRole,
  deleteUser,
  changePassword,
  uploadAvatar,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// All user routes require authentication
router.use(protect);

// GET  /api/users            — Admin Only
router.get('/', adminOnly, getAllUsers);

// GET  /api/users/:id        — Admin Only
router.get('/:id', adminOnly, getUserById);

// PUT  /api/users/:id        — Protected (self or admin)
router.put('/:id', updateProfile);

// PATCH /api/users/:id/role  — Admin Only
router.patch('/:id/role', adminOnly, updateRole);

// DELETE /api/users/:id      — Admin Only
router.delete('/:id', adminOnly, deleteUser);

// PUT /api/users/:id/password — Protected (self only)
router.put('/:id/password', changePassword);

// POST /api/users/:id/avatar  — Protected (self only)
router.post('/:id/avatar', uploadAvatar);

module.exports = router;
