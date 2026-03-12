const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Template = require('../models/Template');
const Analytics = require('../models/Analytics');

// GET /admin/analytics — Admin Only: platform-wide overview
const getAdminAnalytics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalPortfolios,
      totalTemplates,
      activePortfolios,
      recentSignups,
      topTemplatesAgg,
      signupsByDayAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Portfolio.countDocuments(),
      Template.countDocuments({ isActive: true }),
      Portfolio.countDocuments({ isPublished: true }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Portfolio.aggregate([
        { $match: { templateId: { $ne: null } } },
        { $group: { _id: '$templateId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'templates',
            localField: '_id',
            foreignField: '_id',
            as: 'templateInfo',
          },
        },
        { $unwind: { path: '$templateInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            templateId: '$_id',
            name: { $ifNull: ['$templateInfo.name', 'Unknown'] },
            count: 1,
            _id: 0,
          },
        },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            signups: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', signups: 1, _id: 0 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      message: 'Analytics fetched',
      data: {
        totalUsers,
        totalPortfolios,
        totalTemplates,
        activePortfolios,
        recentSignups,
        topTemplates: topTemplatesAgg,
        revenueThisMonth: 0,
        revenueLastMonth: 0,
        signupsByDay: signupsByDayAgg,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/analytics/users — Admin Only: user growth stats
const getUserAnalytics = async (req, res, next) => {
  try {
    const from = req.query.from
      ? new Date(req.query.from)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const to = req.query.to ? new Date(req.query.to) : new Date();

    const [newUsers, activeUsers, churnedUsers, usersByPlan] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: from, $lte: to } }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.aggregate([
        { $group: { _id: '$subscription.planId', count: { $sum: 1 } } },
        { $project: { planId: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    const totalBeforePeriod = await User.countDocuments({ createdAt: { $lt: from } });
    const retentionRate =
      totalBeforePeriod > 0
        ? parseFloat((((totalBeforePeriod - churnedUsers) / totalBeforePeriod) * 100).toFixed(1))
        : 100;

    const planMap = { plan_free: 0, plan_pro: 0, plan_team: 0 };
    usersByPlan.forEach(({ planId, count }) => {
      if (planId in planMap) planMap[planId] = count;
    });

    res.status(200).json({
      success: true,
      message: 'User analytics fetched',
      data: {
        newUsers,
        activeUsers,
        churnedUsers,
        retentionRate,
        usersByPlan: {
          free: planMap.plan_free,
          pro: planMap.plan_pro,
          team: planMap.plan_team,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAdminAnalytics, getUserAnalytics };

