const Joi = require('joi');
const ApiError = require('./apiError');

const validate = (schema, source = 'body') => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return next(
        new ApiError(
          400,
          error.details.map((detail) => detail.message).join(', '),
          'VALIDATION_ERROR'
        )
      );
    }

    req[source] = value;
    return next();
  };
};

module.exports = { validate, Joi };
