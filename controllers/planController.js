// Static plans data — update prices/features here or move to a DB collection as needed
const PLANS = [
  {
    id: 'plan_free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    billingPeriod: 'forever',
    description: 'Everything you need to get started and get noticed.',
    features: [
      '3 portfolio templates',
      'Custom slug URL',
      '5 projects showcase',
      'Skills section',
      'Mobile responsive',
      'Basic analytics',
    ],
    isPopular: false,
    isActive: true,
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    price: 9,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'For serious developers who want every edge.',
    features: [
      'All 50+ premium templates',
      'Custom domain (coming soon)',
      'Unlimited projects',
      '3D skill visualisations',
      'Advanced analytics',
      'Priority support',
      'SEO optimisation',
      'PDF export',
      'Remove branding',
    ],
    isPopular: true,
    isActive: true,
  },
  {
    id: 'plan_team',
    name: 'Team',
    price: 29,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'For agencies and teams managing multiple portfolios.',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Team analytics dashboard',
      'Dedicated support',
      'Custom branding',
    ],
    isPopular: false,
    isActive: true,
  },
];

// GET /api/plans — Public
const getPlans = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Plans fetched',
    data: PLANS.filter((p) => p.isActive),
  });
};

module.exports = { getPlans };
