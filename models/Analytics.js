const mongoose = require('mongoose');

const dailyViewSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const analyticsSchema = new mongoose.Schema(
  {
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    views: { type: Number, default: 0 },
    // Hashed IPs for privacy — used only to count uniques, not stored raw
    uniqueVisitorHashes: { type: [String], default: [] },
    uniqueVisitors: { type: Number, default: 0 },
    projectClicks: { type: Number, default: 0 },
    // Last 30 days of daily view counts for trend graphs
    dailyViews: { type: [dailyViewSchema], default: [] },
  },
  { timestamps: true }
);


module.exports = mongoose.model('Analytics', analyticsSchema);
