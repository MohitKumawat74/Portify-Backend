const Analytics = require('../models/Analytics');
const { isValidObjectId } = require('mongoose');
const {
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioBySlug,
  getPublishedPortfolioByUsername,
  getUserPortfolios,
  getPortfolioBuilderData,
  getPortfolioById,
  savePortfolioCustomization,
  updatePortfolioSectionContent,
  reorderPortfolioSections,
  addPortfolioSection,
  removePortfolioSection,
  publishPortfolio,
  unpublishPortfolio,
} = require('../services/portfolioService');

const create = async (req, res, next) => {
  try {
    const portfolio = await createPortfolio(req.user._id, req.body);
    res.status(201).json({
      success: true,
      message: 'Portfolio created',
      data: portfolio,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const portfolio = await updatePortfolio(req.params.id, req.user._id, req.body);
    res.status(200).json({
      success: true,
      message: 'Portfolio updated',
      data: portfolio,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await deletePortfolio(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: 'Portfolio deleted', data: null });
  } catch (error) {
    next(error);
  }
};

// GET /portfolios/public/:slug — Public
const getBySlug = async (req, res, next) => {
  try {
    const visitorIp = req.ip || req.headers['x-forwarded-for'] || '';
    const portfolio = await getPortfolioBySlug(req.params.slug, visitorIp);
    res.status(200).json({ success: true, message: 'Portfolio fetched', data: portfolio });
  } catch (error) {
    next(error);
  }
};

// GET /portfolio/:username — Public render endpoint
const getPublicByUsername = async (req, res, next) => {
  try {
    if (isValidObjectId(String(req.params.username || ''))) {
      return next();
    }

    const visitorIp = req.ip || req.headers['x-forwarded-for'] || '';
    const payload = await getPublishedPortfolioByUsername(req.params.username, visitorIp);
    res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
};

// GET /portfolios — Protected (paginated list for the authenticated user)
const getMyPortfolios = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const { portfolios, total, totalPages } = await getUserPortfolios(req.user._id, { page, limit });
    res.status(200).json({ data: portfolios, total, page, limit, totalPages });
  } catch (error) {
    next(error);
  }
};

// GET /portfolio/builder — Protected
const getBuilderData = async (req, res, next) => {
  try {
    const data = await getPortfolioBuilderData(req.user._id, {
      portfolioId: req.query.portfolioId || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Portfolio builder data fetched',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /portfolios/:id — Protected (owner or admin)
const getById = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const portfolio = await getPortfolioById(req.params.id, req.user._id, isAdmin);
    res.status(200).json({ success: true, message: 'Portfolio fetched', data: portfolio });
  } catch (error) {
    next(error);
  }
};

// PATCH /portfolios/:id/publish — Protected
const publish = async (req, res, next) => {
  try {
    const portfolio = await publishPortfolio(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      message: 'Portfolio published',
      data: {
        id: portfolio._id,
        isPublished: portfolio.isPublished,
        slug: portfolio.slug,
        updatedAt: portfolio.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /portfolios/:id/unpublish — Protected
const unpublish = async (req, res, next) => {
  try {
    const portfolio = await unpublishPortfolio(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      message: 'Portfolio unpublished',
      data: {
        id: portfolio._id,
        isPublished: portfolio.isPublished,
        updatedAt: portfolio.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /portfolios/:id/analytics — Protected (owner or admin)
const getPortfolioAnalytics = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const portfolio = await getPortfolioById(req.params.id, req.user._id, isAdmin);

    const from = req.query.from
      ? new Date(req.query.from)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const to = req.query.to ? new Date(req.query.to) : new Date();

    const analytics = await Analytics.findOne({ portfolioId: portfolio._id }).select(
      '-uniqueVisitorHashes'
    );

    const fromKey = from.toISOString().slice(0, 10);
    const toKey = to.toISOString().slice(0, 10);

    const viewsByDay = analytics
      ? analytics.dailyViews.filter((d) => d.date >= fromKey && d.date <= toKey)
      : [];

    res.status(200).json({
      success: true,
      message: 'Analytics fetched',
      data: {
        portfolioId: portfolio._id,
        totalViews: analytics?.views || 0,
        uniqueVisitors: analytics?.uniqueVisitors || 0,
        avgTimeOnPage: null,
        topCountries: [],
        viewsByDay,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /portfolio/customize — Protected
const customize = async (req, res, next) => {
  try {
    const portfolio = await savePortfolioCustomization(req.user._id, req.body || {});
    res.status(200).json({
      success: true,
      message: 'Portfolio customization saved',
      data: portfolio,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /portfolio/reorder — Protected
const reorderSections = async (req, res, next) => {
  try {
    const portfolio = await reorderPortfolioSections(req.user._id, req.body || {});
    res.status(200).json({
      success: true,
      message: 'Portfolio sections reordered',
      data: portfolio,
    });
  } catch (error) {
    next(error);
  }
};

// POST /portfolio/section — Protected
const addSection = async (req, res, next) => {
  try {
    const portfolio = await addPortfolioSection(req.user._id, req.body || {});
    res.status(201).json({
      success: true,
      message: 'Portfolio section added',
      data: portfolio,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /portfolio/section — Protected
const updateSection = async (req, res, next) => {
  try {
    const portfolio = await updatePortfolioSectionContent(req.user._id, req.body || {});
    res.status(200).json({
      success: true,
      message: 'Portfolio section updated',
      data: portfolio,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /portfolio/section/:id — Protected
const removeSection = async (req, res, next) => {
  try {
    const portfolio = await removePortfolioSection(req.user._id, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Portfolio section removed',
      data: portfolio,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  update,
  remove,
  getBySlug,
  getPublicByUsername,
  getMyPortfolios,
  getBuilderData,
  getById,
  publish,
  unpublish,
  customize,
  reorderSections,
  addSection,
  updateSection,
  removeSection,
  getPortfolioAnalytics,
};

