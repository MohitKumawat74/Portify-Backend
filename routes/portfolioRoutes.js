const express = require('express');
const router = express.Router();
const {
  create,
  update,
  remove,
  getBySlug,
  getMyPortfolios,
  getById,
  publish,
  unpublish,
  getPortfolioAnalytics,
} = require('../controllers/portfolioController');
const { protect } = require('../middleware/authMiddleware');
const {
  checkPortfolioLimit,
  checkProjectLimit,
  checkTemplateAccess,
} = require('../middleware/planLimitMiddleware');

// Public — must be defined before /:id to avoid param capture
router.get('/public/:slug', getBySlug);

// All routes below require authentication
router.use(protect);

// GET  /api/portfolios            — paginated list for the authenticated user
router.get('/', getMyPortfolios);

// POST /api/portfolios
router.post('/', checkPortfolioLimit, checkProjectLimit, checkTemplateAccess, create);

// GET  /api/portfolios/:id
router.get('/:id', getById);

// PUT  /api/portfolios/:id
router.put('/:id', checkProjectLimit, checkTemplateAccess, update);

// DELETE /api/portfolios/:id
router.delete('/:id', remove);

// PATCH /api/portfolios/:id/publish
router.patch('/:id/publish', publish);

// PATCH /api/portfolios/:id/unpublish
router.patch('/:id/unpublish', unpublish);

// GET  /api/portfolios/:id/analytics
router.get('/:id/analytics', getPortfolioAnalytics);

module.exports = router;
