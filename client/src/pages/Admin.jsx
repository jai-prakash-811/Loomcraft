import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { artUrl, formatDate, money, orderCode } from '../lib.js';

const EMPTY = { name: '', description: '', image: '', category: '', origin: '', price: '', stock: '', rating: '4.8', badge: '', featured: false };
const FLOW = ['placed', 'processing', 'shipped', 'delivered'];

const nextStatuses = (status) => {
  if (status === 'cancelled' || status === 'delivered') return [];
  return [...FLOW.slice(FLOW.indexOf(status) + 1), 'cancelled'];
};

export default function Admin() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([api.adminProducts(), api.adminOrders()])
    .then(([productList, orderList]) => { setProducts(productList); setOrders(orderList); })
    .catch((problem) => setError(problem.message));
  useEffect(() => { load(); }, []);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const reset = () => { setEditing(null); setForm(EMPTY); };

  const edit = (product) => {
    setEditing(product._id);
    setForm({
      name: product.name, description: product.description, image: product.image, category: product.category,
      origin: product.origin || '', badge: product.badge || '', featured: Boolean(product.featured),
      price: String(product.price), stock: String(product.stock), rating: String(product.rating)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const existing = products.find((product) => product._id === editing);
      await api.saveProduct({
        ...form, price: Number(form.price), stock: Number(form.stock), rating: Number(form.rating),
        ...(existing ? { active: existing.active } : {})
      }, editing);
      reset();
      await load();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (product, active) => {
    setError('');
    try {
      if (active) {
        await api.saveProduct({ ...product, active: true }, product._id);
      } else {
        if (!window.confirm('Archive this piece? It will be hidden from the shop but kept in past orders.')) return;
        await api.archiveProduct(product._id);
      }
      await load();
    } catch (problem) {
      setError(problem.message);
    }
  };

  const changeStatus = async (id, status) => {
    setError('');
    try {
      if (status === 'cancelled' && !window.confirm('Cancel this order and return its stock?')) return;
      await api.setOrderStatus(id, status);
      await load();
    } catch (problem) {
      setError(problem.message);
      load();
    }
  };

  const revenue = orders.filter((order) => order.status !== 'cancelled').reduce((sum, order) => sum + order.total, 0);
  const open = orders.filter((order) => ['placed', 'processing', 'shipped'].includes(order.status)).length;

  return (
    <main className="shell page">
      <div className="page-intro"><p className="eyebrow">Studio</p><h1>Run the shop</h1></div>
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="stats">
        <div><span>Live pieces</span><strong>{products.filter((p) => p.active).length}</strong></div>
        <div><span>Open orders</span><strong>{open}</strong></div>
        <div><span>Revenue (excl. cancelled)</span><strong>{money(revenue)}</strong></div>
      </div>

      <section className="panel">
        <h2>{editing ? 'Edit piece' : 'Add a piece'}</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>Name<input required value={form.name} onChange={update('name')} maxLength={120} /></label>
          <label>Category<input required value={form.category} onChange={update('category')} maxLength={60} /></label>
          <label>Made in<input value={form.origin} onChange={update('origin')} maxLength={80} placeholder="Town, State" /></label>
          <label>Badge<input value={form.badge} onChange={update('badge')} maxLength={40} /></label>
          <label>Price (₹)<input required type="number" min="1" value={form.price} onChange={update('price')} /></label>
          <label>Stock<input required type="number" min="0" step="1" value={form.stock} onChange={update('stock')} /></label>
          <label className="span-2">Image URL
            <input required value={form.image} onChange={update('image')} placeholder="https://… or /api/art/…" />
            <button type="button" className="text-btn" disabled={!form.name} onClick={() => setForm({ ...form, image: artUrl(form.name, form.category) })}>Use generated block-print art</button>
          </label>
          <label className="span-2">Description<textarea required rows={3} minLength={8} maxLength={2000} value={form.description} onChange={update('description')} /></label>
          <label className="check"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Feature on the home page</label>
          <div className="actions-row span-2">
            <button className="button" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add piece'}</button>
            {editing && <button type="button" className="text-btn" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Inventory</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Piece</th><th>Category</th><th>Price</th><th>Stock</th><th>State</th><th /></tr></thead>
          <tbody>{products.map((product) => (
            <tr key={product._id} className={product.active ? '' : 'archived'}>
              <td><strong>{product.name}</strong></td>
              <td>{product.category}</td>
              <td>{money(product.price)}</td>
              <td className={product.stock <= 3 ? 'low' : ''}>{product.stock}</td>
              <td>{product.active ? (product.featured ? 'Live · featured' : 'Live') : 'Archived'}</td>
              <td className="cell-actions">
                <button className="text-btn" onClick={() => edit(product)}>Edit</button>
                {product.active
                  ? <button className="text-btn danger" onClick={() => setActive(product, false)}>Archive</button>
                  : <button className="text-btn" onClick={() => setActive(product, true)}>Restore</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>

      <section className="panel">
        <h2>Orders</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th><th>Move to</th></tr></thead>
          <tbody>{orders.map((order) => {
            const options = nextStatuses(order.status);
            return (
              <tr key={order._id}>
                <td>#{orderCode(order._id)}</td>
                <td>{formatDate(order.createdAt)}</td>
                <td>{order.shippingAddress.fullName}<br /><span className="muted">{order.shippingAddress.city}</span></td>
                <td>{money(order.total)}</td>
                <td><span className={`status ${order.status}`}>{order.status}</span></td>
                <td>{options.length ? (
                  <select value="" aria-label="Update status" onChange={(e) => e.target.value && changeStatus(order._id, e.target.value)}>
                    <option value="">Choose…</option>
                    {options.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                ) : <span className="muted">Final</span>}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>
    </main>
  );
}
