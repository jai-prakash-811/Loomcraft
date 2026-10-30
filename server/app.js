const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const settings = require('./settings');
const { renderArt } = require('./art');

const app = express();
app.disable('x-powered-by');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+0-9][0-9 \-]{8,14}$/;
const FLOW = ['placed', 'processing', 'shipped', 'delivered'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
});
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset < now) hits.delete(key);
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip);
    if (!entry || entry.reset < now) {
      hits.set(req.ip, { count: 1, reset: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ message: 'Too many attempts. Please wait a few minutes and try again.' });
    }
    return next();
  };
}
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

const issueToken = (user) => jwt.sign({ sub: user.id }, settings.jwtSecret, { expiresIn: '7d' });
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

const requireAuth = asyncRoute(async (req, res, next) => {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }
  let payload;
  try {
    payload = jwt.verify(token, settings.jwtSecret);
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
  const user = await User.findById(payload.sub);
  if (!user) {
    return res.status(401).json({ message: 'Your account could not be found.' });
  }
  req.user = user;
  return next();
});

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access is required.' });
  }
  return next();
};

/* ---------- meta ---------- */

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/api/config', (req, res) => {
  res.json({
    freeShippingThreshold: settings.freeShippingThreshold,
    shippingFee: settings.shippingFee,
    maxPerLine: settings.maxPerLine
  });
});

app.get('/api/art/:slug.svg', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400').type('image/svg+xml').send(
    renderArt({ slug: req.params.slug, title: text(req.query.t), category: text(req.query.c) })
  );
});

/* ---------- auth ---------- */

app.post('/api/auth/signup', authLimiter, asyncRoute(async (req, res) => {
  const name = text(req.body.name);
  const email = text(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (name.length < 2 || name.length > 80 || !EMAIL.test(email) || password.length < 8 || password.length > 128) {
    throw new HttpError(400, 'Enter a valid name and email, and use a password of 8 to 128 characters.');
  }
  if (await User.exists({ email })) {
    throw new HttpError(409, 'An account with this email already exists.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role: 'customer' });
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
}));

app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
  const email = text(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  res.json({ token: issueToken(user), user: publicUser(user) });
}));

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

/* ---------- catalogue ---------- */

const SORTS = {
  featured: { featured: -1, createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { rating: -1, createdAt: -1 }
};

app.get('/api/products', asyncRoute(async (req, res) => {
  const filter = { active: true };
  const search = text(req.query.search).slice(0, 100);
  const category = text(req.query.category).slice(0, 60);
  const sort = typeof req.query.sort === 'string' && Object.hasOwn(SORTS, req.query.sort) ? req.query.sort : 'featured';

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { description: pattern }, { category: pattern }, { origin: pattern }];
  }
  if (category) filter.category = category;
  if (typeof req.query.ids === 'string') {
    filter._id = { $in: req.query.ids.split(',').filter((id) => mongoose.isValidObjectId(id)).slice(0, 50) };
  }

  const parsed = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : 100;
  const [products, categories] = await Promise.all([
    Product.find(filter).sort(SORTS[sort]).limit(limit).lean(),
    Product.distinct('category', { active: true })
  ]);
  res.json({ products, categories: categories.sort((a, b) => a.localeCompare(b)) });
}));

app.get('/api/products/:id', asyncRoute(async (req, res) => {
  const product = mongoose.isValidObjectId(req.params.id)
    ? await Product.findOne({ _id: req.params.id, active: true }).lean()
    : null;
  if (!product) throw new HttpError(404, 'Product not found.');
  res.json(product);
}));

/* ---------- wishlist ---------- */

const loadWishlist = async (userId) => {
  const user = await User.findById(userId).populate({ path: 'wishlist', match: { active: true } });
  return user.wishlist;
};

app.get('/api/wishlist', requireAuth, asyncRoute(async (req, res) => {
  res.json(await loadWishlist(req.user.id));
}));

