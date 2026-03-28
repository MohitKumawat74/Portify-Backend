const Portfolio = require('../models/Portfolio');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { getUserPlanContext } = require('./planService');
const { getPortfolioProjectCount } = require('../utils/portfolioUsage');

const getDashboardStats = async (userId) => {
  const user = await User.findById(userId).select('plan planExpiry subscription portfolioCount');
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }

  const { plan, limits } = getUserPlanContext(user);

  const portfolios = await Portfolio.find({ userId }).select('sections content').lean();
  const portfoliosUsed = portfolios.length;

  let totalProjects = 0;
  let projectsUsed = 0;

  for (const portfolio of portfolios) {
    const projectCount = getPortfolioProjectCount(portfolio);
    totalProjects += projectCount;
    if (projectCount > projectsUsed) {
      projectsUsed = projectCount;
    }
  }

  return {
    plan,
    planExpiry: user.planExpiry || null,
    portfoliosUsed,
    portfoliosLimit: limits.maxPortfolios,
    projectsUsed,
    projectsLimit: limits.maxProjects,
    templatesLimit: limits.maxTemplates,
    totalProjects,
  };
};

module.exports = {
  getDashboardStats,
};
