const { generatePortfolioSections, consumeAiGenerationQuota } = require('../services/aiPortfolioService');

const generatePortfolio = async (req, res, next) => {
  try {
    const usage = await consumeAiGenerationQuota(req.user._id);
    const data = await generatePortfolioSections(req.body || {});

    return res.status(200).json({
      success: true,
      message: 'AI portfolio generated successfully',
      data,
      meta: {
        plan: usage.plan,
        remainingAiGenerations: usage.remaining,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  generatePortfolio,
};
