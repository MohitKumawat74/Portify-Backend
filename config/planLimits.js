const PLAN_LIMITS = {
  free: {
    maxPortfolios: 1,
    maxProjects: 1,
    maxTemplates: 1,
  },
  pro: {
    maxPortfolios: 15,
    maxProjects: 15,
    maxTemplates: 15,
  },
};

const FREE_TEMPLATE_NAME = (process.env.FREE_TEMPLATE_NAME || 'template1').toLowerCase();

const PLAN_ID_TO_PLAN_CODE = {
  plan_free: 'free',
  plan_pro: 'pro',
};

const normalizePlanCode = (value) => {
  if (!value) return 'free';
  const normalized = String(value).trim().toLowerCase();
  return PLAN_LIMITS[normalized] ? normalized : 'free';
};

const resolveUserPlan = (user) => {
  if (!user) return 'free';

  const subscriptionPlanCode =
    user.subscription && user.subscription.planId
      ? PLAN_ID_TO_PLAN_CODE[user.subscription.planId]
      : null;

  // Preserve backwards compatibility with older data where paid tier was stored
  // only in subscription.planId.
  if (subscriptionPlanCode === 'pro') {
    return 'pro';
  }

  if (user.plan) {
    return normalizePlanCode(user.plan);
  }

  return 'free';
};

const getPlanLimits = (planCode) => {
  return PLAN_LIMITS[normalizePlanCode(planCode)] || PLAN_LIMITS.free;
};

module.exports = {
  PLAN_LIMITS,
  PLAN_ID_TO_PLAN_CODE,
  FREE_TEMPLATE_NAME,
  normalizePlanCode,
  resolveUserPlan,
  getPlanLimits,
};
