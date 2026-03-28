const { Joi } = require('./validation');

const objectIdSchema = Joi.string().hex().length(24);

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  avatar: Joi.string().trim().uri().optional(),
}).min(1);

const adminDeleteUserParamsSchema = Joi.object({
  id: objectIdSchema.required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  updateProfileSchema,
  adminDeleteUserParamsSchema,
};
