const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  refresh,
  getProfile,
  forgotPasswordHandler,
  resetPasswordHandler,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);

// Protected routes
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);

module.exports = router;
