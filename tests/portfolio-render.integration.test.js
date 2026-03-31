const test = require('node:test');
const assert = require('node:assert/strict');

const portfolioService = require('../services/portfolioService');
const portfolioController = require('../controllers/portfolioController');
const cacheService = require('../services/cacheService');
const Portfolio = require('../models/Portfolio');
const User = require('../models/User');

const { __testables } = portfolioService;

test('injects fallback for required missing sections with diagnostics', () => {
  const template = {
    name: 'Minimal',
    slug: 'minimal',
    isPremium: false,
    config: {
      sections: ['hero', 'about', 'projects'],
      layout: 'minimal',
      theme: {
        colors: { primary: '#111111', secondary: '#222222', background: '#ffffff' },
        fonts: { heading: 'Inter', body: 'Inter' },
      },
    },
  };

  const portfolio = {
    username: 'john-doe',
    templateSlug: 'minimal',
    title: 'John Doe',
    bio: 'Builder',
    sections: [
      { id: 'hero_1', type: 'hero', order: 0, content: { heading: 'Hi' } },
      { id: 'skills_1', type: 'skills', order: 1, content: {} },
    ],
    customizations: {},
    content: {},
    slug: 'john-doe',
    metaTitle: '',
    metaDescription: '',
    isPublished: true,
    updatedAt: new Date('2026-03-30T00:00:00.000Z'),
  };

  const renderConfig = __testables.buildRenderConfig(portfolio, template);
  const payload = __testables.toPublicRenderResponse(portfolio, renderConfig);

  assert.ok(payload.sections.some((section) => section.type === 'about'));
  assert.ok(payload.sections.some((section) => section.type === 'projects'));
  assert.deepEqual(payload.diagnostics.missingSections.sort(), ['about', 'projects']);
  assert.deepEqual(payload.diagnostics.fallbackApplied.sort(), ['about', 'projects']);
  assert.ok(payload.diagnostics.warnings.some((warning) => warning.includes('Empty content detected')));
});

test('premium template restriction helper returns true for free owner', () => {
  const blocked = __testables.isPremiumTemplateBlocked({ isPremium: true }, 'free');
  const allowed = __testables.isPremiumTemplateBlocked({ isPremium: true }, 'pro');

  assert.equal(blocked, true);
  assert.equal(allowed, false);
});

test('cache set/get/delete invalidates successfully', async () => {
  const key = __testables.buildPortfolioCacheKey('john-doe');
  const payload = { hello: 'world' };

  await cacheService.setJsonCache(key, payload, 300);
  const cached = await cacheService.getJsonCache(key);
  assert.deepEqual(cached, payload);

  await cacheService.deleteCacheKey(key);
  const afterDelete = await cacheService.getJsonCache(key);
  assert.equal(afterDelete, null);
});

test('portfolio update invalidates username cache key', async () => {
  const key = __testables.buildPortfolioCacheKey('john-doe');
  await cacheService.setJsonCache(key, { stale: true }, 300);

  const originalPortfolioFindOne = Portfolio.findOne;
  const originalUserFindById = User.findById;

  try {
    const mockPortfolioDoc = {
      _id: 'portfolio-id-1',
      userId: 'user-id-1',
      username: 'john-doe',
      title: 'Original Title',
      templateSlug: null,
      save: async () => {},
    };

    Portfolio.findOne = async () => mockPortfolioDoc;
    User.findById = () => ({
      select: async () => ({
        _id: 'user-id-1',
        plan: 'free',
        subscription: { status: 'active' },
        name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    await portfolioService.updatePortfolio('portfolio-id-1', 'user-id-1', { bio: 'Updated bio' });

    const afterUpdate = await cacheService.getJsonCache(key);
    assert.equal(afterUpdate, null);
  } finally {
    Portfolio.findOne = originalPortfolioFindOne;
    User.findById = originalUserFindById;
  }
});

test('username route bypasses to next() for ObjectId-like params', async () => {
  let nextCalled = false;
  const req = {
    params: { username: '65f0f6f6f6f6f6f6f6f6f6f6' },
    ip: '127.0.0.1',
    headers: {},
  };

  const res = {
    status() {
      throw new Error('status should not be called for ObjectId params');
    },
  };

  const next = () => {
    nextCalled = true;
  };

  await portfolioController.getPublicByUsername(req, res, next);
  assert.equal(nextCalled, true);
});

test('template animation and style defaults merge with user overrides', () => {
  const template = {
    name: 'Builder Template',
    slug: 'builder-template',
    isPremium: false,
    sections: [
      {
        id: 'hero_tpl',
        type: 'hero',
        defaultContent: { heading: 'Default Hero' },
        defaultStyle: { align: 'center' },
        animation: { type: 'fade', trigger: 'load', duration: 0.8, delay: 0 },
        order: 0,
      },
    ],
    globalStyles: {
      colors: { primary: '#000000' },
      fonts: { heading: 'Inter', body: 'Inter' },
      spacing: { sectionGap: 24 },
    },
    config: {
      sections: ['hero'],
      theme: {
        colors: { primary: '#111111', secondary: '#222222', background: '#ffffff' },
        fonts: { heading: 'Inter', body: 'Inter' },
      },
      layout: 'minimal',
    },
  };

  const portfolio = {
    username: 'jane-doe',
    templateSlug: 'builder-template',
    title: 'Jane Doe',
    bio: 'Engineer',
    sections: [
      {
        id: 'hero_user',
        type: 'hero',
        order: 0,
        content: { heading: 'Custom Hero' },
        styleOverrides: { align: 'left' },
        animation: { type: 'slide', trigger: 'scroll', duration: 1.2, delay: 0.1 },
      },
    ],
    customizations: {},
    content: {},
    slug: 'jane-doe',
    isPublished: true,
    updatedAt: new Date('2026-03-30T00:00:00.000Z'),
  };

  const renderConfig = __testables.buildRenderConfig(portfolio, template);
  const hero = renderConfig.portfolioData.sections.find((section) => section.type === 'hero');

  assert.equal(hero.content.heading, 'Custom Hero');
  assert.equal(hero.styleOverrides.align, 'left');
  assert.equal(hero.animation.type, 'slide');
  assert.equal(hero.animation.trigger, 'scroll');
});
