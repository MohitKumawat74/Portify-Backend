const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    description: { type: String, default: '' },
    previewImage: { type: String, default: '' },
    category: {
      type: String,
      enum: ['minimal', 'creative', 'professional', 'modern'],
      default: 'minimal',
    },
    // Ordered list of section-type identifiers supported by this template
    // e.g. ['hero', 'about', 'skills', 'projects', 'experience', 'testimonials', 'contact']
    sections: {
      type: [String],
      default: ['hero', 'about', 'projects', 'contact'],
    },
    layout: {
      type: String,
      enum: ['single-column', 'two-column', 'sidebar', 'grid'],
      default: 'single-column',
    },
    isPremium: { type: Boolean, default: false },
    defaultTheme: {
      primaryColor: { type: String, default: '#3B82F6' },
      secondaryColor: { type: String, default: '#1E40AF' },
      backgroundColor: { type: String, default: '#FFFFFF' },
      textColor: { type: String, default: '#111827' },
      fontFamily: { type: String, default: 'Inter' },
    },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', templateSchema);
