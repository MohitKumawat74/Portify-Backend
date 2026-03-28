const ApiError = require('../utils/apiError');

const notFound = (req, res, next) => {
  return next(new ApiError(404, `Route not found: ${req.originalUrl}`, 'NOT_FOUND'));
};

const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Something went wrong';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    statusCode = 409;
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    errorCode = 'CONFLICT_ERROR';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    statusCode = 400;
    message = messages.join(', ');
    errorCode = 'VALIDATION_ERROR';
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID.';
    errorCode = 'VALIDATION_ERROR';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
    errorCode = 'AUTH_ERROR';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
    errorCode = 'AUTH_ERROR';
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
