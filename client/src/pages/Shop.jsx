import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { ProductList } from '../components/ProductCard.jsx';
import { qs } from '../lib.js';

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const urlSearch = params.get('search') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'featured';

  const [searchText, setSearchText] = useState(urlSearch);
  const [data, setData] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const setParam = (key, value) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  }, { replace: true });

  useEffect(() => { setSearchText(urlSearch); }, [urlSearch]);

  // Debounce typing so the API is not queried on every keystroke.
  useEffect(() => {
    if (searchText.trim() === urlSearch) return undefined;
    const timer = setTimeout(() => setParam('search', searchText.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.products(qs({ search: urlSearch, category, sort }))
      .then((result) => { if (!cancelled) setData(result); })
      .catch((problem) => { if (!cancelled) setError(problem.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [urlSearch, category, sort]);

  return (
    <main className="shell page">
      <div className="page-intro">
        <p className="eyebrow">The collection</p>
        <h1>Everything, handmade</h1>
      </div>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Categories">
          <button className={!category ? 'chip active' : 'chip'} onClick={() => setParam('category', '')}>All</button>
          {data.categories.map((item) => (
            <button key={item} className={category === item ? 'chip active' : 'chip'} onClick={() => setParam('category', item)}>{item}</button>
          ))}
        </div>
        <div className="filters">
          <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search pieces or places" aria-label="Search products" />
          <select value={sort} onChange={(event) => setParam('sort', event.target.value)} aria-label="Sort products">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating">Top rated</option>
          </select>
        </div>
      </div>
      {!loading && !error && <p className="result-count">{data.products.length} {data.products.length === 1 ? 'piece' : 'pieces'}</p>}
      <ProductList products={data.products} loading={loading} error={error} />
    </main>
  );
}
