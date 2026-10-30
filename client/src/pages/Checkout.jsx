import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';
import { ProductImage } from '../components/ProductCard.jsx';
import { useStore } from '../store.jsx';
import { money, shippingFor } from '../lib.js';

export default function Checkout() {
  const { cart, user, setCart, refreshCart, config } = useStore();
  const navigate = useNavigate();
  const placed = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: user?.name || '', email: user?.email || '', phone: '', address: '', city: '', postalCode: '' });

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = shippingFor(subtotal, config);
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  useEffect(() => { refreshCart(); }, [refreshCart]);
  useEffect(() => {
    if (!cart.length && !placed.current) navigate('/cart', { replace: true });
  }, [cart.length, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const order = await api.createOrder({
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingAddress: form
      });
      placed.current = true;
      navigate(`/orders/${order._id}`, { replace: true, state: { justPlaced: true } });
      setCart([]);
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  };

  if (!cart.length) return null;

  return (
    <main className="shell page">
      <div className="page-intro"><p className="eyebrow">Last step</p><h1>Checkout</h1></div>
      <div className="two-col">
        <form className="panel" onSubmit={submit}>
          <h2>Delivery details</h2>
          <div className="form-grid">
            <label className="span-2">Full name<input required maxLength={100} value={form.fullName} onChange={update('fullName')} autoComplete="name" /></label>
            <label>Email<input type="email" required value={form.email} onChange={update('email')} autoComplete="email" /></label>
            <label>Phone<input type="tel" required pattern="[+0-9][0-9 \-]{8,14}" title="Enter a valid phone number" value={form.phone} onChange={update('phone')} autoComplete="tel" /></label>
            <label className="span-2">Street address<input required maxLength={250} value={form.address} onChange={update('address')} autoComplete="street-address" /></label>
            <label>City<input required maxLength={80} value={form.city} onChange={update('city')} autoComplete="address-level2" /></label>
            <label>PIN code<input required inputMode="numeric" pattern="[0-9]{6}" title="Enter a 6-digit PIN code" value={form.postalCode} onChange={update('postalCode')} autoComplete="postal-code" /></label>
          </div>
          <h2>Payment</h2>
          <div className="pay-option"><Icon name="box" /><div><strong>Cash on delivery</strong><p>Pay when your parcel arrives.</p></div><Icon name="check" /></div>
          <p className="hint">Online payments are not enabled, so nothing is charged now.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button wide" disabled={busy}>{busy ? 'Placing your order…' : `Place order · ${money(subtotal + shipping)}`}</button>
        </form>
        <aside className="summary">
          <h2>In your bag</h2>
          {cart.map((item) => (
            <div className="mini-line" key={item.productId}>
              <ProductImage product={item.product} />
              <span>{item.product.name} × {item.quantity}</span>
              <strong>{money(item.product.price * item.quantity)}</strong>
            </div>
          ))}
          <div className="row"><span>Shipping</span><span>{shipping ? money(shipping) : 'Free'}</span></div>
          <div className="row total"><span>Total</span><span>{money(subtotal + shipping)}</span></div>
        </aside>
      </div>
    </main>
  );
}
