const mongoose = require('mongoose');

const STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true, min: 1 },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const historySchema = new mongoose.Schema({
  status: { type: String, enum: STATUSES, required: true },
  at: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], required: true, validate: (items) => items.length > 0 },
  shippingAddress: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true }
  },
  subtotal: { type: Number, required: true, min: 1 },
  shippingCost: { type: Number, required: true, min: 0, default: 0 },
  total: { type: Number, required: true, min: 1 },
  paymentMethod: { type: String, enum: ['cod'], default: 'cod' },
  status: { type: String, enum: STATUSES, default: 'placed' },
  statusHistory: { type: [historySchema], default: () => [{ status: 'placed' }] }
}, { timestamps: true });

orderSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Order', orderSchema);
