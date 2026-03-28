const User = require('../models/User');
const ApiError = require('../utils/apiError');
const {
  resolveUserPlan,
  getPlanLimits,
  normalizePlanCode,
} = require('../config/planLimits');

const PLAN_CATALOG = [
  {
    id: 'plan_free',
    code: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    billingPeriod: 'forever',
    description: 'Get started with one portfolio and one project.',
    features: ['1 portfolio', '1 project per portfolio', 'Default template access'],
    isPopular: false,
    isActive: true,
  },
  {
    id: 'plan_pro',
    code: 'pro',
    name: 'Pro',
    price: 9,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'Scale your portfolio presence with higher limits.',
    features: ['15 portfolios', '15 projects per portfolio', 'Up to 15 templates'],
    isPopular: true,
    isActive: true,
  },
];

const getActivePlans = () => {
  return PLAN_CATALOG.filter((plan) => plan.isActive).map((plan) => ({
    ...plan,
    limits: getPlanLimits(plan.code),
  }));
};

const getUserPlanContext = (user) => {
  const plan = resolveUserPlan(user);
  return {
    plan,
    limits: getPlanLimits(plan),
  };
};

const upgradeUserPlan = async (userId, requestedPlan = 'pro', options = {}) => {
  const targetPlan = normalizePlanCode(requestedPlan);
  const {
    planDurationDays = 30,
    paymentId = null,
    orderId = null,
    paymentProvider = null,
  } = options;

  if (targetPlan !== 'pro') {
    throw new ApiError(400, 'Only Pro upgrade is supported right now.', 'VALIDATION_ERROR');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }

  const currentPlan = resolveUserPlan(user);

  const normalizedPlanDays = Number(planDurationDays);
  const validPlanDays = Number.isFinite(normalizedPlanDays) && normalizedPlanDays > 0;
  const durationMs = (validPlanDays ? normalizedPlanDays : 30) * 24 * 60 * 60 * 1000;
  const nextPlanExpiry = new Date(Date.now() + durationMs);

  if (orderId) {
    user.orderId = orderId;
  }
  if (paymentId) {
    user.paymentId = paymentId;
  }

  if (!user.subscription) {
    user.subscription = {};
  }

  if (paymentProvider) {
    user.subscription.paymentProvider = paymentProvider;
  }
  if (orderId) {
    user.subscription.razorpayOrderId = orderId;
  }
  if (paymentId) {
    user.subscription.razorpayPaymentId = paymentId;
  }

  if (currentPlan === 'pro') {
    if (orderId || paymentId || paymentProvider) {
      await user.save();
    }

    return {
      user,
      changed: false,
      plan: 'pro',
    };
  }

  user.plan = 'pro';
  user.planExpiry = nextPlanExpiry;

  user.subscription.planId = 'plan_pro';
  user.subscription.planName = 'Pro';
  user.subscription.status = 'active';
  user.subscription.currentPeriodStart = new Date();
  user.subscription.currentPeriodEnd = user.planExpiry;
  user.subscription.cancelAtPeriodEnd = false;

  await user.save();

  return {
    user,
    changed: true,
    plan: 'pro',
  };
};

module.exports = {
  PLAN_CATALOG,
  getActivePlans,
  getUserPlanContext,
  upgradeUserPlan,
};