app.put('/api/wishlist/:productId', requireAuth, asyncRoute(async (req, res) => {
  const product = mongoose.isValidObjectId(req.params.productId)
    ? await Product.findOne({ _id: req.params.productId, active: true })
    : null;
  if (!product) throw new HttpError(404, 'Product not found.');

  const alreadySaved = req.user.wishlist.some((id) => id.equals(product._id));
  await User.updateOne(
    { _id: req.user.id },
    alreadySaved ? { $pull: { wishlist: product._id } } : { $addToSet: { wishlist: product._id } }
  );
  res.json({ added: !alreadySaved, wishlist: await loadWishlist(req.user.id) });
}));

/* ---------- orders ---------- */

class StockError extends Error {}

app.post('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const { items, shippingAddress } = req.body;
  const fields = ['fullName', 'email', 'phone', 'address', 'city', 'postalCode'];
  if (!Array.isArray(items) || items.length === 0 || items.length > 50 || !shippingAddress ||
      fields.some((field) => !text(shippingAddress[field]))) {
    throw new HttpError(400, 'A valid cart and complete delivery address are required.');
  }
  const address = Object.fromEntries(fields.map((field) => [field, text(shippingAddress[field])]));
  if (!EMAIL.test(address.email) || !PHONE.test(address.phone) || !/^\d{6}$/.test(address.postalCode) ||
      address.fullName.length > 100 || address.address.length > 250 || address.city.length > 80) {
    throw new HttpError(400, 'Please check your email, phone number, address and 6-digit PIN code.');
  }

  const quantities = new Map();
  for (const item of items) {
    if (!item || !mongoose.isValidObjectId(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new HttpError(400, 'Your bag contains an invalid product or quantity.');
    }
    const key = String(item.productId).toLowerCase();
    const total = (quantities.get(key) || 0) + item.quantity;
    if (total > settings.maxPerLine) {
      throw new HttpError(400, `You can order at most ${settings.maxPerLine} of each piece.`);
    }
    quantities.set(key, total);
  }

  const products = await Product.find({ _id: { $in: [...quantities.keys()] }, active: true });
  if (products.length !== quantities.size) {
    throw new HttpError(400, 'One or more pieces in your bag are no longer available.');
  }

  const orderItems = [];
  const reserved = [];
  try {
    for (const product of products) {
      const quantity = quantities.get(product.id);
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, active: true, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } }
      );
      if (!updated) throw new StockError(`${product.name} does not have enough stock.`);
      reserved.push({ id: product._id, quantity });
      orderItems.push({ product: product._id, name: product.name, image: product.image, price: product.price, quantity });
    }
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      shippingAddress: address,
      subtotal,
      shippingCost,
      total: subtotal + shippingCost
    });
    res.status(201).json(order);
  } catch (error) {
    await Promise.all(reserved.map(({ id, quantity }) => Product.updateOne({ _id: id }, { $inc: { stock: quantity } })));
    if (error instanceof StockError) throw new HttpError(409, error.message);
    throw error;
  }
}));

app.get('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  res.json(await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).lean());
}));

async function findOrderFor(user, id) {
  const order = mongoose.isValidObjectId(id) ? await Order.findById(id) : null;
  if (!order || (user.role !== 'admin' && !order.user.equals(user._id))) {
    throw new HttpError(404, 'Order not found.');
  }
  return order;
}

app.get('/api/orders/:id', requireAuth, asyncRoute(async (req, res) => {
  res.json(await findOrderFor(req.user, req.params.id));
}));

// Atomically cancel and return reserved stock to the shelf.
async function cancelOrder(order, allowedFrom) {
  const cancelled = await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: allowedFrom } },
    { $set: { status: 'cancelled' }, $push: { statusHistory: { status: 'cancelled', at: new Date() } } },
    { new: true }
  );
  if (cancelled) {
    await Promise.all(cancelled.items.map((item) =>
      Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
    ));
  }
  return cancelled;
}

app.post('/api/orders/:id/cancel', requireAuth, asyncRoute(async (req, res) => {
  const order = await findOrderFor(req.user, req.params.id);
  const cancelled = await cancelOrder(order, ['placed']);
  if (!cancelled) {
    throw new HttpError(409, 'This order has already been processed and can no longer be cancelled online.');
  }
  res.json(cancelled);
}));

/* ---------- admin ---------- */

