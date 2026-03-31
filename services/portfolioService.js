const Portfolio = require('../models/Portfolio');
const User = require('../models/User');
const Template = require('../models/Template');
const ApiError = require('../utils/apiError');
const { resolveUserPlan } = require('../config/planLimits');
const {
  resolveTemplateForPlan,
  normalizeTemplateConfig,
  normalizeTemplateSections,
  normalizeAnimationConfig,
} = require('./templateService');
const { isValidObjectId } = require('mongoose');
const { generateUniqueSlug } = require('../utils/slugGenerator');
const { recordView } = require('./analyticsService');
const { getUserPlanContext } = require('./planService');
const { getJsonCache, setJsonCache, deleteCacheKey } = require('./cacheService');

const SUPPORTED_SECTION_TYPES = ['hero', 'about', 'skills', 'projects', 'contact'];
const REQUIRED_RENDER_SECTIONS = ['hero', 'about', 'projects'];
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])?$/;
const PORTFOLIO_CACHE_TTL_SECONDS = Math.min(
  600,
  Math.max(300, Number(process.env.PORTFOLIO_RENDER_CACHE_TTL_SEC || 600))
);
const PORTFOLIO_CACHE_KEY_PREFIX = 'portfolio:';

const DEFAULT_FALLBACK_SECTION_CONTENT = {
  hero: {
    heading: 'Welcome to my portfolio',
    subheading: 'Content is being updated.',
    ctaText: 'Get in touch',
  },
  about: {
    title: 'About me',
    summary: 'This section is being prepared.',
  },
  skills: {
    title: 'Skills',
    items: [],
  },
  projects: {
    title: 'Projects',
    items: [],
  },
  contact: {
    title: 'Contact',
    email: '',
    links: [],
  },
};

const normalizeUsername = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
};

const ensureValidUsername = (value) => {
  const normalized = normalizeUsername(value);
  if (!normalized || !USERNAME_PATTERN.test(normalized)) {
    throw new ApiError(400, 'Invalid username format.', 'VALIDATION_ERROR');
  }
  return normalized;
};

const buildPortfolioCacheKey = (username) => {
  return `${PORTFOLIO_CACHE_KEY_PREFIX}${normalizeUsername(username)}`;
};

const getCachedPortfolioRender = async (username) => {
  const cacheKey = buildPortfolioCacheKey(username);
  return getJsonCache(cacheKey);
};

const setCachedPortfolioRender = async (username, payload) => {
  const cacheKey = buildPortfolioCacheKey(username);
  await setJsonCache(cacheKey, payload, PORTFOLIO_CACHE_TTL_SECONDS);
};

const invalidateCachedPortfolioRender = async (username) => {
  if (!username) {
    return;
  }

  const cacheKey = buildPortfolioCacheKey(username);
  await deleteCacheKey(cacheKey);
};

const normalizeSection = (section = {}, index = 0) => {
  const type = String(section.type || '').trim().toLowerCase();
  if (!SUPPORTED_SECTION_TYPES.includes(type)) {
    throw new ApiError(400, `Unsupported section type: ${type || 'unknown'}.`, 'VALIDATION_ERROR');
  }

  const content = section.content;
  if (!content || typeof content !== 'object') {
    throw new ApiError(400, `Section content is required for type: ${type}.`, 'VALIDATION_ERROR');
  }

  return {
    id: String(section.id || `${type}_${Date.now()}_${index + 1}`),
    type,
    title: section.title || '',
    order: Number.isFinite(section.order) ? section.order : index,
    isVisible: section.isVisible === undefined ? true : Boolean(section.isVisible),
    content,
    styleOverrides:
      section.styleOverrides && typeof section.styleOverrides === 'object' ? section.styleOverrides : {},
    animation: normalizeAnimationConfig(section.animation || {}),
  };
};

const sortSections = (sections = []) => {
  return [...sections].sort((a, b) => {
    const orderA = Number.isFinite(a.order) ? a.order : 0;
    const orderB = Number.isFinite(b.order) ? b.order : 0;
    return orderA - orderB;
  });
};

