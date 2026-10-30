// Store rules live in one place so the API and the storefront never disagree.
const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

module.exports = {
  get freeShippingThreshold() { return number(process.env.FREE_SHIPPING_THRESHOLD, 1999); },
  get shippingFee() { return number(process.env.SHIPPING_FEE, 79); },
  get jwtSecret() { return process.env.JWT_SECRET; },
  maxPerLine: 20
};
