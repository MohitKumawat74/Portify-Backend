const crypto = require('crypto');
const Analytics = require('../models/Analytics');
const Portfolio = require('../models/Portfolio');

// One-way hash so raw IPs are never persisted
const hashIp = (ip) => crypto.createHash('sha256').update(ip || '').digest('hex');

const getTodayKey = () => new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

/**
 * Record a portfolio page view.
 * - Upserts the Analytics document for the portfolio.
 * - Increments views on the Portfolio document.
 * - Tracks unique visitors by hashed IP.
 * - Appends to daily view buckets (capped at 30 days).
 */
const recordView = async (portfolioId, slug, visitorIp) => {
  const visitorHash = hashIp(visitorIp);
  const today = getTodayKey();

  // Find or create the analytics document
  let analytics = await Analytics.findOne({ slug });

  if (!analytics) {
    analytics = new Analytics({ portfolioId, slug });
  }

  // Increment total views
  analytics.views += 1;

  // Unique visitor tracking (array of hashes)
  const isNew = !analytics.uniqueVisitorHashes.includes(visitorHash);
  if (isNew) {
    analytics.uniqueVisitorHashes.push(visitorHash);
    analytics.uniqueVisitors += 1;
  }

  // Daily views bucket
  const dayBucket = analytics.dailyViews.find((d) => d.date === today);
  if (dayBucket) {
    dayBucket.count += 1;
  } else {
    analytics.dailyViews.push({ date: today, count: 1 });
    // Keep only the last 30 days
    if (analytics.dailyViews.length > 30) {
      analytics.dailyViews.shift();
    }
  }

  await analytics.save();

  // Mirror lightweight counters onto the portfolio document
  await Portfolio.findByIdAndUpdate(portfolioId, {
    $inc: { views: 1, ...(isNew && { uniqueVisitors: 1 }) },
  });

  return analytics;
};

/**
 * Record a click on a project inside a portfolio.
 */
const recordProjectClick = async (slug) => {
  const analytics = await Analytics.findOneAndUpdate(
    { slug },
    { $inc: { projectClicks: 1 } },
    { new: true }
  );

  if (analytics) {
    await Portfolio.findByIdAndUpdate(analytics.portfolioId, {
      $inc: { projectClicks: 1 },
    });
  }

  return analytics;
};

/**
 * Retrieve full analytics for a portfolio slug.
 */
const getAnalyticsBySlug = async (slug) => {
  const analytics = await Analytics.findOne({ slug }).select('-uniqueVisitorHashes');

  if (!analytics) {
    // Return zeroed-out analytics if no visits recorded yet
    const portfolio = await Portfolio.findOne({ slug });
    if (!portfolio) {
      const error = new Error('Portfolio not found.');
      error.statusCode = 404;
      throw error;
    }
    return {
      portfolioId: portfolio._id,
      slug,
      views: 0,
      uniqueVisitors: 0,
      projectClicks: 0,
      dailyViews: [],
    };
  }

  return analytics;
};

module.exports = { recordView, recordProjectClick, getAnalyticsBySlug };
