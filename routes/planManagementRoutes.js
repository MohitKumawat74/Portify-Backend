const express = require('express');

const { upgradePlan } = require('../controllers/planController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/plan/upgrade — Protected
router.post('/upgrade', protect, upgradePlan);

module.exports = router;
