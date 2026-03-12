const express = require('express');
const router = express.Router();
const { getAdminAnalytics, getUserAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// All admin analytics routes require authentication + admin role
router.use(protect, adminOnly);

// GET /api/admin/analytics
router.get('/', getAdminAnalytics);

// GET /api/admin/analytics/users
router.get('/users', getUserAnalytics);

module.exports = router;
