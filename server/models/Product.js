const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 8, maxlength: 2000 },
  image: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  origin: { type: String, trim: true, maxlength: 80, default: '' },
  price: { type: Number, required: true, min: 1 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  rating: { type: Number, min: 0, max: 5, default: 4.8 },
  badge: { type: String, trim: true, maxlength: 40, default: '' },
  featured: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ active: 1, featured: -1, createdAt: -1 });
productSchema.index({ category: 1 });

module.exports = mongoose.model('Product', productSchema);
