require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const settings = require('./settings');

async function start() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be set before starting the server.');
  if (!settings.jwtSecret || settings.jwtSecret.length < 32) {
    throw new Error('Set JWT_SECRET to a secret of at least 32 characters.');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN) {
    throw new Error('Set CLIENT_ORIGIN to your production storefront URL.');
  }
  await mongoose.connect(process.env.MONGO_URI);
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => console.log(`Loomcraft API ready on http://localhost:${port}`));
}

start().catch((error) => {
  console.error('Unable to start Loomcraft:', error.message);
  process.exitCode = 1;
});
