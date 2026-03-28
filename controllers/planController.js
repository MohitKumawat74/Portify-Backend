const { sendSuccess } = require('../utils/response');
const { getActivePlans, upgradeUserPlan } = require('../services/planService');

// GET /api/plans — Public
const getPlans = async (req, res) => {
  const plans = getActivePlans();
  return sendSuccess(res, 200, 'Plans fetched', plans);
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
