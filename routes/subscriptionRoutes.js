const express = require('express');
const router = express.Router();
const { checkout, getCurrent, cancel } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

// All subscription routes require authentication
router.use(protect);

// POST /api/subscriptions/checkout
router.post('/checkout', checkout);

// GET  /api/subscriptions/current
router.get('/current', getCurrent);

// POST /api/subscriptions/cancel
router.post('/cancel', cancel);

module.exports = router;
