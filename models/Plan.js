const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    billingPeriod: { type: String, default: 'month' },
    description: { type: String, default: '' },
    features: { type: [String], default: [] },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

planSchema.index({ code: 1 });

module.exports = mongoose.model('Plan', planSchema);
