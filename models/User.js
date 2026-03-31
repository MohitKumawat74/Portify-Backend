const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    refreshTokens: { type: [refreshTokenSchema], default: [] },
    plan: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
    planExpiry: {
      type: Date,
      default: null,
    },
    orderId: {
      type: String,
      default: null,
    },
    paymentId: {
      type: String,
      default: null,
    },
    portfolioCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    subscription: {
      planId: { type: String, default: 'plan_free' },
      planName: { type: String, default: 'Free' },
      status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
      currentPeriodStart: { type: Date },
      currentPeriodEnd: { type: Date },
      cancelAtPeriodEnd: { type: Boolean, default: false },
      stripeSubscriptionId: { type: String },
      paymentProvider: { type: String },
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
    },
    aiUsage: {
      count: { type: Number, default: 0, min: 0 },
      periodStart: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare plain password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasActiveRefreshTokenHash = function (tokenHash) {
  const now = new Date();
  return this.refreshTokens.some(
    (tokenEntry) => tokenEntry.tokenHash === tokenHash && tokenEntry.expiresAt > now
  );
};

userSchema.methods.pruneExpiredRefreshTokens = function () {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter((entry) => entry.expiresAt > now);
};

// Strip sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.refreshTokens;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
