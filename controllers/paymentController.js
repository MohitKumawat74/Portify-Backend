const {
  createProOrder,
  verifyProPayment,
  verifyWebhookSignature,
  handleWebhookEvent,
} = require('../services/paymentService');
const ApiError = require('../utils/apiError');

const createOrder = async (req, res, next) => {
  try {
    const { planId, billingCycle } = req.body || {};

    if (planId && planId !== 'plan_pro') {
      throw new ApiError(400, 'Only plan_pro is supported for Razorpay checkout.', 'VALIDATION_ERROR');
    }

    if (billingCycle && !['monthly', 'month'].includes(String(billingCycle).toLowerCase())) {
      throw new ApiError(400, 'Only monthly billing cycle is supported.', 'VALIDATION_ERROR');
    }

    const order = await createProOrder(req.user._id);

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    await verifyProPayment({
      userId: req.user._id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and plan upgraded',
    });
  } catch (error) {
    if (
      error?.errorCode === 'PAYMENT_VERIFICATION_FAILED' ||
      (error?.statusCode >= 400 && error?.statusCode < 500)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment',
      });
    }

    return next(error);
  }
};

const webhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isValidSignature = verifyWebhookSignature(rawBody, signature);

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment',
      });
    }

    await handleWebhookEvent(req.body);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  webhook,
};
