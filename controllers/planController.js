const { sendSuccess } = require('../utils/response');
const ApiError = require('../utils/apiError');
const Plan = require('../models/Plan');
const { getActivePlans, upgradeUserPlan, addOrUpdatePlan } = require('../services/planService');
const { getPlanLimits } = require('../config/planLimits');

// GET /api/plans — Public
// GET /api/plans — Public
const getPlans = async (req, res, next) => {
  try {
    const plans = await getActivePlans();
    return sendSuccess(res, 200, 'Plans fetched', plans);
  } catch (error) {
    return next(error);
  }
};

// POST /api/plan/upgrade — Protected (mock payment)
const upgradePlan = async (req, res, next) => {
  try {
    const { plan = 'pro' } = req.body || {};
    const { user, changed } = await upgradeUserPlan(req.user._id, plan);

    return sendSuccess(
      res,
      200,
      changed ? 'Plan upgraded successfully' : 'Plan is already Pro',
      {
        plan: user.plan,
        planExpiry: user.planExpiry,
        portfolioCount: user.portfolioCount || 0,
      }
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = { getPlans, upgradePlan };

// Admin: create or update a plan
const createOrUpdatePlan = async (req, res, next) => {
  try {
    const plan = await addOrUpdatePlan(req.body || {});
    return sendSuccess(res, 201, 'Plan created/updated', plan);
  } catch (error) {
    return next(error);
  }
};

// GET /api/plans/:id — Public
const getPlanById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const plan = await Plan.findOne({ $or: [{ id }, { code: id }] }).lean();
    if (!plan) {
      throw new ApiError(404, 'Plan not found.', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Plan fetched', { ...plan, limits: getPlanLimits(plan.code) });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/plans/:id — Admin update
const updatePlanById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const payload = { ...(req.body || {}), id };
    const plan = await addOrUpdatePlan(payload);
    return sendSuccess(res, 200, 'Plan updated', plan);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getPlans, upgradePlan, createOrUpdatePlan, getPlanById, updatePlanById };
