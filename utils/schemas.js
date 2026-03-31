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

const supportedSectionTypes = ['hero', 'about', 'skills', 'projects', 'contact'];

const sectionInputSchema = Joi.object({
  id: Joi.string().optional(),
  type: Joi.string()
    .valid(...supportedSectionTypes)
    .required(),
  order: Joi.number().integer().min(0).optional(),
  content: Joi.alternatives().try(Joi.object(), Joi.array()).required(),
});

const reorderSectionsSchema = Joi.object({
  portfolioId: objectIdSchema.required(),
  sections: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        order: Joi.number().integer().min(0).required(),
      })
    )
    .min(1)
    .required(),
});

const addSectionSchema = Joi.object({
  portfolioId: objectIdSchema.required(),
  section: sectionInputSchema.required(),
});

const removeSectionParamsSchema = Joi.object({
  id: Joi.string().required(),
});

const animationSchema = Joi.object({
  type: Joi.string().valid('fade', 'slide', 'scale').default('fade'),
  trigger: Joi.string().valid('scroll', 'load').default('load'),
  duration: Joi.number().min(0).default(0.6),
  delay: Joi.number().min(0).default(0),
}).optional();

const templateSectionBuilderSchema = Joi.object({
  id: Joi.string().optional(),
  type: Joi.string()
    .valid(...supportedSectionTypes)
    .required(),
  defaultContent: Joi.object().unknown(true).default({}),
  defaultStyle: Joi.object().unknown(true).default({}),
  animation: animationSchema,
  order: Joi.number().integer().min(0).optional(),
});

const globalStylesSchema = Joi.object({
  colors: Joi.object().unknown(true).default({}),
  fonts: Joi.object().unknown(true).default({}),
  spacing: Joi.object().unknown(true).default({}),
}).default({});

const createTemplateBuilderSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  slug: Joi.string().trim().min(2).max(120).optional(),
  description: Joi.string().allow('').max(2000).optional(),
  previewImage: Joi.string().uri().allow('').optional(),
  category: Joi.string().trim().max(60).optional(),
  isPremium: Joi.boolean().optional(),
  sections: Joi.array().items(templateSectionBuilderSchema).min(1).required(),
  globalStyles: globalStylesSchema,
});

const updateTemplateBuilderSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  slug: Joi.string().trim().min(2).max(120).optional(),
  description: Joi.string().allow('').max(2000).optional(),
  previewImage: Joi.string().uri().allow('').optional(),
  category: Joi.string().trim().max(60).optional(),
  isPremium: Joi.boolean().optional(),
  sections: Joi.array().items(templateSectionBuilderSchema).min(1).optional(),
  globalStyles: globalStylesSchema.optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const templateSectionReorderSchema = Joi.object({
  templateId: objectIdSchema.required(),
  sections: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        order: Joi.number().integer().min(0).required(),
      })
    )
    .min(1)
    .required(),
});

const addTemplateSectionSchema = Joi.object({
  templateId: objectIdSchema.required(),
  section: templateSectionBuilderSchema.required(),
});

const removeTemplateSectionParamsSchema = Joi.object({
  id: Joi.string().required(),
});

const updatePortfolioSectionSchema = Joi.object({
  portfolioId: objectIdSchema.required(),
  sectionId: Joi.string().required(),
  content: Joi.object().unknown(true).optional(),
  styleOverrides: Joi.object().unknown(true).optional(),
  animation: animationSchema,
}).or('content', 'styleOverrides', 'animation');

const normalizeSkillsInput = (value, helpers) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  if (value === undefined || value === null || value === '') {
    return [];
  }

  return helpers.error('any.invalid');
};

const generatePortfolioSchema = Joi.object({
  name: Joi.string().trim().max(120).empty('').default('Developer').optional(),
  role: Joi.string().trim().max(120).empty('').default('Software Developer').optional(),
  skills: Joi.custom(normalizeSkillsInput).default([]).optional(),
  experience: Joi.string().trim().max(5000).empty('').default('').optional(),
  projects: Joi.alternatives()
    .try(
      Joi.array()
        .items(
          Joi.object({
            title: Joi.string().trim().min(2).max(120).required(),
            description: Joi.string().trim().min(5).max(1200).required(),
            link: Joi.string().trim().uri().allow('').optional(),
            techStack: Joi.array().items(Joi.string().trim().max(80)).max(30).optional(),
          })
        )
        .max(20),
      Joi.string().allow('').empty('').default([])
    )
    .default([])
    .optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  updateProfileSchema,
  adminDeleteUserParamsSchema,
  supportedSectionTypes,
  reorderSectionsSchema,
  addSectionSchema,
  removeSectionParamsSchema,
  createTemplateBuilderSchema,
  updateTemplateBuilderSchema,
  templateSectionReorderSchema,
  addTemplateSectionSchema,
  removeTemplateSectionParamsSchema,
  updatePortfolioSectionSchema,
  generatePortfolioSchema,
};
