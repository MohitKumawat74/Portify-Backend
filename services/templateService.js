const Template = require('../models/Template');
const Theme = require('../models/Theme');
const ApiError = require('../utils/apiError');
const SUPPORTED_TEMPLATE_SECTION_TYPES = ['hero', 'about', 'skills', 'projects', 'contact'];

const normalizeSlug = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const normalizeTemplateConfig = (config = {}) => {
  const sections = Array.isArray(config.sections)
    ? config.sections.map((section) => String(section).trim().toLowerCase()).filter(Boolean)
    : ['hero', 'about', 'skills', 'projects', 'contact'];

  const theme = config.theme || {};
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};

  return {
    sections,
    theme: {
      colors: {
        primary: colors.primary || '#3B82F6',
        secondary: colors.secondary || '#1E40AF',
        background: colors.background || '#FFFFFF',
      },
      fonts: {
        heading: fonts.heading || 'Inter',
        body: fonts.body || 'Inter',
      },
    },
    layout: config.layout || 'minimal',
  };
};

const normalizeAnimationConfig = (animation = {}) => {
  const type = ['fade', 'slide', 'scale'].includes(String(animation.type || ''))
    ? String(animation.type)
    : 'fade';
  const trigger = ['scroll', 'load'].includes(String(animation.trigger || ''))
    ? String(animation.trigger)
    : 'load';

  return {
    type,
    trigger,
    duration: Math.max(0, Number.isFinite(Number(animation.duration)) ? Number(animation.duration) : 0.6),
    delay: Math.max(0, Number.isFinite(Number(animation.delay)) ? Number(animation.delay) : 0),
  };
};

const normalizeTemplateSections = (sections = [], fallbackTypes = []) => {
  const list = Array.isArray(sections) && sections.length
    ? sections
    : (Array.isArray(fallbackTypes)
      ? fallbackTypes.map((type, index) => ({ type, order: index }))
      : []);

  const normalized = [];
  const usedTypes = new Set();

  for (let index = 0; index < list.length; index += 1) {
    const section = list[index] || {};
    const type = String(section.type || '').trim().toLowerCase();
    if (!SUPPORTED_TEMPLATE_SECTION_TYPES.includes(type) || usedTypes.has(type)) {
      continue;
    }

    usedTypes.add(type);
    normalized.push({
      id: String(section.id || `${type}_${Date.now()}_${index + 1}`),
      type,
      defaultContent:
        section.defaultContent && typeof section.defaultContent === 'object' ? section.defaultContent : {},
      defaultStyle:
        section.defaultStyle && typeof section.defaultStyle === 'object' ? section.defaultStyle : {},
      animation: normalizeAnimationConfig(section.animation || {}),
      order: Number.isFinite(section.order) ? section.order : index,
    });
  }

  return normalized.sort((a, b) => a.order - b.order).map((section, index) => ({
    ...section,
    order: index,
  }));
};

const normalizeGlobalStyles = (globalStyles = {}, fallbackConfig = {}) => {
  const fallbackTheme = fallbackConfig.theme || {};
  return {
    colors:
      globalStyles.colors && typeof globalStyles.colors === 'object'
        ? globalStyles.colors
        : {
          primary: fallbackTheme.colors?.primary || '#3B82F6',
          secondary: fallbackTheme.colors?.secondary || '#1E40AF',
          background: fallbackTheme.colors?.background || '#FFFFFF',
        },
    fonts:
      globalStyles.fonts && typeof globalStyles.fonts === 'object'
        ? globalStyles.fonts
        : {
          heading: fallbackTheme.fonts?.heading || 'Inter',
          body: fallbackTheme.fonts?.body || 'Inter',
        },
    spacing:
      globalStyles.spacing && typeof globalStyles.spacing === 'object'
        ? globalStyles.spacing
        : {},
  };
};

const buildTemplateConfigFromBuilderFields = ({ sections = [], globalStyles = {}, config = {} }) => {
  const normalizedConfig = normalizeTemplateConfig(config || {});
  const sectionTypes = (Array.isArray(sections) ? sections : []).map((section) => section.type);

  return {
    ...normalizedConfig,
    sections: sectionTypes.length ? sectionTypes : normalizedConfig.sections,
    theme: {
      colors: {
        ...normalizedConfig.theme.colors,
        ...((globalStyles && globalStyles.colors) || {}),
      },
      fonts: {
        ...normalizedConfig.theme.fonts,
        ...((globalStyles && globalStyles.fonts) || {}),
      },
    },
  };
};

