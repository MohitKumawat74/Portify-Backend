const ApiError = require('../utils/apiError');

const authorizeRoles = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.', 'AUTH_ERROR'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied for this resource.', 'AUTH_FORBIDDEN'));
    }

    return next();
  };
};

const isAdmin = authorizeRoles('admin');

module.exports = {
  authorizeRoles,
  isAdmin,
};
