const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      // e.g. 'hero', 'about', 'projects', 'skills', 'experience', 'contact'
    },
    title: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const themeConfigSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: '#3B82F6' },
    secondaryColor: { type: String, default: '#1E40AF' },
    backgroundColor: { type: String, default: '#FFFFFF' },
    textColor: { type: String, default: '#111827' },
    fontFamily: { type: String, default: 'Inter' },
    darkMode: { type: Boolean, default: false },
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Portfolio title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    bio: { type: String, default: '' },
    themeConfig: {
      type: themeConfigSchema,
      default: () => ({}),
    },
    sections: {
      type: [sectionSchema],
      default: [],
    },
    isPublished: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    projectClicks: { type: Number, default: 0 },
    // Top-level flexible content bag for extra dynamic data per section type
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  { timestamps: true }
);

portfolioSchema.index({ userId: 1 });

module.exports = mongoose.model('Portfolio', portfolioSchema);