const buildFallbackSection = (type, order) => {
  return {
    id: `fallback_${type}`,
    type,
    title: String(type).charAt(0).toUpperCase() + String(type).slice(1),
    order,
    isVisible: true,
    content: DEFAULT_FALLBACK_SECTION_CONTENT[type] || { title: 'Section', body: '' },
    styleOverrides: {},
    animation: normalizeAnimationConfig({}),
  };
};

const ensureUniquePortfolioUsername = async (candidateUsername, excludePortfolioId = null) => {
  const normalized = ensureValidUsername(candidateUsername);
  let candidate = normalized;
  let suffix = 1;

  while (suffix < 10000) {
    const existing = await Portfolio.findOne({
      username: candidate,
      ...(excludePortfolioId ? { _id: { $ne: excludePortfolioId } } : {}),
    })
      .select('_id')
      .lean();

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    const suffixToken = `-${suffix}`;
    const base = normalized.slice(0, Math.max(1, 32 - suffixToken.length));
    candidate = `${base}${suffixToken}`;
  }

  throw new ApiError(409, 'Unable to allocate unique username.', 'CONFLICT_ERROR');
};

const enforceSectionLimit = async (userId, nextSectionCount) => {
  const user = await User.findById(userId).select('plan subscription');
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }

  const { limits } = getUserPlanContext(user);
  if (nextSectionCount > limits.maxSections) {
    throw new ApiError(403, 'Section limit exceeded. Upgrade to Pro plan.', 'PLAN_LIMIT_EXCEEDED');
  }
};

const mergePortfolioSections = (templateSections = [], portfolioSections = [], customizations = {}) => {
  const normalizedPortfolioSections = sortSections(portfolioSections || []);
  const byType = new Map();
  const warnings = [];

  const normalizedTemplateSections = normalizeTemplateSections(templateSections || []);
  const templateByType = new Map(
    normalizedTemplateSections.map((section) => [section.type, section])
  );

  for (const section of normalizedPortfolioSections) {
    const type = String(section.type || '').toLowerCase();
    const content = section.content;

    if (!SUPPORTED_SECTION_TYPES.includes(type)) {
      warnings.push(`Unsupported section type ignored: ${type || 'unknown'}`);
      continue;
    }

    if (!content || typeof content !== 'object') {
      warnings.push(`Invalid content for section: ${type || 'unknown'}`);
      continue;
    }

    const isEmptyObject = !Array.isArray(content) && Object.keys(content).length === 0;
    const isEmptyArray = Array.isArray(content) && content.length === 0;
    if (isEmptyObject || isEmptyArray) {
      warnings.push(`Empty content detected for section: ${type}`);
    }

    if (!byType.has(type)) {
      byType.set(type, section);
    }
  }

  const sectionVisibility =
    customizations.sectionVisibility && typeof customizations.sectionVisibility === 'object'
      ? customizations.sectionVisibility
      : {};

  const merged = [];
  const missingRequiredSections = [];
  const fallbackApplied = [];
  let runningOrder = 0;

  const requiredOrder = [];
  const uniqueTypeSet = new Set();
  for (const sectionType of [
    ...normalizedTemplateSections.map((section) => section.type),
    ...REQUIRED_RENDER_SECTIONS,
  ]) {
    if (!uniqueTypeSet.has(sectionType)) {
      uniqueTypeSet.add(sectionType);
      requiredOrder.push(sectionType);
    }
  }

  for (const sectionType of requiredOrder) {
    const templateSection = templateByType.get(sectionType);
    const section = byType.get(sectionType)
      ? {
        ...templateSection,
        ...byType.get(sectionType),
        content: {
          ...((templateSection && templateSection.defaultContent) || {}),
          ...(byType.get(sectionType).content || {}),
        },
        styleOverrides: {
          ...((templateSection && templateSection.defaultStyle) || {}),
          ...((byType.get(sectionType).styleOverrides || {})),
        },
        animation: {
          ...(templateSection?.animation || normalizeAnimationConfig({})),
          ...normalizeAnimationConfig(byType.get(sectionType).animation || {}),
        },
      }
      : {
        ...(templateSection
          ? {
            id: templateSection.id,
            type: templateSection.type,
            title: String(templateSection.type).charAt(0).toUpperCase() + String(templateSection.type).slice(1),
            content: templateSection.defaultContent || {},
            styleOverrides: templateSection.defaultStyle || {},
            animation: templateSection.animation || normalizeAnimationConfig({}),
            isVisible: true,
          }
          : buildFallbackSection(sectionType, runningOrder)),
      };

    if (!byType.get(sectionType)) {
      fallbackApplied.push(sectionType);
      if (REQUIRED_RENDER_SECTIONS.includes(sectionType)) {
        missingRequiredSections.push(sectionType);
      }
    }

    const isVisibleByCustomization = sectionVisibility[sectionType];
    merged.push({
      ...section,
      order: runningOrder++,
      isVisible:
        isVisibleByCustomization === undefined
          ? section.isVisible !== false
          : Boolean(isVisibleByCustomization),
    });
  }

  for (const section of normalizedPortfolioSections) {
    if (!requiredOrder.includes(section.type) && SUPPORTED_SECTION_TYPES.includes(section.type)) {
      merged.push({
        ...section,
        order: runningOrder++,
      });
    }
  }

  return {
    sections: merged,
    missingRequiredSections,
    fallbackApplied,
    warnings,
  };
};

