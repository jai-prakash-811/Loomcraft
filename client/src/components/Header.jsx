import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useStore } from '../store.jsx';
import { money } from '../lib.js';

export default function Header() {
  const { user, cart, signOut, config } = useStore();
  const [open, setOpen] = useState(false);
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const close = () => setOpen(false);

  return (
    <>
      <div className="announce">Free shipping over {money(config.freeShippingThreshold)} · Every piece made by hand</div>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" to="/" onClick={close}><span className="brand-mark" aria-hidden="true" />Loomcraft</Link>
          <nav className="main-nav" aria-label="Main">
            <NavLink to="/shop" end>Shop</NavLink>
            <Link to="/shop?category=Home%20%26%20Living">Home &amp; Living</Link>
            <Link to="/#crafts">The crafts</Link>
            {user && <NavLink to="/orders">My orders</NavLink>}
          </nav>
          <div className="header-actions">
            <Link className="icon-btn" to="/wishlist" aria-label="Favourites"><Icon name="heart" /></Link>
            {user?.role === 'admin' && <Link className="pill-link" to="/admin">Studio</Link>}
            {user
              ? <button className="pill-link" onClick={signOut}>Hi, {user.name.split(' ')[0]} <Icon name="logout" size={16} /></button>
              : <Link className="pill-link" to="/login">Sign in</Link>}
            <Link className="bag-link" to="/cart" aria-label={`Bag, ${count} items`}><Icon name="bag" /><span>{count}</span></Link>
            <button className="icon-btn mobile-only" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <Icon name={open ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
        {open && (
          <nav className="mobile-menu" aria-label="Mobile">
            <Link to="/shop" onClick={close}>Shop all</Link>
            <Link to="/shop?category=Home%20%26%20Living" onClick={close}>Home &amp; Living</Link>
            <Link to="/#crafts" onClick={close}>The crafts</Link>
            <Link to="/wishlist" onClick={close}>Favourites</Link>
            {user && <Link to="/orders" onClick={close}>My orders</Link>}
            {user?.role === 'admin' && <Link to="/admin" onClick={close}>Studio</Link>}
            {user ? <button onClick={() => { signOut(); close(); }}>Sign out</button> : <Link to="/login" onClick={close}>Sign in</Link>}
          </nav>
        )}
      </header>
    </>
  );
}