function productPayload(body) {
  const price = Number(body.price);
  const stock = Number(body.stock);
  const rating = body.rating === undefined || body.rating === '' ? 4.8 : Number(body.rating);
  const data = {
    name: text(body.name),
    description: text(body.description),
    image: text(body.image),
    category: text(body.category),
    origin: text(body.origin).slice(0, 80),
    badge: text(body.badge).slice(0, 40),
    price,
    stock,
    rating,
    featured: body.featured === true
  };
  if (typeof body.active === 'boolean') data.active = body.active;
  const valid = data.name.length >= 2 && data.name.length <= 120 &&
    data.description.length >= 8 && data.description.length <= 2000 &&
    /^(https?:\/\/\S+|\/[^/\s]\S*)$/i.test(data.image) &&
    data.category && data.category.length <= 60 &&
    Number.isFinite(price) && price >= 1 &&
    Number.isInteger(stock) && stock >= 0 &&
    Number.isFinite(rating) && rating >= 0 && rating <= 5;
  return valid ? data : null;
}

app.use('/api/admin', requireAuth, requireAdmin);

app.get('/api/admin/products', asyncRoute(async (req, res) => {
  res.json(await Product.find().sort({ createdAt: -1 }).lean());
}));

app.post('/api/admin/products', asyncRoute(async (req, res) => {
  const payload = productPayload(req.body);
  if (!payload) throw new HttpError(400, 'Please provide valid product details.');
  res.status(201).json(await Product.create(payload));
}));

app.put('/api/admin/products/:id', asyncRoute(async (req, res) => {
  const payload = productPayload(req.body);
  if (!payload) throw new HttpError(400, 'Please provide valid product details.');
  const product = mongoose.isValidObjectId(req.params.id)
    ? await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    : null;
  if (!product) throw new HttpError(404, 'Product not found.');
  res.json(product);
}));

// Products are archived rather than destroyed so past orders and wishlists stay intact.
app.delete('/api/admin/products/:id', asyncRoute(async (req, res) => {
  const product = mongoose.isValidObjectId(req.params.id)
    ? await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true })
    : null;
  if (!product) throw new HttpError(404, 'Product not found.');
  res.json(product);
}));

app.get('/api/admin/orders', asyncRoute(async (req, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }).limit(200).lean());
}));

app.patch('/api/admin/orders/:id', asyncRoute(async (req, res) => {
  const status = req.body.status;
  if (!Order.STATUSES.includes(status)) throw new HttpError(400, 'A valid order status is required.');
  const order = mongoose.isValidObjectId(req.params.id) ? await Order.findById(req.params.id) : null;
  if (!order) throw new HttpError(404, 'Order not found.');
  if (order.status === status) return res.json(order);

  if (order.status === 'cancelled' || order.status === 'delivered') {
    throw new HttpError(409, `${order.status === 'cancelled' ? 'Cancelled' : 'Delivered'} orders cannot be changed.`);
  }
  if (status === 'cancelled') {
    const cancelled = await cancelOrder(order, ['placed', 'processing', 'shipped']);
    if (!cancelled) throw new HttpError(409, 'The order changed. Refresh and try again.');
    return res.json(cancelled);
  }
  if (FLOW.indexOf(status) < FLOW.indexOf(order.status)) {
    throw new HttpError(409, 'Orders can only move forward through fulfilment.');
  }
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { $set: { status }, $push: { statusHistory: { status, at: new Date() } } },
    { new: true }
  );
  if (!updated) throw new HttpError(409, 'The order changed. Refresh and try again.');
  return res.json(updated);
}));

/* ---------- static client + errors ---------- */

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'That endpoint does not exist.' });
});

if (process.env.NODE_ENV === 'production') {
  const clientDirectory = path.join(__dirname, '..', 'dist');
  app.use(express.static(clientDirectory));
  app.get('*', (req, res) => res.sendFile(path.join(clientDirectory, 'index.html')));
}

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must contain valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Please check the submitted information.' });
  }
  if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
  console.error(error);
  return res.status(500).json({ message: 'The server could not complete your request.' });
});

module.exports = app;
