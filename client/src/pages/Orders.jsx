import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';
import { formatDate, money, orderCode } from '../lib.js';

const STEPS = [
  ['placed', 'Order placed'],
  ['processing', 'Being prepared'],
  ['shipped', 'On its way'],
  ['delivered', 'Delivered']
];

export function OrderList() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.orders().then(setOrders).catch((problem) => setError(problem.message));
  }, []);

  return (
    <main className="shell page">
      <div className="page-intro"><p className="eyebrow">Your history</p><h1>My orders</h1></div>
      {error ? <p className="state-message error-state">{error}</p>
        : !orders ? <div className="state-message">Fetching your orders…</div>
        : !orders.length ? (
          <div className="empty-state"><Icon name="box" size={42} /><h2>No orders yet</h2><p>When you place an order, you can follow it here.</p><Link to="/shop" className="button">Start shopping</Link></div>
        ) : (
          <div className="order-list">
            {orders.map((order) => (
              <Link key={order._id} to={`/orders/${order._id}`} className="order-row">
                <div><strong>#{orderCode(order._id)}</strong><span>{formatDate(order.createdAt)}</span></div>
                <span className="muted">{order.items.reduce((n, i) => n + i.quantity, 0)} items</span>
                <span className={`status ${order.status}`}>{order.status}</span>
                <strong>{money(order.total)}</strong>
              </Link>
            ))}
          </div>
        )}
    </main>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.order(id).then(setOrder).catch((problem) => setError(problem.message));
  }, [id]);

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true);
    setError('');
    try { setOrder(await api.cancelOrder(id)); } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  };

  if (!order) {
    return <main className="shell state-message">{error ? <span className="error-state">{error}</span> : 'Looking up your order…'}</main>;
  }

  const reached = new Map(order.statusHistory.map((entry) => [entry.status, entry.at]));
  const cancelled = order.status === 'cancelled';

  return (
    <main className="shell page narrow">
      <div className="page-intro">
        <p className="eyebrow">{location.state?.justPlaced ? 'Thank you' : 'Order'}</p>
        <h1>{location.state?.justPlaced ? 'Your order is in.' : `Order #${orderCode(order._id)}`}</h1>
        <p>{location.state?.justPlaced && <>Order <strong>#{orderCode(order._id)}</strong>. </>}Updates will go to {order.shippingAddress.email}.</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}

      {cancelled ? (
        <p className="notice">This order was cancelled on {formatDate(reached.get('cancelled'))}.</p>
      ) : (
        <ol className="timeline">
          {STEPS.map(([key, label]) => (
            <li key={key} className={reached.has(key) ? 'done' : ''}>
              <span className="dot">{reached.has(key) && <Icon name="check" size={13} />}</span>
              <strong>{label}</strong>
              {reached.has(key) && <span className="muted">{formatDate(reached.get(key))}</span>}
            </li>
          ))}
        </ol>
      )}

      <div className="panel">
        {order.items.map((item) => (
          <div className="mini-line" key={`${item.product}`}>
            <img src={item.image} alt="" />
            <span>{item.name} × {item.quantity}</span>
            <strong>{money(item.price * item.quantity)}</strong>
          </div>
        ))}
        <div className="row"><span>Subtotal</span><span>{money(order.subtotal ?? order.total - order.shippingCost)}</span></div>
        <div className="row"><span>Shipping</span><span>{order.shippingCost ? money(order.shippingCost) : 'Free'}</span></div>
        <div className="row total"><span>Total · cash on delivery</span><span>{money(order.total)}</span></div>
        <p className="hint">Delivering to {order.shippingAddress.fullName}, {order.shippingAddress.address}, {order.shippingAddress.city} {order.shippingAddress.postalCode}</p>
      </div>

      <div className="actions-row">
        <Link to="/orders" className="text-link">All orders</Link>
        {order.status === 'placed' && <button className="text-btn danger" disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Cancel order'}</button>}
      </div>
    </main>
  );
}
