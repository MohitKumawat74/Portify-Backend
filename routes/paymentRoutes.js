const express = require('express');
const {
  createOrder,
  verifyPayment,
  webhook,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public webhook endpoint from Razorpay for asynchronous payment confirmation.
router.post('/webhook', webhook);

// Authenticated payment endpoints.
router.use(protect);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

module.exports = router;
