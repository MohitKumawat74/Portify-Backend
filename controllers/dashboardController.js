const { sendSuccess } = require('../utils/response');
const { getDashboardStats } = require('../services/dashboardService');

const getStats = async (req, res, next) => {
  try {
    const stats = await getDashboardStats(req.user._id);
    return sendSuccess(res, 200, 'Dashboard stats fetched', stats);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStats,
};
