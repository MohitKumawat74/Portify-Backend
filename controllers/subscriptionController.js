const User = require('../models/User');

const PLAN_META = {
  plan_free: { name: 'Free', price: 0, billingPeriod: 'forever' },
  plan_pro: { name: 'Pro', price: 9, billingPeriod: 'month' },
  plan_team: { name: 'Team', price: 29, billingPeriod: 'month' },
};

// POST /api/subscriptions/checkout — Protected
// Returns a Stripe checkout URL (stub — connect Stripe SDK in production)
const checkout = async (req, res, next) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;

    if (!planId || !PLAN_META[planId]) {
      return res.status(400).json({ success: false, message: 'Invalid planId.' });
    }

    if (planId === 'plan_free') {
      return res.status(400).json({
        success: false,
        message: 'The Free plan does not require checkout.',
      });
    }

    // Stub: In production replace with Stripe checkout session creation:
    // const session = await stripe.checkout.sessions.create({ ... });
    // return res.json({ success: true, data: { checkoutUrl: session.url } });

    const checkoutUrl = `${process.env.CLIENT_URL || 'https://app.portify.dev'}/checkout/stub?plan=${planId}`;

    res.status(200).json({
      success: true,
      message: 'Checkout session created',
      data: { checkoutUrl },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/subscriptions/current — Protected
const getCurrent = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('subscription');
    const sub = user.subscription || {};

    res.status(200).json({
      success: true,
      message: 'Subscription fetched',
      data: {
        id: sub.stripeSubscriptionId || null,
        planId: sub.planId || 'plan_free',
        planName: sub.planName || 'Free',
        status: sub.status || 'active',
        currentPeriodStart: sub.currentPeriodStart || null,
        currentPeriodEnd: sub.currentPeriodEnd || null,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/subscriptions/cancel — Protected
const cancel = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('subscription');
    const sub = user.subscription || {};

    if (!sub.planId || sub.planId === 'plan_free') {
      return res.status(400).json({
        success: false,
        message: 'No active paid subscription to cancel.',
      });
    }

    // In production call Stripe to schedule cancellation:
    // await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });

    user.subscription.cancelAtPeriodEnd = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at end of billing period',
      data: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: user.subscription.currentPeriodEnd || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkout, getCurrent, cancel };
