const express = require('express');
const router = express.Router();
const { getPlans, upgradePlan } = require('../controllers/planController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/plans — Public
router.get('/', getPlans);

// POST /api/plans/upgrade — Protected
router.post('/upgrade', protect, upgradePlan);

module.exports = router;
