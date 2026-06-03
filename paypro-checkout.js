const CHECKOUT_BASE_URL = process.env.PAYPRO_CHECKOUT_URL || 'https://store.payproglobal.com/checkout';

const PLAN_PRICES = {
  tap: { monthly: 199, annual: 1910 },
  barrel: { monthly: 399, annual: 3830 },
  cellar: { monthly: 699, annual: 6710 }
};

function getPlanProductId(plan, billing) {
  const key = `PAYPRO_PRODUCT_${String(plan).toUpperCase()}_${String(billing).toUpperCase()}`;
  return process.env[key] || process.env.PAYPRO_PRODUCT_ID;
}

function getBookingProductId() {
  return process.env.PAYPRO_PRODUCT_BOOKING || process.env.PAYPRO_PRODUCT_ID;
}

function normalizeBilling(value) {
  return value === 'annual' ? 'annual' : 'monthly';
}

function normalizePlan(value) {
  return ['tap', 'barrel', 'cellar'].includes(value) ? value : null;
}

function buildPayProCheckoutUrl({
  amount,
  billing,
  currency = 'USD',
  orderId,
  plan
}) {
  const normalizedPlan = normalizePlan(plan);
  const normalizedBilling = normalizeBilling(billing);
  const productId = normalizedPlan
    ? getPlanProductId(normalizedPlan, normalizedBilling)
    : getBookingProductId();

  if (!productId) {
    throw new Error(
      normalizedPlan
        ? `Missing PayPro product ID for ${normalizedPlan} ${normalizedBilling}`
        : 'Missing PayPro product ID for booking payments'
    );
  }

  const checkoutUrl = new URL(CHECKOUT_BASE_URL);
  checkoutUrl.searchParams.set('products[1][id]', productId);
  checkoutUrl.searchParams.set('products[1][qty]', '1');
  checkoutUrl.searchParams.set('currency', currency || 'USD');

  if (orderId) checkoutUrl.searchParams.set('x-order-id', orderId);
  if (normalizedPlan) checkoutUrl.searchParams.set('x-plan', normalizedPlan);
  if (normalizedPlan) checkoutUrl.searchParams.set('x-billing', normalizedBilling);

  const numericAmount = Number(amount);
  const expectedPlanAmount = normalizedPlan ? PLAN_PRICES[normalizedPlan][normalizedBilling] : null;
  const effectiveAmount = Number.isFinite(numericAmount) && numericAmount > 0
    ? numericAmount
    : expectedPlanAmount;

  if (process.env.PAYPRO_ENABLE_DYNAMIC_PRICING === 'true' && effectiveAmount) {
    checkoutUrl.searchParams.set(`products[1][price][${currency || 'USD'}][amount]`, effectiveAmount.toFixed(2));
  }

  if (process.env.PAYPRO_TEST_MODE === 'true') {
    checkoutUrl.searchParams.set('use-test-mode', 'true');
    if (process.env.PAYPRO_SECRET_KEY) {
      checkoutUrl.searchParams.set('secret-key', process.env.PAYPRO_SECRET_KEY);
    }
  }

  return checkoutUrl.toString();
}

module.exports = {
  buildPayProCheckoutUrl
};