const syncUserPortfolioCount = async (userId) => {
  const count = await Portfolio.countDocuments({ userId });
  await User.findByIdAndUpdate(userId, { portfolioCount: count });
};

const sanitizeCustomizationInput = (customizations = {}) => {
  const colors = customizations.colors && typeof customizations.colors === 'object' ? customizations.colors : {};
  const fonts = customizations.fonts && typeof customizations.fonts === 'object' ? customizations.fonts : {};
  const sectionVisibility =
    customizations.sectionVisibility && typeof customizations.sectionVisibility === 'object'
      ? customizations.sectionVisibility
      : {};

  return {
    colors,
    fonts,
    layout: customizations.layout || null,
    sectionVisibility,
  };
};

const buildRenderConfig = (portfolio, template) => {
  const baseConfig = normalizeTemplateConfig(template?.config || {});
  const custom = sanitizeCustomizationInput(portfolio.customizations || {});
  const diagnosticsWarnings = [];
  const templateSections = normalizeTemplateSections(
    Array.isArray(template?.sections) && template.sections.length
      ? template.sections
      : (baseConfig.sections || []).map((type, index) => ({ type, order: index }))
  );

  const mergeResult = mergePortfolioSections(templateSections, portfolio.sections, custom);
  const finalSections = mergeResult.sections;
  const finalMissingSections = mergeResult.missingRequiredSections;
  const fallbackApplied = mergeResult.fallbackApplied;
  diagnosticsWarnings.push(...mergeResult.warnings);

  if (!template?.slug && !portfolio.templateSlug) {
    diagnosticsWarnings.push('No template slug found; using normalized default config.');
  }

  const sectionVisibility = {};
  for (const section of baseConfig.sections) {
    sectionVisibility[section] =
      custom.sectionVisibility[section] === undefined ? true : Boolean(custom.sectionVisibility[section]);
  }

  return {
    template: {
      name: template?.name || null,
      slug: template?.slug || portfolio.templateSlug || null,
      category: template?.category || null,
      isPremium: Boolean(template?.isPremium),
      previewImage: template?.previewImage || '',
      sections: templateSections,
      globalStyles: template?.globalStyles || {},
    },
    config: {
      sections: templateSections.map((section) => section.type),
      layout: custom.layout || baseConfig.layout,
      theme: {
        colors: {
          ...baseConfig.theme.colors,
          ...(custom.colors || {}),
        },
        fonts: {
          ...baseConfig.theme.fonts,
          ...(custom.fonts || {}),
        },
      },
      sectionVisibility,
    },
    portfolioData: {
      title: portfolio.title,
      bio: portfolio.bio,
      sections: finalSections,
      content: portfolio.content,
      slug: portfolio.slug,
      metaTitle: portfolio.metaTitle,
      metaDescription: portfolio.metaDescription,
      isPublished: portfolio.isPublished,
    },
    diagnostics: {
      missingSections: finalMissingSections,
      fallbackApplied,
      warnings: diagnosticsWarnings,
    },
  };
};

