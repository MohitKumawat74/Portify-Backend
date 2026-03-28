const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  refresh,
  me,
  getProfile,
  forgotPasswordHandler,
  resetPasswordHandler,
} = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validation');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} = require('../utils/schemas');

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);

// Protected routes
router.post('/logout', isAuthenticated, validate(logoutSchema), logout);
router.get('/me', isAuthenticated, me);

// Backward-compatible alias
router.get('/profile', isAuthenticated, getProfile);

module.exports = router;