const mapTemplateOutput = (template) => ({
  id: template._id,
  name: template.name,
  slug: template.slug,
  category: template.category,
  isPremium: template.isPremium,
  previewImage: template.previewImage,
  description: template.description,
  sections: Array.isArray(template.sections) ? template.sections : [],
  globalStyles: template.globalStyles || {},
  config: template.config,
  isActive: template.isActive,
  createdAt: template.createdAt,
  updatedAt: template.updatedAt,
});

// ─── Template Operations ─────────────────────────────────────────────────────

const createTemplate = async (data, adminId) => {
  const normalizedConfig = normalizeTemplateConfig(data.config || {});
  const normalizedSections = normalizeTemplateSections(data.sections, normalizedConfig.sections);
  const normalizedGlobalStyles = normalizeGlobalStyles(data.globalStyles, normalizedConfig);

  const payload = {
    ...data,
    slug: normalizeSlug(data.slug || data.name),
    sections: normalizedSections,
    globalStyles: normalizedGlobalStyles,
    config: buildTemplateConfigFromBuilderFields({
      sections: normalizedSections,
      globalStyles: normalizedGlobalStyles,
      config: normalizedConfig,
    }),
    createdBy: adminId,
  };

  if (!payload.slug) {
    throw new ApiError(400, 'Template slug is required.', 'VALIDATION_ERROR');
  }

  const existing = await Template.findOne({ slug: payload.slug });
  if (existing) {
    throw new ApiError(409, 'Template slug already exists.', 'CONFLICT_ERROR');
  }

  const template = await Template.create(payload);
  return mapTemplateOutput(template);
};

const updateTemplate = async (templateId, data) => {
  const template = await Template.findById(templateId);

  if (!template) {
    throw new ApiError(404, 'Template not found.', 'NOT_FOUND');
  }

  if (data.slug || data.name) {
    const nextSlug = normalizeSlug(data.slug || data.name);
    const existing = await Template.findOne({
      slug: nextSlug,
      _id: { $ne: templateId },
    });
    if (existing) {
      throw new ApiError(409, 'Template slug already exists.', 'CONFLICT_ERROR');
    }
    template.slug = nextSlug;
  }

  const nextConfig = data.config ? normalizeTemplateConfig(data.config) : normalizeTemplateConfig(template.config);

  if (data.sections) {
    template.sections = normalizeTemplateSections(data.sections, nextConfig.sections);
  }

  if (data.globalStyles) {
    template.globalStyles = normalizeGlobalStyles(data.globalStyles, nextConfig);
  }

  const simpleFields = ['name', 'description', 'previewImage', 'category', 'isPremium', 'isActive'];
  for (const field of simpleFields) {
    if (data[field] !== undefined) {
      template[field] = data[field];
    }
  }

  template.config = buildTemplateConfigFromBuilderFields({
    sections: template.sections,
    globalStyles: template.globalStyles,
    config: nextConfig,
  });

  await template.save();
  return mapTemplateOutput(template);
};

const deleteTemplate = async (templateId) => {
  const template = await Template.findByIdAndDelete(templateId);

  if (!template) {
    const error = new Error('Template not found.');
    error.statusCode = 404;
    throw error;
  }

  return template;
};