const toPublicRenderResponse = (portfolio, renderConfig) => {
  return {
    templateSlug: renderConfig.template.slug,
    template: renderConfig.template,
    sections: renderConfig.portfolioData.sections,
    customizations: {
      colors: renderConfig.config.theme.colors,
      fonts: renderConfig.config.theme.fonts,
      layout: renderConfig.config.layout,
      sectionVisibility: renderConfig.config.sectionVisibility,
    },
    metadata: {
      username: portfolio.username,
      isPublished: Boolean(portfolio.isPublished),
      updatedAt: portfolio.updatedAt,
    },
    diagnostics: renderConfig.diagnostics,
  };
};

const shouldDowngradePremiumTemplate = () => {
  return String(process.env.PORTFOLIO_PREMIUM_DOWNGRADE || 'false').toLowerCase() === 'true';
};

const isPremiumTemplateBlocked = (template, ownerPlan) => {
  return Boolean(template && template.isPremium && ownerPlan === 'free');
};

const resolveTemplateFromPayload = async ({ user, data = {}, existingPortfolio = null }) => {
  let targetTemplateSlug = data.templateSlug || existingPortfolio?.templateSlug || null;

  if (!targetTemplateSlug && data.templateId !== undefined && data.templateId !== null) {
    const incomingTemplateId = String(data.templateId).trim();
    if (incomingTemplateId) {
      if (isValidObjectId(incomingTemplateId)) {
        const templateById = await Template.findById(incomingTemplateId).select('slug');
        targetTemplateSlug = templateById ? templateById.slug : null;
      } else {
        targetTemplateSlug = incomingTemplateId.toLowerCase();
      }
    }
  }

  if (!targetTemplateSlug) {
    return null;
  }

  const userPlan = resolveUserPlan(user);
  const template = await resolveTemplateForPlan({ slug: targetTemplateSlug, userPlan });
  return template;
};

const createPortfolio = async (userId, data) => {
  const user = await User.findById(userId).select('plan subscription name email');
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }

  const template = await resolveTemplateFromPayload({ user, data });

  const slug = await generateUniqueSlug(data.title);
  const portfolioPayload = {
    ...data,
    userId,
    username: await ensureUniquePortfolioUsername(
      data.username
      ? ensureValidUsername(data.username)
      : ensureValidUsername(user.name || (user.email ? user.email.split('@')[0] : `user-${userId}`))
    ),
    slug,
    customizations: sanitizeCustomizationInput(data.customizations || {}),
  };

  if (Array.isArray(data.sections)) {
    portfolioPayload.sections = data.sections.map((section, index) => normalizeSection(section, index));
    await enforceSectionLimit(userId, portfolioPayload.sections.length);
  }

  if (template) {
    portfolioPayload.templateId = template._id;
    portfolioPayload.templateSlug = template.slug;
  }

  const portfolio = await Portfolio.create(portfolioPayload);
  await syncUserPortfolioCount(userId);
  await invalidateCachedPortfolioRender(portfolio.username);

  return portfolio;
};

const updatePortfolio = async (portfolioId, userId, data) => {
  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });

  if (!portfolio) {
    const error = new Error('Portfolio not found or you do not have permission.');
    error.statusCode = 404;
    throw error;
  }

  const user = await User.findById(userId).select('plan subscription name email');
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }

  const template = await resolveTemplateFromPayload({ user, data, existingPortfolio: portfolio });

  // Regenerate slug only if title changed
  if (data.title && data.title !== portfolio.title) {
    data.slug = await generateUniqueSlug(data.title);
  }

  if (data.customizations) {
    data.customizations = sanitizeCustomizationInput(data.customizations);
  }

  if (data.username !== undefined) {
    data.username = await ensureUniquePortfolioUsername(data.username, portfolio._id);
  }

  if (Array.isArray(data.sections)) {
    data.sections = data.sections.map((section, index) => normalizeSection(section, index));
    await enforceSectionLimit(userId, data.sections.length);
  }

  if (template) {
    data.templateId = template._id;
    data.templateSlug = template.slug;
  }

  Object.assign(portfolio, data);
  await portfolio.save();
  await invalidateCachedPortfolioRender(portfolio.username);
  return portfolio;
};

