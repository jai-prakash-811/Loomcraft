require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('./models/Product');
const User = require('./models/User');
const { artPath } = require('./art');

const piece = (name, category, origin, price, stock, rating, badge, featured, description) => ({
  name, category, origin, price, stock, rating, badge, featured, description, image: artPath(name, category)
});

const products = [
  piece('Bagru Block-Print Kurta', 'Apparel', 'Bagru, Rajasthan', 2190, 18, 4.9, 'Bestseller', true,
    'A relaxed cotton kurta printed by hand with carved wooden blocks and natural indigo. Soft from the first wear, and no two prints land exactly alike.'),
  piece('Khadi Cotton Overshirt', 'Apparel', 'Gujarat', 2790, 15, 4.8, 'New', true,
    'Hand-spun, hand-woven khadi cut into an easy overshirt. Breathable in summer, a light layer when evenings cool down.'),
  piece('Ikat Weave Stole', 'Accessories', 'Pochampally, Telangana', 1490, 24, 4.9, 'Customer love', true,
    'A lightweight stole in double-ikat cotton, where the yarn is resist-dyed before weaving so the pattern emerges on the loom.'),
  piece('Jute & Cotton Market Tote', 'Accessories', 'West Bengal', 890, 40, 4.6, '', false,
    'A sturdy everyday tote woven from jute and lined with cotton. Roomy enough for the market, strong enough to be reused for years.'),
  piece('Hand-Stitched Leather Sandals', 'Footwear', 'Kolhapur, Maharashtra', 1890, 21, 4.7, '', false,
    'Vegetable-tanned leather sandals stitched by hand in the Kolhapur tradition. They begin firm and settle into your stride.'),
  piece('Hand-Thrown Terracotta Planter', 'Home & Living', 'Molela, Rajasthan', 690, 30, 4.7, '', true,
    'A porous, unglazed terracotta planter shaped on the wheel. Clay that breathes keeps roots healthy and ages beautifully outdoors.'),
  piece('Dhokra Brass Diya Set', 'Home & Living', 'Bastar, Chhattisgarh', 1190, 19, 4.8, 'Bestseller', false,
    'A set of three diyas made with the ancient lost-wax technique of Bastar. Each one is cast individually, with its own textured finish.'),
  piece('Sanganer Handmade Paper Journal', 'Stationery', 'Sanganer, Rajasthan', 450, 55, 4.8, '', false,
    'Cotton-rag paper made sheet by sheet, hand-bound with a block-printed cover. Thick, warm and wonderful with a fountain pen.'),
  piece('Mithila Art Ceramic Mug', 'Home & Living', 'Mithila, Bihar', 590, 36, 4.6, 'Just in', false,
    'A glazed stoneware mug painted with fine-line Mithila motifs, finished in a durable food-safe glaze.'),
  piece('Kantha-Stitch Throw', 'Home & Living', 'Bengal', 3490, 9, 5, 'Limited', true,
    'Layers of recycled cotton joined with rows of running stitch, the kantha way. A throw for the sofa that gets better each year.')
];

async function seed() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be set before seeding.');
  if (Boolean(process.env.ADMIN_EMAIL) !== Boolean(process.env.ADMIN_PASSWORD)) {
    throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to provision the store administrator.');
  }
  const refresh = process.argv.includes('--refresh');
  await mongoose.connect(process.env.MONGO_URI);

  for (const { stock, ...details } of products) {
    await Product.updateOne(
      { name: details.name },
      refresh ? { $set: details, $setOnInsert: { stock } } : { $setOnInsert: { ...details, stock } },
      { upsert: true }
    );
  }
  console.log(`Catalogue ready with ${products.length} pieces${refresh ? ' (descriptions refreshed, stock kept)' : ''}.`);

  if (process.env.ADMIN_EMAIL) {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
      throw new Error('Use a valid ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await User.updateOne({ email }, { $set: { email, name: 'Loomcraft Admin', passwordHash, role: 'admin' } }, { upsert: true });
    console.log(`Administrator credentials set for ${email}.`);
  }
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Unable to seed:', error.message);
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exitCode = 1;
});
