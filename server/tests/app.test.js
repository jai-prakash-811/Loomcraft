const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'x'.repeat(40);
const app = require('../app');

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('serves deterministic SVG art and escapes input', async () => {
  const a = await (await fetch(`${base}/api/art/kurta.svg?t=Kurta&c=Apparel`)).text();
  const b = await (await fetch(`${base}/api/art/kurta.svg?t=Kurta&c=Apparel`)).text();
  assert.equal(a, b);
  assert.ok(a.startsWith('<svg'));

  const res = await fetch(`${base}/api/art/x.svg?t=${encodeURIComponent('<script>alert(1)</script>')}`);
  assert.match(res.headers.get('content-type'), /svg/);
  assert.ok(!(await res.text()).includes('<script>'));
});

test('exposes store config', async () => {
  const config = await (await fetch(`${base}/api/config`)).json();
  assert.equal(typeof config.freeShippingThreshold, 'number');
  assert.equal(typeof config.shippingFee, 'number');
});

test('protects private and admin routes', async () => {
  assert.equal((await fetch(`${base}/api/orders`)).status, 401);
  assert.equal((await fetch(`${base}/api/admin/products`)).status, 401);
  const bad = await fetch(`${base}/api/orders`, { headers: { Authorization: 'Bearer nonsense' } });
  assert.equal(bad.status, 401);
});

test('returns JSON 404 for unknown API routes and bad JSON', async () => {
  const missing = await fetch(`${base}/api/nope`);
  assert.equal(missing.status, 404);
  assert.ok((await missing.json()).message);
  const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
});