const reorderPortfolioSections = async (userId, data = {}) => {
  const { portfolioId, sections = [] } = data;
  if (!portfolioId) {
    throw new ApiError(400, 'portfolioId is required.', 'VALIDATION_ERROR');
  }

  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
  if (!portfolio) {
    throw new ApiError(404, 'Portfolio not found or access denied.', 'NOT_FOUND');
  }

  const incomingOrderMap = new Map(sections.map((item) => [String(item.id), Number(item.order)]));

  portfolio.sections = portfolio.sections.map((section) => {
    const keyCandidates = [String(section.id || ''), String(section._id || '')].filter(Boolean);
    const matchedKey = keyCandidates.find((candidate) => incomingOrderMap.has(candidate));
    if (!matchedKey) {
      return section;
    }
    section.order = incomingOrderMap.get(matchedKey);
    return section;
  });

  portfolio.sections = sortSections(portfolio.sections).map((section, index) => {
    section.order = index;
    return section;
  });

  await portfolio.save();
  await invalidateCachedPortfolioRender(portfolio.username);
  return portfolio;
};

const addPortfolioSection = async (userId, data = {}) => {
  const { portfolioId, section } = data;

  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
  if (!portfolio) {
    throw new ApiError(404, 'Portfolio not found or access denied.', 'NOT_FOUND');
  }

  const normalizedSection = normalizeSection(section, portfolio.sections.length);
  await enforceSectionLimit(userId, (portfolio.sections || []).length + 1);

  const currentSections = sortSections(portfolio.sections || []);
  const hasTypeAlready = currentSections.some((entry) => entry.type === normalizedSection.type);
  if (hasTypeAlready) {
    throw new ApiError(409, `Section '${normalizedSection.type}' already exists.`, 'CONFLICT_ERROR');
  }

  normalizedSection.order = Number.isFinite(normalizedSection.order)
    ? normalizedSection.order
    : currentSections.length;

  currentSections.push(normalizedSection);
  portfolio.sections = sortSections(currentSections).map((entry, index) => ({
    ...entry,
    order: index,
  }));

  await portfolio.save();
  await invalidateCachedPortfolioRender(portfolio.username);
  return portfolio;
};

const removePortfolioSection = async (userId, sectionId) => {
  const portfolio = await Portfolio.findOne({
    userId,
    $or: [{ 'sections._id': sectionId }, { 'sections.id': sectionId }],
  });
  if (!portfolio) {
    throw new ApiError(404, 'Section not found or access denied.', 'NOT_FOUND');
  }

  portfolio.sections = (portfolio.sections || []).filter((section) => {
    const sectionInternalId = String(section._id || '');
    const sectionPublicId = String(section.id || '');
    return sectionInternalId !== String(sectionId) && sectionPublicId !== String(sectionId);
  });
  portfolio.sections = sortSections(portfolio.sections).map((section, index) => {
    section.order = index;
    return section;
  });

  await portfolio.save();
  await invalidateCachedPortfolioRender(portfolio.username);
  return portfolio;
};

const deletePortfolio = async (portfolioId, userId) => {
  const portfolio = await Portfolio.findOneAndDelete({ _id: portfolioId, userId });

  if (!portfolio) {
    const error = new Error('Portfolio not found or you do not have permission.');
    error.statusCode = 404;
    throw error;
  }

  await syncUserPortfolioCount(userId);
  await invalidateCachedPortfolioRender(portfolio.username);
  return portfolio;
};

const getPublishedPortfolioByUsername = async (username, visitorIp) => {
  const normalizedUsername = ensureValidUsername(username);

  const cached = await getCachedPortfolioRender(normalizedUsername);
  if (cached) {
    return cached;
  }

  const portfolio = await Portfolio.findOne({
    username: normalizedUsername,
    isPublished: true,
  })
    .sort({ updatedAt: -1 })
    .select(
      'username userId templateId templateSlug title bio sections customizations content slug metaTitle metaDescription isPublished createdAt updatedAt'
    )
    .populate('userId', 'name avatar plan subscription')
    .populate('templateId', 'name slug category isPremium previewImage config sections globalStyles isActive');

  if (!portfolio) {
    throw new ApiError(404, 'Portfolio not found.', 'NOT_FOUND');
  }

  let template = portfolio.templateId;
  if (!template && portfolio.templateSlug) {
    template = await Template.findOne({
      slug: portfolio.templateSlug,
      isActive: true,
    }).select('name slug category isPremium previewImage config sections globalStyles');
  }

  const ownerPlan = resolveUserPlan(portfolio.userId || {});
  if (isPremiumTemplateBlocked(template, ownerPlan)) {
    if (shouldDowngradePremiumTemplate()) {
      template = {
        name: 'Default Template',
        slug: 'default-template',
        category: template.category || 'single-column',
        isPremium: false,
        previewImage: '',
        config: normalizeTemplateConfig({}),
      };
    } else {
      throw new ApiError(403, 'Upgrade to Pro to use this template', 'PLAN_LIMIT_EXCEEDED');
    }
  }

  recordView(portfolio._id, portfolio.slug, visitorIp).catch(() => {});

  const renderConfig = buildRenderConfig(portfolio, template);
  if (template && template.slug === 'default-template') {
    renderConfig.diagnostics.warnings.push('Premium template downgraded to default for free plan.');
  }
  const response = toPublicRenderResponse(portfolio, renderConfig);
  await setCachedPortfolioRender(normalizedUsername, response);

  return response;
};

