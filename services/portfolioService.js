const Portfolio = require('../models/Portfolio');
const { generateUniqueSlug } = require('../utils/slugGenerator');
const { recordView } = require('./analyticsService');

const createPortfolio = async (userId, data) => {
  const slug = await generateUniqueSlug(data.title);
  const portfolio = await Portfolio.create({ ...data, userId, slug });
  return portfolio;
};

const updatePortfolio = async (portfolioId, userId, data) => {
  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });

  if (!portfolio) {
    const error = new Error('Portfolio not found or you do not have permission.');
    error.statusCode = 404;
    throw error;
  }

  // Regenerate slug only if title changed
  if (data.title && data.title !== portfolio.title) {
    data.slug = await generateUniqueSlug(data.title);
  }

  Object.assign(portfolio, data);
  await portfolio.save();
  return portfolio;
};

const deletePortfolio = async (portfolioId, userId) => {
  const portfolio = await Portfolio.findOneAndDelete({ _id: portfolioId, userId });

  if (!portfolio) {
    const error = new Error('Portfolio not found or you do not have permission.');
    error.statusCode = 404;
    throw error;
  }

  return portfolio;
};

const getPortfolioBySlug = async (slug, visitorIp) => {
  const portfolio = await Portfolio.findOne({ slug, isPublished: true })
    .populate('userId', 'name avatar')
    .populate('templateId', 'name previewImage defaultTheme sections layout');

  if (!portfolio) {
    const error = new Error('Portfolio not found.');
    error.statusCode = 404;
    throw error;
  }

  // Delegate view + unique-visitor tracking to analytics service (fire-and-forget)
  recordView(portfolio._id, slug, visitorIp).catch(() => {});

  return portfolio;
};

const getUserPortfolios = async (userId, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const [portfolios, total] = await Promise.all([
    Portfolio.find({ userId })
      .populate('templateId', 'name previewImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Portfolio.countDocuments({ userId }),
  ]);
  return { portfolios, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getPortfolioById = async (portfolioId, userId, isAdmin) => {
  const query = isAdmin ? { _id: portfolioId } : { _id: portfolioId, userId };
  const portfolio = await Portfolio.findOne(query)
    .populate('userId', 'name avatar')
    .populate('templateId', 'name previewImage defaultTheme sections layout');
  if (!portfolio) {
    const error = new Error('Portfolio not found or access denied.');
    error.statusCode = 404;
    throw error;
  }
  return portfolio;
};

const publishPortfolio = async (portfolioId, userId) => {
  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
  if (!portfolio) {
    const error = new Error('Portfolio not found or access denied.');
    error.statusCode = 404;
    throw error;
  }
  portfolio.isPublished = true;
  await portfolio.save();
  return portfolio;
};

const unpublishPortfolio = async (portfolioId, userId) => {
  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
  if (!portfolio) {
    const error = new Error('Portfolio not found or access denied.');
    error.statusCode = 404;
    throw error;
  }
  portfolio.isPublished = false;
  await portfolio.save();
  return portfolio;
};

module.exports = {
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioBySlug,
  getUserPortfolios,
  getPortfolioById,
  publishPortfolio,
  unpublishPortfolio,
};
