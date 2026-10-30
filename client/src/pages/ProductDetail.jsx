import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';
import { ProductImage } from '../components/ProductCard.jsx';
import { useStore } from '../store.jsx';
import { money } from '../lib.js';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart, toggleWishlist, wishlist, maxFor, config } = useStore();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setProduct(null);
    setError('');
    setQuantity(1);
    api.product(id)
      .then((result) => { if (!cancelled) setProduct(result); })
      .catch((problem) => { if (!cancelled) setError(problem.message); });
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return <main className="shell state-message error-state">{error}<p><Link to="/shop" className="text-link">Back to the collection</Link></p></main>;
  }
  if (!product) return <main className="shell state-message">Finding the details…</main>;

  const saved = wishlist.some((item) => item._id === product._id);
  const max = Math.max(1, maxFor(product));
  const soldOut = product.stock <= 0;

  return (
    <main className="shell page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / {product.name}</nav>
      <div className="detail-grid">
        <div className="detail-image"><ProductImage product={product} loading="eager" /></div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          {product.origin && <p className="origin"><Icon name="pin" size={15} /> Made in {product.origin}</p>}
          <div className="detail-price">{money(product.price)} <span className="rating"><Icon name="star" size={14} filled /> {Number(product.rating).toFixed(1)}</span></div>
          <p className="detail-description">{product.description}</p>
          <p className={soldOut ? 'stock-note out' : 'stock-note'}>
            <Icon name={soldOut ? 'close' : 'check'} size={16} />
            {soldOut ? 'Currently sold out' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
          </p>
          <div className="purchase-row">
            <div className="quantity" aria-label="Quantity">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={soldOut}>−</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(max, q + 1))} aria-label="Increase quantity" disabled={soldOut}>+</button>
            </div>
            <button className="button" disabled={soldOut} onClick={() => addToCart(product, quantity)}>Add to bag · {money(product.price * quantity)}</button>
          </div>
          <button className={saved ? 'text-btn saved' : 'text-btn'} onClick={() => toggleWishlist(product._id)}>
            <Icon name="heart" size={17} filled={saved} /> {saved ? 'Saved to favourites' : 'Save to favourites'}
          </button>
          <ul className="perks">
            <li><Icon name="truck" size={17} /> Free shipping over {money(config.freeShippingThreshold)}</li>
            <li><Icon name="refresh" size={17} /> 30-day returns</li>
            <li><Icon name="hand" size={17} /> Handmade, so small variations are part of the charm</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
