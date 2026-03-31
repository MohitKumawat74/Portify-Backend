const express = require('express');

const { generatePortfolio } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validation');
const { generatePortfolioSchema } = require('../utils/schemas');
const { checkAiGenerationLimit } = require('../middleware/planLimitMiddleware');

const router = express.Router();

// POST /api/ai/generate-portfolio
router.post('/generate-portfolio', protect, checkAiGenerationLimit, validate(generatePortfolioSchema), generatePortfolio);

module.exports = router;
