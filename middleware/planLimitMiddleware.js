const Portfolio = require('../models/Portfolio');
const Template = require('../models/Template');
const User = require('../models/User');
const { isValidObjectId } = require('mongoose');
const ApiError = require('../utils/apiError');
const { getUserPlanContext } = require('../services/planService');
const {
  getPortfolioProjectCount,
  buildEffectivePortfolioPayload,
} = require('../utils/portfolioUsage');

const SUPPORTED_SECTION_TYPES = ['hero', 'about', 'skills', 'projects', 'contact'];

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
      }).select('templateId templateSlug');

      if (!existingPortfolio) {
        throw new ApiError(404, 'Portfolio not found or access denied.', 'NOT_FOUND');
      }
    }

    const templateSlug =
      req.body && req.body.templateSlug !== undefined
        ? req.body.templateSlug
        : existingPortfolio
          ? existingPortfolio.templateSlug
          : null;

    const templateId =
      req.body && req.body.templateId !== undefined
        ? req.body.templateId
        : existingPortfolio
          ? existingPortfolio.templateId
          : null;

    if (!templateId && !templateSlug) {
      return next();
    }

    let template = null;

    if (templateSlug) {
      template = await Template.findOne({ slug: String(templateSlug).trim().toLowerCase() }).select(
        '_id slug name isActive isPremium'
      );
    } else if (isValidObjectId(String(templateId))) {
      template = await Template.findById(templateId).select('_id slug name isActive isPremium');
    } else {
      template = await Template.findOne({ slug: String(templateId).trim().toLowerCase() }).select(
        '_id slug name isActive isPremium'
      );
    }

    if (!template || !template.isActive) {
      throw new ApiError(404, 'Template not found.', 'NOT_FOUND');
    }

    if (plan === 'free' && template.isPremium) {
      throwLimitExceeded('Upgrade to Pro to use this template');
    }

    if (!req.body || typeof req.body !== 'object') {
      req.body = {};
    }

    // Canonicalize downstream payload so service layer never sees invalid ObjectId-like ids.
    req.body.templateId = template._id;
    req.body.templateSlug = template.slug;

    return next();
  } catch (error) {
    return next(error);
  }
};

const checkSectionLimit = async (req, _res, next) => {
  try {
    const user = await getUserForLimits(req.user._id);
    const { limits } = getUserPlanContext(user);

    let sectionCount = 0;
    if (Array.isArray(req.body?.sections)) {
      sectionCount = req.body.sections.length;
    } else if (req.body?.section && typeof req.body.section === 'object') {
      const portfolioId = req.body.portfolioId;
      if (!portfolioId) {
        throw new ApiError(400, 'portfolioId is required.', 'VALIDATION_ERROR');
      }

      const portfolio = await Portfolio.findOne({ _id: portfolioId, userId: req.user._id }).select('sections');
      if (!portfolio) {
        throw new ApiError(404, 'Portfolio not found or access denied.', 'NOT_FOUND');
      }
      sectionCount = (portfolio.sections || []).length + 1;
    } else if (req.params.id) {
      const existingPortfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id }).select('sections');
      if (!existingPortfolio) {
        throw new ApiError(404, 'Portfolio not found or access denied.', 'NOT_FOUND');
      }
      sectionCount = Array.isArray(existingPortfolio.sections) ? existingPortfolio.sections.length : 0;
    }

    if (sectionCount > limits.maxSections) {
      throwLimitExceeded('Section limit exceeded. Upgrade to Pro plan.');
    }

    if (Array.isArray(req.body?.sections)) {
      const invalidSection = req.body.sections.find(
        (section) => !SUPPORTED_SECTION_TYPES.includes(String(section.type || '').toLowerCase())
      );

      if (invalidSection) {
        throw new ApiError(400, 'Unsupported section type.', 'VALIDATION_ERROR');
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

const checkAiGenerationLimit = async (req, _res, next) => {
  try {
    const user = await getUserForLimits(req.user._id);
    const { plan, limits } = getUserPlanContext(user);
    if (plan === 'pro' || !Number.isFinite(limits.maxAiGenerations)) {
      return next();
    }

    const now = new Date();
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usage = user.aiUsage || {};
    const usagePeriod = usage.periodStart ? new Date(usage.periodStart) : new Date(0);
    const normalizedCount = usagePeriod < currentPeriodStart ? 0 : Number(usage.count) || 0;

    if (normalizedCount >= limits.maxAiGenerations) {
      throwLimitExceeded('AI generation limit exceeded for free plan. Upgrade to Pro for unlimited access.');
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
  checkSectionLimit,
  checkAiGenerationLimit,
};
