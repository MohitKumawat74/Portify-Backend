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

const templateSectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      trim: true,
    },
    type: {
      type: String,
      enum: ['hero', 'about', 'skills', 'projects', 'contact'],
      required: true,
      lowercase: true,
      trim: true,
    },
    defaultContent: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    defaultStyle: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    animation: {
      type: animationConfigSchema,
      default: () => ({}),
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const globalStylesSchema = new mongoose.Schema(
  {
    colors: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    fonts: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    spacing: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const templateConfigSchema = new mongoose.Schema(
  {
    sections: {
      type: [String],
      default: ['hero', 'about', 'skills', 'projects', 'contact'],
    },
    theme: {
      colors: {
        primary: { type: String, default: '#3B82F6' },
        secondary: { type: String, default: '#1E40AF' },
        background: { type: String, default: '#FFFFFF' },
      },
      fonts: {
        heading: { type: String, default: 'Inter' },
        body: { type: String, default: 'Inter' },
      },
    },
    layout: {
      type: String,
      enum: ['grid', 'split', 'minimal', 'single-column', 'two-column', 'sidebar'],
      default: 'minimal',
    },
  },
  { _id: false }
);

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Template slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, default: '' },
    previewImage: { type: String, default: '' },
    category: {
      type: String,
      trim: true,
      default: 'single-column',
    },
    isPremium: { type: Boolean, default: false },
    sections: {
      type: [templateSectionSchema],
      default: [],
    },
    globalStyles: {
      type: globalStylesSchema,
      default: () => ({}),
    },
    config: {
      type: templateConfigSchema,
      default: () => ({}),
    },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

templateSchema.pre('validate', function ensureSlug() {
  if (!this.slug && this.name) {
    this.slug = String(this.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});



module.exports = mongoose.model('Template', templateSchema);