const getAllTemplates = async ({ page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const [templates, total] = await Promise.all([
    Template.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Template.countDocuments({ isActive: true }),
  ]);

  return {
    templates: templates.map(mapTemplateOutput),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getTemplateBySlug = async (templateSlug, userPlan = 'free') => {
  const template = await Template.findOne({
    slug: normalizeSlug(templateSlug),
    isActive: true,
  });

  if (!template) {
    throw new ApiError(404, 'Template not found.', 'NOT_FOUND');
  }

  if (userPlan === 'free' && template.isPremium) {
    throw new ApiError(403, 'Upgrade to Pro to use this template', 'PLAN_LIMIT_EXCEEDED');
  }

  return mapTemplateOutput(template);
};

const toggleTemplate = async (templateId) => {
  const template = await Template.findById(templateId);
  if (!template) {
    const error = new Error('Template not found.');
    error.statusCode = 404;
    throw error;
  }
  template.isActive = !template.isActive;
  await template.save();
  return mapTemplateOutput(template);
};

const reorderTemplateSections = async ({ templateId, sections = [] }) => {
  const template = await Template.findById(templateId);
  if (!template) {
    throw new ApiError(404, 'Template not found.', 'NOT_FOUND');
  }

  const orderMap = new Map((sections || []).map((item) => [String(item.id), Number(item.order)]));

  template.sections = normalizeTemplateSections(
    (template.sections || []).map((section) => {
      const internalId = String(section._id || '');
      const publicId = String(section.id || '');
      const key = orderMap.has(publicId) ? publicId : internalId;
      if (!orderMap.has(key)) {
        return section;
      }

      return {
        ...section.toObject(),
        order: orderMap.get(key),
      };
    })
  );

  template.config = buildTemplateConfigFromBuilderFields({
    sections: template.sections,
    globalStyles: template.globalStyles,
    config: template.config,
  });

  await template.save();
  return mapTemplateOutput(template);
};

const addTemplateSection = async ({ templateId, section = {} }) => {
  const template = await Template.findById(templateId);
  if (!template) {
    throw new ApiError(404, 'Template not found.', 'NOT_FOUND');
  }

  const nextSections = normalizeTemplateSections([
    ...(template.sections || []).map((entry) => entry.toObject()),
    {
      ...section,
      order: Number.isFinite(section.order) ? section.order : (template.sections || []).length,
    },
  ]);

  template.sections = nextSections;
  template.config = buildTemplateConfigFromBuilderFields({
    sections: template.sections,
    globalStyles: template.globalStyles,
    config: template.config,
  });

  await template.save();
  return mapTemplateOutput(template);
};

const removeTemplateSection = async ({ sectionId }) => {
  const template = await Template.findOne({
    $or: [{ 'sections._id': sectionId }, { 'sections.id': sectionId }],
  });

  if (!template) {
    throw new ApiError(404, 'Template section not found.', 'NOT_FOUND');
  }

  template.sections = normalizeTemplateSections(
    (template.sections || [])
      .map((entry) => entry.toObject())
      .filter((section) => {
        const internalId = String(section._id || '');
        const publicId = String(section.id || '');
        return internalId !== String(sectionId) && publicId !== String(sectionId);
      })
  );

  template.config = buildTemplateConfigFromBuilderFields({
    sections: template.sections,
    globalStyles: template.globalStyles,
    config: template.config,
  });

  await template.save();
  return mapTemplateOutput(template);
};

const resolveTemplateForPlan = async ({ slug, userPlan = 'free' }) => {
  const template = await Template.findOne({ slug: normalizeSlug(slug), isActive: true });
  if (!template) {
    throw new ApiError(404, 'Template not found.', 'NOT_FOUND');
  }

  if (userPlan === 'free' && template.isPremium) {
    throw new ApiError(403, 'Upgrade to Pro to use this template', 'PLAN_LIMIT_EXCEEDED');
  }

  return template;
};

// ─── Theme Operations ─────────────────────────────────────────────────────────

const createTheme = async (data, adminId) => {
  return Theme.create({ ...data, createdBy: adminId });
};

const updateTheme = async (themeId, data) => {
  const theme = await Theme.findByIdAndUpdate(themeId, data, {
    new: true,
    runValidators: true,
  });

  if (!theme) {
    const error = new Error('Theme not found.');
    error.statusCode = 404;
    throw error;
  }

  return theme;
};

const deleteTheme = async (themeId) => {
  const theme = await Theme.findByIdAndDelete(themeId);

  if (!theme) {
    const error = new Error('Theme not found.');
    error.statusCode = 404;
    throw error;
  }

  return theme;
};

const getAllThemes = async () => {
  return Theme.find({ isActive: true }).sort({ createdAt: -1 });
};

module.exports = {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getAllTemplates,
  getTemplateBySlug,
  toggleTemplate,
  reorderTemplateSections,
  addTemplateSection,
  removeTemplateSection,
  resolveTemplateForPlan,
  normalizeTemplateConfig,
  normalizeTemplateSections,
  normalizeAnimationConfig,
  normalizeGlobalStyles,
  createTheme,
  updateTheme,
  deleteTheme,
  getAllThemes,
};
