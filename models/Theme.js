const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Theme name is required'],
      trim: true,
    },
    description: { type: String, default: '' },
    previewImage: { type: String, default: '' },
    colors: {
      primaryColor: { type: String, default: '#3B82F6' },
      secondaryColor: { type: String, default: '#1E40AF' },
      backgroundColor: { type: String, default: '#FFFFFF' },
      textColor: { type: String, default: '#111827' },
      accentColor: { type: String, default: '#F59E0B' },
    },
    typography: {
      fontFamily: { type: String, default: 'Inter' },
      headingFont: { type: String, default: 'Inter' },
      baseFontSize: { type: String, default: '16px' },
    },
    isDark: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Theme', themeSchema);
