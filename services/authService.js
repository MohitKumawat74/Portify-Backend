const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const {
  ensureJwtSecrets,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
} = require('../utils/token');

const MAX_REFRESH_TOKENS_PER_USER = 5;
const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const toPublicUser = (user) => {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan || 'free',
    planExpiry: user.planExpiry || null,
    portfolioCount: user.portfolioCount || 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const addRefreshTokenToUser = (user, refreshToken) => {
  user.pruneExpiredRefreshTokens();
  user.refreshTokens.push({
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
  });

  if (user.refreshTokens.length > MAX_REFRESH_TOKENS_PER_USER) {
    user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS_PER_USER);
  }
};

const registerUser = async ({ name, email, password }) => {
  ensureJwtSecrets();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered.', 'AUTH_CONFLICT');
  }

  const user = await User.create({ name, email, password });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  addRefreshTokenToUser(user, refreshToken);
  await user.save();

  return { user: toPublicUser(user), accessToken, refreshToken };
};

const loginUser = async ({ email, password }) => {
  ensureJwtSecrets();

  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.', 'AUTH_ERROR');
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      'Your account has been deactivated. Contact support.',
      'AUTH_FORBIDDEN'
    );
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  addRefreshTokenToUser(user, refreshToken);
  await user.save();

  return { user: toPublicUser(user), accessToken, refreshToken };
};

const refreshAccessToken = async (refreshToken) => {
  ensureJwtSecrets();

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token is required.', 'AUTH_ERROR');
  }

  let decoded = null;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (_error) {
    throw new ApiError(401, 'Invalid or expired refresh token.', 'AUTH_ERROR');
  }

  if (decoded.tokenType !== 'refresh') {
    throw new ApiError(401, 'Invalid token type.', 'AUTH_ERROR');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User not found or inactive.', 'AUTH_ERROR');
  }

  user.pruneExpiredRefreshTokens();

  const refreshTokenHash = hashRefreshToken(refreshToken);
  if (!user.hasActiveRefreshTokenHash(refreshTokenHash)) {
    throw new ApiError(401, 'Refresh token not recognised.', 'AUTH_ERROR');
  }

  user.refreshTokens = user.refreshTokens.filter(
    (entry) => entry.tokenHash !== refreshTokenHash
  );

  const newRefreshToken = generateRefreshToken(user);
  addRefreshTokenToUser(user, newRefreshToken);
  await user.save();

  return {
    accessToken: generateAccessToken(user),
    refreshToken: newRefreshToken,
    user: toPublicUser(user),
  };
};

const logoutUser = async (userId, refreshToken) => {
  if (!userId) {
    return;
  }

  const user = await User.findById(userId);
  if (!user) return;

  if (!refreshToken) {
    user.refreshTokens = [];
    await user.save();
    return;
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);
  user.refreshTokens = user.refreshTokens.filter(
    (entry) => entry.tokenHash !== refreshTokenHash
  );
  await user.save();
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  // Always succeed silently — do not reveal whether the email exists
  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save();

  // In production connect to an email provider (e.g. nodemailer / SendGrid)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
  }
};

const resetPassword = async (token, newPassword) => {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Password reset token is invalid or has expired.', 'AUTH_ERROR');
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // Invalidate all existing sessions after password change
  await user.save();
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  toPublicUser,
};

