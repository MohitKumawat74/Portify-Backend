const express = require('express');
const router = express.Router();
const {
  create,
  update,
  remove,
  getBySlug,
  getMyPortfolios,
  getBuilderData,
  getById,
  publish,
  unpublish,
  customize,
  reorderSections,
  addSection,
  updateSection,
  removeSection,
  getPortfolioAnalytics,
} = require('../controllers/portfolioController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validation');
const {
  reorderSectionsSchema,
  addSectionSchema,
  updatePortfolioSectionSchema,
  removeSectionParamsSchema,
} = require('../utils/schemas');
const {
  checkPortfolioLimit,
  checkProjectLimit,
  checkTemplateAccess,
  checkSectionLimit,
} = require('../middleware/planLimitMiddleware');

// Public — must be defined before /:id to avoid param capture
router.get('/public/:slug', getBySlug);

// All routes below require authentication
router.use(protect);

// GET  /api/portfolios            — paginated list for the authenticated user
router.get('/', getMyPortfolios);

// GET  /api/portfolio/builder
router.get('/builder', getBuilderData);

// POST /api/portfolios
router.post('/', checkPortfolioLimit, checkProjectLimit, checkTemplateAccess, checkSectionLimit, create);

// GET  /api/portfolios/:id
router.get('/:id', getById);

// PUT /api/portfolios/reorder
router.put('/reorder', validate(reorderSectionsSchema), reorderSections);

// PUT  /api/portfolios/:id
router.put('/:id', checkProjectLimit, checkTemplateAccess, checkSectionLimit, update);

// POST /api/portfolios/customize
router.post('/customize', customize);

// POST /api/portfolios/section
router.post('/section', validate(addSectionSchema), checkSectionLimit, addSection);

// PUT /api/portfolios/section
router.put('/section', validate(updatePortfolioSectionSchema), updateSection);

// DELETE /api/portfolios/section/:id
router.delete('/section/:id', validate(removeSectionParamsSchema, 'params'), removeSection);

// DELETE /api/portfolios/:id
router.delete('/:id', remove);

// PATCH /api/portfolios/:id/publish
router.patch('/:id/publish', publish);

// PATCH /api/portfolios/:id/unpublish
router.patch('/:id/unpublish', unpublish);

// GET  /api/portfolios/:id/analytics
router.get('/:id/analytics', getPortfolioAnalytics);

module.exports = router;
