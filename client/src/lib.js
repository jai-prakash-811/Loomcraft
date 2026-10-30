export const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export const shippingFor = (subtotal, config) =>
  subtotal <= 0 || subtotal >= config.freeShippingThreshold ? 0 : config.shippingFee;

export const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const slugify = (text) =>
  String(text).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export const artUrl = (name, category) => `/api/art/${slugify(name) || 'piece'}.svg${qs({ t: name, c: category })}`;
export const imageFallback = artUrl('Loomcraft', 'Handmade');

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const orderCode = (id) => String(id).slice(-8).toUpperCase();
