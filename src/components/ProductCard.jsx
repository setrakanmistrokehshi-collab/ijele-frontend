import { Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { formatMoney } from '../utils/money.js';
import ProductCarousel from './ProductCarousel.jsx';

/** One catalogue entry. The SKU doubles as the catalogue number. */
export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { currency } = useSettings();
  const path = `/product/${product.sku}`;

  return (
    <article className="card">
      <ProductCarousel product={product} to={path}>
        {!product.inStock && <span className="badge">Sold out</span>}
      </ProductCarousel>
      <div className="meta">
        <span className="ref">{product.sku} · {product.category}</span>
        <h3 className="name"><Link to={path}>{product.name}</Link></h3>
        <p className="price">{formatMoney(product.prices[currency], currency)}</p>
        {product.freeGift.enabled && <p className="gift"><Gift />Free gift: {product.freeGift.name}</p>}
        <div className="actions">
          <button className="cta quiet" type="button" disabled={!product.inStock} onClick={() => addItem(product)}>
            {product.inStock ? <>Add to bag<span className="vh">, {product.name}</span></> : 'Sold out'}
          </button>
        </div>
      </div>
    </article>
  );
}
