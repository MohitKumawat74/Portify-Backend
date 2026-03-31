const crypto = require('crypto');
const ApiError = require('../utils/apiError');
const Payment = require('../models/Payment');
const { getRazorpayClient } = require('../config/razorpay');
const { upgradeUserPlan } = require('./planService');

const PRO_PLAN_AMOUNT_PAISE = Number(process.env.PRO_PLAN_AMOUNT_PAISE || 49900);
const PRO_PLAN_CURRENCY = (process.env.PRO_PLAN_CURRENCY || 'INR').toUpperCase();
const PRO_PLAN_DURATION_DAYS = Number(process.env.PRO_PLAN_DURATION_DAYS || 30);

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

const safeCompare = (first, second) => {
  if (!first || !second) return false;
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
};

const createProOrder = async (userId) => {
  if (!isPositiveInteger(PRO_PLAN_AMOUNT_PAISE)) {
    throw new ApiError(500, 'Invalid Pro plan amount configuration.', 'CONFIG_ERROR');
  }

  const razorpay = getRazorpayClient();
  // Razorpay receipt max length is 40 chars.
  const receipt = `pro_${Date.now()}_${String(userId).slice(-8)}`;

  let order;
  try {
    order = await razorpay.orders.create({
      amount: PRO_PLAN_AMOUNT_PAISE,
      currency: PRO_PLAN_CURRENCY,
      receipt,
      notes: {
        userId: String(userId),
        plan: 'pro',
      },
    });
  } catch (error) {
    const providerMessage =
      error?.error?.description ||
      error?.response?.data?.error?.description ||
      error?.message ||
      'Failed to create Razorpay order.';

    const providerStatus = Number(error?.statusCode || error?.response?.status || 502);
    const safeStatus = providerStatus >= 400 && providerStatus < 600 ? providerStatus : 502;

    throw new ApiError(
      safeStatus,
      `Unable to create payment order: ${providerMessage}`,
      'PAYMENT_ORDER_CREATE_FAILED'
    );
  }

  await Payment.create({
    userId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    status: 'created',
    plan: 'pro',
  });

  return order;
};

const verifyProPayment = async ({
  userId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, 'Invalid payment.', 'PAYMENT_VERIFICATION_FAILED');
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new ApiError(500, 'Razorpay secret is not configured.', 'CONFIG_ERROR');
  }

  const paymentRecord = await Payment.findOne({
    orderId: razorpay_order_id,
    userId,
  });

  if (!paymentRecord) {
    throw new ApiError(400, 'Invalid payment.', 'PAYMENT_VERIFICATION_FAILED');
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isVerified = safeCompare(expectedSignature, razorpay_signature);

  if (!isVerified) {
    paymentRecord.status = 'failed';
    paymentRecord.paymentId = razorpay_payment_id;
    paymentRecord.razorpaySignature = razorpay_signature;
    await paymentRecord.save();

    throw new ApiError(400, 'Invalid payment.', 'PAYMENT_VERIFICATION_FAILED');
  }

  if (paymentRecord.status !== 'paid') {
    paymentRecord.status = 'paid';
    paymentRecord.paymentId = razorpay_payment_id;
    paymentRecord.razorpaySignature = razorpay_signature;
    paymentRecord.verifiedAt = new Date();
    await paymentRecord.save();
  }

  await upgradeUserPlan(userId, 'pro', {
    planDurationDays: PRO_PLAN_DURATION_DAYS,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    paymentProvider: 'razorpay',
  });

  return {
    success: true,
  };
};

const verifyWebhookSignature = (rawBody, signature) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new ApiError(500, 'Razorpay webhook secret is not configured.', 'CONFIG_ERROR');
  }

  if (!rawBody || !signature) {
    throw new ApiError(400, 'Invalid webhook signature.', 'PAYMENT_WEBHOOK_INVALID');
  }

  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  return safeCompare(expected, signature);
};

const handleWebhookEvent = async (eventBody) => {
  if (!eventBody || eventBody.event !== 'payment.captured') {
    return { handled: false };
  }

  const paymentEntity = eventBody?.payload?.payment?.entity;
  if (!paymentEntity?.order_id || !paymentEntity?.id) {
    return { handled: false };
  }

  const paymentRecord = await Payment.findOne({ orderId: paymentEntity.order_id });

  if (!paymentRecord) {
    return { handled: false };
  }

  if (paymentRecord.status !== 'paid') {
    paymentRecord.status = 'paid';
    paymentRecord.paymentId = paymentEntity.id;
    paymentRecord.verifiedAt = new Date();
    await paymentRecord.save();
  }

  await upgradeUserPlan(paymentRecord.userId, 'pro', {
    planDurationDays: PRO_PLAN_DURATION_DAYS,
    paymentId: paymentEntity.id,
    orderId: paymentEntity.order_id,
    paymentProvider: 'razorpay',
  });

  return { handled: true };
};

module.exports = {
  createProOrder,
  verifyProPayment,
  verifyWebhookSignature,
  handleWebhookEvent,
};
