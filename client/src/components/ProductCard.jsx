import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useStore } from '../store.jsx';
import { imageFallback, money } from '../lib.js';

export function ProductImage({ product, ...props }) {
  return (
    <img src={product.image || imageFallback} alt={product.name} loading="lazy"
      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = imageFallback; }} {...props} />
  );
}

export function ProductCard({ product }) {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const saved = wishlist.some((item) => item._id === product._id);
  const soldOut = product.stock <= 0;
  return (
    <article className="product-card">
      <div className="product-photo">
        <Link to={`/product/${product._id}`} aria-label={product.name}><ProductImage product={product} /></Link>
        {soldOut ? <span className="badge sold-out">Sold out</span> : product.badge && <span className="badge">{product.badge}</span>}
        <button className={`heart ${saved ? 'saved' : ''}`} aria-label={saved ? 'Remove from favourites' : 'Add to favourites'}
          onClick={() => toggleWishlist(product._id)}><Icon name="heart" size={18} filled={saved} /></button>
        <button className="quick-add" disabled={soldOut} onClick={() => addToCart(product)}>
          {soldOut ? 'Sold out' : 'Add to bag'}
        </button>
      </div>
      <div className="product-info">
        <div className="product-meta"><span>{product.category}</span><span className="rating"><Icon name="star" size={13} filled /> {Number(product.rating).toFixed(1)}</span></div>
        <Link to={`/product/${product._id}`} className="product-name">{product.name}</Link>
        {product.origin && <p className="origin"><Icon name="pin" size={13} /> {product.origin}</p>}
        <strong>{money(product.price)}</strong>
      </div>
    </article>
  );
}

export function ProductList({ products, loading, error, empty = 'No pieces matched. Try a different search.' }) {
  if (loading) return <div className="state-message">Unrolling the collection…</div>;
  if (error) return <div className="state-message error-state">{error}</div>;
  if (!products.length) return <div className="state-message">{empty}</div>;
  return <div className="product-grid">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div>;
}
