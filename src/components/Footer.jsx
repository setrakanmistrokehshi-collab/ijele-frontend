import { Link } from 'react-router-dom';
import { BUSINESS } from '../content/business.js';

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <span className="logo">{BUSINESS.name}<small>{BUSINESS.descriptor.toUpperCase()}</small></span>
            <p>Watches, chains and necklaces. Prices in USD, NGN, EUR and GBP; payment on Bachs&rsquo;s hosted checkout page.</p>
          </div>
          <nav aria-label="Shop">
            <h2>Shop</h2>
            <ul>
              <li><Link to="/?category=Watch">Watches</Link></li>
              <li><Link to="/?category=Chain">Chains</Link></li>
              <li><Link to="/?category=Necklace">Necklaces</Link></li>
            </ul>
          </nav>
          <nav aria-label="Your order">
            <h2>Your order</h2>
            <ul>
              <li><Link to="/track">Track an order</Link></li>
              <li><Link to="/orders">My orders</Link></li>
            </ul>
          </nav>
          <div>
            <h2>Help</h2>
            <ul>
              <li><Link to="/contact">Contact us</Link></li>
              {BUSINESS.email && <li><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></li>}
              {BUSINESS.phone && <li><a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}>{BUSINESS.phone}</a></li>}
            </ul>
          </div>
        </div>
        <p className="legal">&copy; {new Date().getFullYear()} {BUSINESS.name} {BUSINESS.descriptor}.</p>
      </div>
    </footer>
  );
}
