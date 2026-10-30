import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ProductList } from '../components/ProductCard.jsx';
import { useStore } from '../store.jsx';

export default function Wishlist() {
  const { user, authReady, wishlist } = useStore();
  return (
    <main className="shell page">
      <div className="page-intro"><p className="eyebrow">Saved for later</p><h1>Favourites</h1></div>
      {!authReady ? <div className="state-message">Just a moment…</div>
        : !user ? (
          <div className="empty-state"><Icon name="heart" size={42} /><h2>Sign in to see your favourites</h2><p>Saved pieces follow you across devices.</p>
            <Link to="/login" state={{ from: '/wishlist' }} className="button">Sign in</Link></div>
        ) : wishlist.length ? <ProductList products={wishlist} />
          : <div className="empty-state"><Icon name="heart" size={42} /><h2>Nothing saved yet</h2><p>Tap the heart on any piece to keep it here.</p>
            <Link to="/shop" className="button">Explore the collection</Link></div>}
    </main>
  );
}
