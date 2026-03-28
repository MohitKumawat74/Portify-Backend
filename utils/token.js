const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const getAccessTokenSecret = () => process.env.JWT_SECRET;
const getRefreshTokenSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const ensureJwtSecrets = () => {
  if (!getAccessTokenSecret()) {
    throw new Error('Missing JWT_SECRET environment variable.');
  }
  if (!getRefreshTokenSecret()) {
    throw new Error('Missing JWT_REFRESH_SECRET environment variable.');
  }
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    getAccessTokenSecret(),
    { expiresIn: ACCESS_TOKEN_TTL }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenType: 'refresh',
    },
    getRefreshTokenSecret(),
    { expiresIn: REFRESH_TOKEN_TTL }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getAccessTokenSecret());
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRefreshTokenSecret());
};

const hashRefreshToken = (refreshToken) => {
  return crypto.createHash('sha256').update(refreshToken).digest('hex');
};

const getRefreshTokenCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = (
    process.env.REFRESH_COOKIE_SAMESITE || (isProduction ? 'none' : 'lax')
  ).toLowerCase();

  return {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

module.exports = {
  ensureJwtSecrets,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
  getRefreshTokenCookieOptions,
};
