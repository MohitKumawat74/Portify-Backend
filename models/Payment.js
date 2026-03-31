const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    paymentId: {
      type: String,
      default: undefined,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    plan: {
      type: String,
      enum: ['pro'],
      default: 'pro',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index(
  { paymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentId: { $exists: true, $type: 'string' },
    },
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
