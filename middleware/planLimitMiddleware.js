const Portfolio = require('../models/Portfolio');
const Template = require('../models/Template');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { getUserPlanContext } = require('../services/planService');
const { FREE_TEMPLATE_NAME } = require('../config/planLimits');
const {
  getPortfolioProjectCount,
  buildEffectivePortfolioPayload,
} = require('../utils/portfolioUsage');

const getUserForLimits = async (userId) => {
  const user = await User.findById(userId).select('plan planExpiry subscription portfolioCount');
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }
  return user;
};

const throwLimitExceeded = (message = 'Limit exceeded. Upgrade to Pro plan.') => {
  throw new ApiError(403, message, 'PLAN_LIMIT_EXCEEDED');
};

const checkPortfolioLimit = async (req, _res, next) => {
  try {
    const user = await getUserForLimits(req.user._id);
    const { limits } = getUserPlanContext(user);

    const usedPortfolios = await Portfolio.countDocuments({ userId: req.user._id });

    if (usedPortfolios >= limits.maxPortfolios) {
      throwLimitExceeded('Limit exceeded. Upgrade to Pro plan.');
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

const checkProjectLimit = async (req, _res, next) => {
  try {
    const user = await getUserForLimits(req.user._id);
    const { limits } = getUserPlanContext(user);

    let existingPortfolio = null;

    if (req.params.id) {
      existingPortfolio = await Portfolio.findOne({
        _id: req.params.id,
        userId: req.user._id,
      }).select('sections content templateId');

      if (!existingPortfolio) {
        throw new ApiError(404, 'Portfolio not found or access denied.', 'NOT_FOUND');
      }
    }

    const effectivePayload = buildEffectivePortfolioPayload(existingPortfolio, req.body || {});
    const projectCount = getPortfolioProjectCount(effectivePayload);

    if (projectCount > limits.maxProjects) {
      throwLimitExceeded('Limit exceeded. Upgrade to Pro plan.');
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

const checkTemplateAccess = async (req, _res, next) => {
  try {
    const user = await getUserForLimits(req.user._id);
    const { plan } = getUserPlanContext(user);

    let existingPortfolio = null;

    if (req.params.id) {
      existingPortfolio = await Portfolio.findOne({
        _id: req.params.id,
        userId: req.user._id,
      }).select('templateId');

      if (!existingPortfolio) {
        throw new ApiError(404, 'Portfolio not found or access denied.', 'NOT_FOUND');
      }
    }

    const templateId =
      req.body && req.body.templateId !== undefined
        ? req.body.templateId
        : existingPortfolio
          ? existingPortfolio.templateId
          : null;

    if (!templateId) {
      return next();
    }

    const template = await Template.findById(templateId).select('name isActive');
    if (!template || !template.isActive) {
      throw new ApiError(404, 'Template not found.', 'NOT_FOUND');
    }

    if (plan === 'free') {
      const templateName = String(template.name || '').trim().toLowerCase();
      if (templateName !== FREE_TEMPLATE_NAME) {
        throwLimitExceeded('Upgrade to Pro to use this template');
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  checkPortfolioLimit,
  checkProjectLimit,
  checkTemplateAccess,
};
