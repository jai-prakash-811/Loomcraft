import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';
import { ProductList } from '../components/ProductCard.jsx';
import { useStore } from '../store.jsx';
import { artUrl, money } from '../lib.js';

const crafts = [
  { place: 'Bagru, Rajasthan', craft: 'Block printing', note: 'Hand-carved wooden blocks and natural dyes, stamped onto cotton one repeat at a time.' },
  { place: 'Pochampally, Telangana', craft: 'Double ikat', note: 'Yarn is resist-dyed before weaving, so the pattern is built into the cloth itself.' },
  { place: 'Bastar, Chhattisgarh', craft: 'Dhokra casting', note: 'An ancient lost-wax technique: every piece is cast from its own clay mould.' },
  { place: 'Mithila, Bihar', craft: 'Mithila painting', note: 'Fine line work and bold colour, passed between generations of artists.' }
];

export default function Home() {
  const { config } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.products('?limit=4&sort=featured')
      .then((result) => setProducts(result.products))
      .catch((problem) => setError(problem.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <section className="shell hero">
        <div className="hero-copy">
          <p className="eyebrow">Handmade, from the source</p>
          <h1>Made slowly,<br /><em>made by hand.</em></h1>
          <p className="lead">Textiles, homeware and everyday objects from India's craft clusters, chosen for how they feel, how long they last and who made them.</p>
          <div className="hero-actions">
            <Link to="/shop" className="button">Shop the collection <Icon name="arrow" size={18} /></Link>
            <Link to="/#crafts" className="text-link">Meet the crafts</Link>
          </div>
        </div>
        <div className="hero-art">
          <img src={artUrl('Loomcraft', 'Handmade in India')} alt="Block-print inspired Loomcraft artwork" />
        </div>
      </section>

      <section className="values">
        <div className="shell values-grid">
          <span><Icon name="hand" /> Made by hand</span>
          <span><Icon name="truck" /> Free shipping over {money(config.freeShippingThreshold)}</span>
          <span><Icon name="refresh" /> 30-day returns</span>
          <span><Icon name="lock" /> Pay on delivery</span>
        </div>
      </section>

      <section className="shell section">
        <div className="section-head">
          <div><p className="eyebrow">Featured</p><h2>This season's finds</h2></div>
          <Link to="/shop" className="text-link">See everything <Icon name="arrow" size={16} /></Link>
        </div>
        <ProductList products={products} loading={loading} error={error} empty="Pieces are on their way. Please check back soon." />
      </section>

      <section className="crafts" id="crafts">
        <div className="shell">
          <p className="eyebrow">The crafts</p>
          <h2>Where each piece begins</h2>
          <div className="craft-grid">
            {crafts.map((item) => (
              <article key={item.craft} className="craft-card">
                <span className="craft-place"><Icon name="pin" size={14} /> {item.place}</span>
                <h3>{item.craft}</h3>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