const getPortfolioBySlug = async (slug, visitorIp) => {
  const portfolio = await Portfolio.findOne({ slug, isPublished: true })
    .populate('userId', 'name avatar')
    .populate('templateId', 'name slug category isPremium previewImage config sections globalStyles');

  if (!portfolio) {
    const error = new Error('Portfolio not found.');
    error.statusCode = 404;
    throw error;
  }

  // Delegate view + unique-visitor tracking to analytics service (fire-and-forget)
  recordView(portfolio._id, slug, visitorIp).catch(() => {});

  const template = portfolio.templateId || (portfolio.templateSlug
    ? await Template.findOne({ slug: portfolio.templateSlug }).select(
      'name slug category isPremium previewImage config sections globalStyles'
    )
    : null);

  const renderConfig = buildRenderConfig(portfolio, template);

  const result = portfolio.toObject();
  result.renderConfig = renderConfig;

  return result;
};

const getUserPortfolios = async (userId, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const [portfolios, total] = await Promise.all([
    Portfolio.find({ userId })
      .populate('templateId', 'name previewImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Portfolio.countDocuments({ userId }),
  ]);
  return { portfolios, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getPortfolioBuilderData = async (userId, { portfolioId = null } = {}) => {
  const query = portfolioId ? { _id: portfolioId, userId } : { userId };
  const portfolio = await Portfolio.findOne(query)
    .sort({ updatedAt: -1 })
    .populate('templateId', 'name slug category isPremium previewImage config sections globalStyles');

  if (!portfolio) {
    throw new ApiError(404, 'Portfolio not found for builder.', 'NOT_FOUND');
  }

  const template = portfolio.templateId || (portfolio.templateSlug
    ? await Template.findOne({ slug: portfolio.templateSlug, isActive: true }).select(
      'name slug category isPremium previewImage config sections globalStyles'
    )
    : null);

  const renderConfig = buildRenderConfig(portfolio, template);

  return {
    portfolioId: portfolio._id,
    templateSlug: renderConfig.template.slug,
    template: renderConfig.template,
    sections: renderConfig.portfolioData.sections,
    customizations: {
      colors: renderConfig.config.theme.colors,
      fonts: renderConfig.config.theme.fonts,
      layout: renderConfig.config.layout,
      sectionVisibility: renderConfig.config.sectionVisibility,
    },
    metadata: {
      username: portfolio.username,
      isPublished: Boolean(portfolio.isPublished),
      updatedAt: portfolio.updatedAt,
    },
    diagnostics: renderConfig.diagnostics,
  };
};

const updatePortfolioSectionContent = async (userId, data = {}) => {
  const { portfolioId, sectionId, content, styleOverrides, animation } = data;

  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
  if (!portfolio) {
    throw new ApiError(404, 'Portfolio not found or access denied.', 'NOT_FOUND');
  }

  const target = (portfolio.sections || []).find((section) => {
    const internalId = String(section._id || '');
    const publicId = String(section.id || '');
    return internalId === String(sectionId) || publicId === String(sectionId);
  });

  if (!target) {
    throw new ApiError(404, 'Section not found.', 'NOT_FOUND');
  }

  if (content && typeof content === 'object') {
    target.content = content;
  }

  if (styleOverrides && typeof styleOverrides === 'object') {
    target.styleOverrides = {
      ...(target.styleOverrides || {}),
      ...styleOverrides,
    };
  }

  if (animation && typeof animation === 'object') {
    target.animation = {
      ...(target.animation || {}),
      ...normalizeAnimationConfig(animation),
    };
  }

  await portfolio.save();
  await invalidateCachedPortfolioRender(portfolio.username);

  return portfolio;
};

const getPortfolioById = async (portfolioId, userId, isAdmin) => {
  const query = isAdmin ? { _id: portfolioId } : { _id: portfolioId, userId };
  const portfolio = await Portfolio.findOne(query)
    .populate('userId', 'name avatar')
    .populate('templateId', 'name slug category isPremium previewImage config sections globalStyles');
  if (!portfolio) {
    const error = new Error('Portfolio not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  const template = portfolio.templateId || (portfolio.templateSlug
    ? await Template.findOne({ slug: portfolio.templateSlug }).select(
      'name slug category isPremium previewImage config sections globalStyles'
    )
    : null);

  const renderConfig = buildRenderConfig(portfolio, template);

  const result = portfolio.toObject();
  result.renderConfig = renderConfig;

  return result;
};

const savePortfolioCustomization = async (userId, data = {}) => {
  const { portfolioId, colors, fonts, layout, sectionVisibility } = data;
  if (!portfolioId) {
    throw new ApiError(400, 'portfolioId is required.', 'VALIDATION_ERROR');
  }

  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
  if (!portfolio) {
    throw new ApiError(404, 'Portfolio not found or access denied.', 'NOT_FOUND');
  }

  const incoming = sanitizeCustomizationInput({
    colors,
    fonts,
    layout,
    sectionVisibility,
  });

  portfolio.customizations = {
    ...(portfolio.customizations || {}),
    colors: {
      ...((portfolio.customizations && portfolio.customizations.colors) || {}),
      ...incoming.colors,
    },
    fonts: {
      ...((portfolio.customizations && portfolio.customizations.fonts) || {}),
      ...incoming.fonts,
    },
    layout: incoming.layout || (portfolio.customizations && portfolio.customizations.layout) || null,
    sectionVisibility: {
      ...((portfolio.customizations && portfolio.customizations.sectionVisibility) || {}),
      ...incoming.sectionVisibility,
    },
  };

  await portfolio.save();
  await invalidateCachedPortfolioRender(portfolio.username);

  const template = portfolio.templateId
    ? await Template.findById(portfolio.templateId).select('name slug category isPremium previewImage config sections globalStyles')
    : portfolio.templateSlug
      ? await Template.findOne({ slug: portfolio.templateSlug }).select(
        'name slug category isPremium previewImage config sections globalStyles'
      )
      : null;

  const result = portfolio.toObject();
  result.renderConfig = buildRenderConfig(portfolio, template);
  return result;
};

const publishPortfolio = async (portfolioId, userId) => {
  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
  if (!portfolio) {
    const error = new Error('Portfolio not found or access denied.');
    error.statusCode = 404;
    throw error;
  }
  portfolio.isPublished = true;
  await portfolio.save();
  await invalidateCachedPortfolioRender(portfolio.username);
  return portfolio;
};

const unpublishPortfolio = async (portfolioId, userId) => {
  const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
  if (!portfolio) {
    const error = new Error('Portfolio not found or access denied.');
    error.statusCode = 404;
    throw error;
  }
  portfolio.isPublished = false;
  await portfolio.save();
  await invalidateCachedPortfolioRender(portfolio.username);
  return portfolio;
};

module.exports = {
  SUPPORTED_SECTION_TYPES,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioBySlug,
  getPublishedPortfolioByUsername,
  getUserPortfolios,
  getPortfolioBuilderData,
  getPortfolioById,
  savePortfolioCustomization,
  updatePortfolioSectionContent,
  reorderPortfolioSections,
  addPortfolioSection,
  removePortfolioSection,
  publishPortfolio,
  unpublishPortfolio,
  __testables: {
    mergePortfolioSections,
    buildRenderConfig,
    toPublicRenderResponse,
    normalizeUsername,
    ensureValidUsername,
    buildPortfolioCacheKey,
    isPremiumTemplateBlocked,
  },
};
