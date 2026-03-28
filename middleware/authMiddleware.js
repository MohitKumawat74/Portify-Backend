const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { verifyAccessToken } = require('../utils/token');

const isAuthenticated = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Not authorized. No token provided.', 'AUTH_ERROR');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password -refreshTokens');

    if (!user || !user.isActive) {
      throw new ApiError(
        401,
        'Not authorized. User not found or account inactive.',
        'AUTH_ERROR'
      );
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.statusCode) {
      return next(error);
    }

    return next(new ApiError(401, 'Not authorized. Token is invalid or expired.', 'AUTH_ERROR'));
  }
};

module.exports = {
  isAuthenticated,
  protect: isAuthenticated,
};
