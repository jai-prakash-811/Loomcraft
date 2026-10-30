import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ProductImage } from '../components/ProductCard.jsx';
import { useStore } from '../store.jsx';
import { money, shippingFor } from '../lib.js';

export default function Cart() {
  const { cart, updateCart, setToast, refreshCart, config, maxFor } = useStore();
  const navigate = useNavigate();
  useEffect(() => { refreshCart(); }, [refreshCart]);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = shippingFor(subtotal, config);
  const remaining = config.freeShippingThreshold - subtotal;

  return (
    <main className="shell page">
      <div className="page-intro"><p className="eyebrow">Almost yours</p><h1>Your bag</h1></div>
      {!cart.length ? (
        <div className="empty-state">
          <Icon name="bag" size={42} />
          <h2>Your bag is empty</h2>
          <p>Find something handmade to fill it.</p>
          <Link to="/shop" className="button">Explore the collection</Link>
        </div>
      ) : (
        <div className="two-col">
          <div className="lines">
            {cart.map(({ product, productId, quantity }) => (
              <article className="line" key={productId}>
                <Link to={`/product/${productId}`}><ProductImage product={product} /></Link>
                <div className="line-copy">
                  <p className="eyebrow">{product.category}</p>
                  <Link to={`/product/${productId}`} className="product-name">{product.name}</Link>
                  <p>{money(product.price)}</p>
                  <div className="quantity">
                    <button onClick={() => updateCart(productId, quantity - 1)} aria-label="Decrease quantity">−</button>
                    <span>{quantity}</span>
                    <button onClick={() => updateCart(productId, quantity + 1)} aria-label="Increase quantity" disabled={quantity >= maxFor(product)}>+</button>
                  </div>
                </div>
                <div className="line-end">
                  <strong>{money(product.price * quantity)}</strong>
                  <button className="text-btn" onClick={() => { updateCart(productId, 0); setToast('Removed from your bag.'); }}>Remove</button>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary">
            <h2>Order summary</h2>
            <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="row"><span>Shipping</span><span>{shipping ? money(shipping) : 'Free'}</span></div>
            {remaining > 0 && <p className="hint">Add {money(remaining)} more for free shipping.</p>}
            <div className="row total"><span>Total</span><span>{money(subtotal + shipping)}</span></div>
            <button className="button wide" onClick={() => navigate('/checkout')}>Checkout <Icon name="arrow" size={18} /></button>
            <Link to="/shop" className="text-link">Continue shopping</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
