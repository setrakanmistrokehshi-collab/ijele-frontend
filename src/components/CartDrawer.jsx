import { useEffect } from 'react';
import { Gift, Minus, Plus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { formatMoney } from '../utils/money.js';
import ProductImage from './ProductImage.jsx';

export default function CartDrawer() {
  const { items, isOpen, closeCart, setQuantity, removeItem, subtotal } = useCart();
  const { currency } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && closeCart();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [closeCart]);

  const goToCheckout = () => { closeCart(); navigate('/checkout'); };

  return (
    <>
      <div className={`scrim${isOpen ? ' on' : ''}`} onClick={closeCart} />
      <aside className={`drawer${isOpen ? ' on' : ''}`} aria-label="Shopping bag" inert={!isOpen}>
        <div className="dh"><h2>Your bag</h2><button type="button" aria-label="Close bag" onClick={closeCart}><X /></button></div>
        <ul>
          {items.length === 0 && <li><p>Your bag is empty. <Link className="textlink" to="/" onClick={closeCart}>Browse the collection</Link></p></li>}
          {items.map((item) => (
            <li key={item.sku}>
              <div className="thumb"><ProductImage product={{ name: item.name, images: [item.image] }} size={160} /></div>
              <div>
                <h3>{item.name}</h3>
                <p>{formatMoney(item.prices[currency], currency)}</p>
                {item.giftName && <p className="gift"><Gift />+ {item.giftName} (free)</p>}
                <div className="qty">
                  <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => setQuantity(item.sku, item.quantity - 1)}><Minus /></button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label={`Increase ${item.name}`} onClick={() => setQuantity(item.sku, item.quantity + 1)}><Plus /></button>
                  <button type="button" className="link" onClick={() => removeItem(item.sku)}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="row"><span>Subtotal</span><strong className="price">{formatMoney(subtotal, currency)}</strong></div>
        <p className="note">Shipping and taxes are shown at checkout.</p>
        <button className="cta" type="button" disabled={items.length === 0} onClick={goToCheckout}>Go to checkout</button>
      </aside>
    </>
  );
}
