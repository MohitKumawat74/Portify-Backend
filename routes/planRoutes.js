const express = require('express');
const router = express.Router();
const { getPlans } = require('../controllers/planController');

// GET /api/plans — Public
router.get('/', getPlans);

module.exports = router;
