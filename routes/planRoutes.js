const express = require('express');
const router = express.Router();
const { getPlans, upgradePlan, createOrUpdatePlan, getPlanById, updatePlanById } = require('../controllers/planController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// GET /api/plans — Public
router.get('/', getPlans);

// GET /api/plans/:id — Public
router.get('/:id', getPlanById);

// POST /api/plans/upgrade — Protected
router.post('/upgrade', protect, upgradePlan);

// POST /api/plans — Admin create/update plan
router.post('/', protect, isAdmin, createOrUpdatePlan);

// PUT /api/plans/:id — Admin update plan
router.put('/:id', protect, isAdmin, updatePlanById);

module.exports = router;
