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
    features: [
      '1 portfolio',
      '1 project per portfolio',
      'Default template access',
      'Up to 3 modular sections',
      '5 AI generations per month',
    ],
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
    features: [
      '15 portfolios',
      '15 projects per portfolio',
      'Up to 15 templates',
      'Up to 25 modular sections',
      'Unlimited AI generations',
    ],
    isPopular: true,
    isActive: true,
  },
];

const Plan = require('../models/Plan');

const mapPlanDoc = (doc) => ({
  id: doc.id,
  code: doc.code,
  name: doc.name,
  price: doc.price,
  currency: doc.currency,
  billingPeriod: doc.billingPeriod,
  description: doc.description,
  features: Array.isArray(doc.features) ? doc.features : [],
  isPopular: Boolean(doc.isPopular),
  isActive: Boolean(doc.isActive),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const getActivePlans = async () => {
  // Prefer DB-backed plans; fallback to in-memory catalog when DB empty
  const docs = await Plan.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  if (Array.isArray(docs) && docs.length > 0) {
    return docs.map((d) => ({ ...mapPlanDoc(d), limits: getPlanLimits(d.code) }));
  }

  // Seed DB if empty
  const seeded = await Promise.all(
    PLAN_CATALOG.map(async (p) => {
      const exists = await Plan.findOne({ id: p.id });
      if (exists) return exists;
      return Plan.create({ ...p });
    })
  );

  return seeded.filter(Boolean).map((d) => ({ ...mapPlanDoc(d), limits: getPlanLimits(d.code) }));
};

const makePlanId = (name) => {
  const base = String(name || 'plan').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `plan_${base}`;
};

const normalizeCurrency = (c) => (String(c || 'USD').toUpperCase());

const addOrUpdatePlan = async (planData = {}) => {
  const {
    id: incomingId,
    name,
    price,
    currency,
    billingPeriod,
    interval,
    description,
    features,
    isActive = true,
    isPopular = false,
    code: incomingCode,
  } = planData;

  if (!name || typeof name !== 'string') {
    throw new ApiError(400, 'Plan name is required.', 'VALIDATION_ERROR');
  }

  const code = String(incomingCode || name).trim().toLowerCase();
  const id = String(incomingId || makePlanId(name));

  const payload = {
    id,
    code,
    name: String(name).trim(),
    price: typeof price === 'number' ? price : Number(price) || 0,
    currency: normalizeCurrency(currency),
    billingPeriod: billingPeriod || interval || 'month',
    description: description || '',
    features: Array.isArray(features) ? features.slice(0, 50) : [],
    isPopular: Boolean(isPopular),
    isActive: Boolean(isActive),
  };

  const existing = await Plan.findOne({ $or: [{ id }, { code }] });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return { ...mapPlanDoc(existing), limits: getPlanLimits(existing.code) };
  }

  const created = await Plan.create(payload);
  return { ...mapPlanDoc(created), limits: getPlanLimits(created.code) };
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
  addOrUpdatePlan,
  getUserPlanContext,
  upgradeUserPlan,
};
