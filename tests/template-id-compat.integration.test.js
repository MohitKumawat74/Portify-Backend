const test = require('node:test');
const assert = require('node:assert/strict');

const { checkTemplateAccess } = require('../middleware/planLimitMiddleware');
const User = require('../models/User');
const Template = require('../models/Template');

test('checkTemplateAccess accepts non-ObjectId templateId as slug-like identifier', async () => {
  const originalUserFindById = User.findById;
  const originalTemplateFindOne = Template.findOne;
  const originalTemplateFindById = Template.findById;

  try {
    User.findById = () => ({
      select: async () => ({
        _id: 'u1',
        plan: 'free',
        subscription: { status: 'active' },
        portfolioCount: 0,
      }),
    });

    let findByIdCalled = false;
    Template.findById = async () => {
      findByIdCalled = true;
      return null;
    };

    Template.findOne = () => ({
      select: async () => ({
        _id: '69ca29028c9900780c0bf999',
        slug: 'template4',
        name: 'Template 4',
        isActive: true,
        isPremium: false,
      }),
    });

    const req = {
      user: { _id: 'u1' },
      body: { templateId: 'template4' },
      params: {},
    };

    let nextErr = null;
    await checkTemplateAccess(req, {}, (err) => {
      nextErr = err || null;
    });

    assert.equal(nextErr, null);
    assert.equal(findByIdCalled, false);
    assert.equal(req.body.templateSlug, 'template4');
    assert.equal(String(req.body.templateId), '69ca29028c9900780c0bf999');
  } finally {
    User.findById = originalUserFindById;
    Template.findOne = originalTemplateFindOne;
    Template.findById = originalTemplateFindById;
  }
});
