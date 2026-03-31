const mongoose = require('mongoose');

const animationConfigSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['fade', 'slide', 'scale'],
      default: 'fade',
    },
    trigger: {
      type: String,
      enum: ['scroll', 'load'],
      default: 'load',
    },
    duration: {
      type: Number,
      default: 0.6,
      min: 0,
    },
    delay: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      trim: true,
    },
    type: {
      type: String,
      required: true,
      // e.g. 'hero', 'about', 'projects', 'skills', 'experience', 'contact'
    },
    title: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    styleOverrides: { type: mongoose.Schema.Types.Mixed, default: {} },
    animation: {
      type: animationConfigSchema,
      default: () => ({}),
    },
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
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      default: null,
    },
    templateSlug: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
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
    customizations: {
      colors: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      fonts: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      layout: {
        type: String,
        default: null,
      },
      sectionVisibility: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
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
portfolioSchema.index({ username: 1, isPublished: 1, updatedAt: -1 });

module.exports = mongoose.model('Portfolio', portfolioSchema);
