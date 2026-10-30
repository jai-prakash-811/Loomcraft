import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link className="brand footer-brand" to="/"><span className="brand-mark" aria-hidden="true" />Loomcraft</Link>
          <p>Handmade textiles, homeware and accessories, bought as close to the maker as we can get.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <Link to="/shop">All pieces</Link>
          <Link to="/wishlist">Favourites</Link>
          <Link to="/orders">Track an order</Link>
        </div>
        <div>
          <h3>Say hello</h3>
          <a href="mailto:hello@loomcraft.example">hello@loomcraft.example</a>
          <p>Mon–Sat, 10am–6pm IST</p>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} Loomcraft</span>
        <span>Payment: cash on delivery</span>
      </div>
    </footer>
  );
}
