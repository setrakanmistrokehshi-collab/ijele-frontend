import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogApi } from '../services/api.js';
import HeroSwiper from '../components/HeroSwiper.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { useSeo } from '../hooks/useSeo.js';
import { organizationJsonLd } from '../utils/seo.js';

const CATEGORIES = [
  { key: 'All', label: 'All pieces' },
  { key: 'Watch', label: 'Watches' },
  { key: 'Chain', label: 'Chains' },
  { key: 'Necklace', label: 'Necklaces' },
];
const SORTERS = {
  featured: () => 0,
  priceLow: (currency) => (a, b) => a.prices[currency] - b.prices[currency],
  priceHigh: (currency) => (a, b) => b.prices[currency] - a.prices[currency],
};
const pieces = (n) => `${n} ${n === 1 ? 'piece' : 'pieces'}`;

export default function HomePage() {
  const { currency } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortKey, setSortKey] = useState('featured');
  const [attempt, setAttempt] = useState(0); // bumping this re-runs the request ("Try again")
  const { status, data: products, error } = useRequest(catalogApi.list, [attempt]);

  const requested = searchParams.get('category');
  const category = CATEGORIES.find((entry) => entry.key === requested) ?? CATEGORIES[0];
  useSeo({ title: '', path: '/', jsonLd: organizationJsonLd(window.location.origin) });

  const visibleProducts = useMemo(() => {
    const matches = (products ?? []).filter((product) => category.key === 'All' || product.category === category.key);
    return sortKey === 'featured' ? matches : [...matches].sort(SORTERS[sortKey](currency));
  }, [products, category, sortKey, currency]);

  const showAll = () => setSearchParams({});
  const isLoading = status === 'loading';

  return (
    <>
      <HeroSwiper products={products} currency={currency} />
      <div className="wrap">
        <section className="sec" id="shop" aria-labelledby="shop-title">
          <div className="bar">
            <div>
              <h2 id="shop-title">The collection</h2>
              <p className="lede">Prices shown in {currency}.</p>
            </div>
            <div className="tools" role="group" aria-label="Filter by category">
              {CATEGORIES.map(({ key, label }) => (
                <button key={key} type="button" className="chip" aria-pressed={key === category.key}
                  onClick={() => setSearchParams(key === 'All' ? {} : { category: key })}>{label}</button>
              ))}
            </div>
          </div>

          <div className="sortbar">
            <span className="note" role="status">{isLoading ? 'Loading the collection' : status === 'ready' ? (category.key === 'All' ? pieces(visibleProducts.length) : `${visibleProducts.length} of ${pieces(products.length)}`) : ''}</span>
            <label>Sort by
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                <option value="featured">Featured</option><option value="priceLow">Price, low to high</option><option value="priceHigh">Price, high to low</option>
              </select>
            </label>
          </div>

          {isLoading && (
            <div className="grid" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} aria-hidden="true"><div className="skel img" /><div className="skel line" /><div className="skel line short" /></div>
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="state" role="alert">
              <h3>The collection didn’t load</h3>
              <p>{error}</p>
              <button type="button" className="cta" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
            </div>
          )}

          {status === 'ready' && products.length === 0 && (
            <div className="state">
              <h3>No pieces are listed yet</h3>
              <p>The collection is being prepared. If you have a question in the meantime, send us a message.</p>
              <Link className="cta" to="/contact">Contact us</Link>
            </div>
          )}

          {status === 'ready' && products.length > 0 && visibleProducts.length === 0 && (
            <div className="state">
              <h3>No {category.label.toLowerCase()} right now</h3>
              <p>Nothing in this category is listed at the moment.</p>
              <button type="button" className="cta" onClick={showAll}>Show all pieces</button>
            </div>
          )}

          {visibleProducts.length > 0 && <div className="grid">{visibleProducts.map((product) => <ProductCard key={product.sku} product={product} />)}</div>}
        </section>

        <section className="process" aria-labelledby="process-title">
          <h2 id="process-title">From your screen to your door</h2>
          <ol className="steps">
            <li><div><h3>Choose in your currency</h3><p>Prices show in USD, NGN, EUR or GBP. Change the currency from the header at any time.</p></div></li>
            <li><div><h3>See the delivery fee before you pay</h3><p>The fee depends on your city, state and country, with standard and express options. It is on the checkout page before you commit.</p></div></li>
            <li><div><h3>Pay on Bachs’s hosted page</h3><p>Checkout sends you to Bachs to pay. Payment details are entered there, not on this site.</p></div></li>
            <li><div><h3>Follow it until it arrives</h3><p>When your order ships you receive the carrier and tracking number by email, and by push notification if you allow them. You can also look up any order on the <Link className="textlink" to="/track">Track an order</Link> page.</p></div></li>
          </ol>
        </section>

        <section className="ask" aria-labelledby="ask-title">
          <h2 id="ask-title">Choosing a piece, or checking on an order?</h2>
          <div>
            <Link className="cta" to="/contact">Message us</Link>
            <Link className="cta quiet" to="/track">Track an order</Link>
          </div>
        </section>
      </div>
    </>
  );
}
