import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { catalogApi } from '../services/api.js';
import ProductGallery from '../components/ProductGallery.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { useSeo } from '../hooks/useSeo.js';
import { formatMoney } from '../utils/money.js';
import { productSeo } from '../utils/seo.js';
import { POLICIES } from '../content/business.js';
import NotFoundPage from './NotFoundPage.jsx';

// Policy lines appear only when the owner has filled them in (src/content/business.js).
const POLICY_TITLES = [['returns', 'Returns'], ['authenticity', 'Authenticity'], ['insurance', 'Insurance'], ['warranty', 'Warranty']];

export default function ProductPage() {
  const { sku } = useParams();
  const navigate = useNavigate();
  const { currency } = useSettings();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [chosenId, setChosenId] = useState('');
  const [attempt, setAttempt] = useState(0);
  const { status, data: product, error, notFound } = useRequest(() => catalogApi.get(sku), [sku, attempt]);

  const seo = product ? productSeo(product, window.location.origin) : { title: 'Piece not found', noindex: true };
  useSeo({ ...seo, path: `/product/${sku}` });

  if (notFound) return <NotFoundPage />;
  if (status === 'loading') {
    return (
      <div className="wrap sec" aria-busy="true">
        <p className="vh" role="status">Loading this piece</p>
        <div className="dlg" aria-hidden="true"><div className="skel img" /><div><div className="skel line" /><div className="skel line short" /></div></div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="wrap sec">
        <div className="state" role="alert">
          <h1 className="pg">This piece didn’t load</h1>
          <p>{error}</p>
          <button type="button" className="cta" onClick={() => setAttempt((n) => n + 1)}>Try again</button>{' '}
          <Link className="textlink" to="/">Back to the collection</Link>
        </div>
      </div>
    );
  }

  // A piece with price options is bought with one of them (the first is pre-selected). Without options: one price.
  const options = product.priceOptions ?? [];
  const option = options.length > 0 ? options.find((candidate) => candidate.id === chosenId) ?? options[0] : undefined;
  const unitPrices = option?.prices ?? product.prices;
  const addToBag = () => { for (let i = 0; i < quantity; i += 1) addItem(product, option); };
  const checkoutNow = () => {
    addToBag();
    navigate('/checkout');
  };
  return (
    <div className="wrap sec">
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">The collection</Link> / <Link to={`/?category=${product.category}`}>{product.category}</Link></nav>
      <article className="dlg">
        <div className="art"><ProductGallery product={product} /></div>
        <div className="body">
          <span className="ref">{product.sku} · {product.category}</span>
          <h1 className="pg">{product.name}</h1>
          <p className="price">{formatMoney(unitPrices[currency], currency)}</p>
          {options.length > 0 && (
            <fieldset className="price-options">
              <legend>Choose your price</legend>
              {options.map((candidate) => (
                <label key={candidate.id} className={candidate.id === option.id ? 'on' : undefined}>
                  <input type="radio" name="price-option" checked={candidate.id === option.id} onChange={() => setChosenId(candidate.id)} />
                  <span>{candidate.label}</span><strong>{formatMoney(candidate.prices[currency], currency)}</strong>
                </label>
              ))}
            </fieldset>
          )}
          {product.freeGift.enabled && <p className="gift"><Gift />Free gift: {product.freeGift.name}</p>}
          <section><h2>About this piece</h2><p>{product.description}</p></section>
          <section>
            <h2>Delivery</h2>
            <h3>Cost</h3><p>Choose standard or express at checkout. The fee depends on your city, state and country, and is shown before you pay.</p>
            <h3>Tracking</h3><p>Shipping updates arrive by email and, if enabled, push notification. Carrier and tracking details are included when available.</p>
            {POLICY_TITLES.filter(([key]) => POLICIES[key]).map(([key, title]) => <div key={key}><h3>{title}</h3><p>{POLICIES[key]}</p></div>)}
          </section>
          <div className="buy">
            <div className="qty">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
              <span aria-live="polite" aria-label={`Quantity ${quantity}`}>{quantity}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => Math.min(10, q + 1))}>+</button>
            </div>
            <div className="product-total" aria-live="polite">
              <span>For {quantity} {quantity === 1 ? 'piece' : 'pieces'}</span>
              <strong>{formatMoney(unitPrices[currency] * quantity, currency)}</strong>
            </div>
            <div className="product-actions">
              <button className="cta quiet" type="button" disabled={!product.inStock} onClick={addToBag}>
                {product.inStock ? 'Add to bag' : 'Sold out'}
              </button>
              <button className="cta" type="button" disabled={!product.inStock} onClick={checkoutNow}>
                Checkout
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
