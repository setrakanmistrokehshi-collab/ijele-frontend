import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Mail, MapPin, Menu, Moon, Package, ShoppingBag, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useOrderAlerts } from '../context/OrderAlertsContext.jsx';
import { useZones } from '../hooks/useZones.js';
import { BUSINESS } from '../content/business.js';
import { CURRENCIES, formatMoney } from '../utils/money.js';
import { USD_EXCHANGE_RATES, freeShippingFromUsd } from '../utils/shipping.js';
import GoogleSignInButton from './GoogleSignInButton.jsx';
import PushToggle from './PushToggle.jsx';

const MAIN_LINKS = [
  { to: '/?category=Watch', label: 'Watches' },
  { to: '/?category=Chain', label: 'Chains' },
  { to: '/?category=Necklace', label: 'Necklaces' },
];

export default function Header() {
  const { count, openCart } = useCart();
  const { currency, setCurrency, theme, toggleTheme } = useSettings();
  const { user, signOut } = useAuth();
  const { unseenCount } = useOrderAlerts();
  const zones = useZones();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Only says "free delivery" when every shipping zone really offers it, using the threshold you set in the admin.
  const freeFromUsd = freeShippingFromUsd(zones);

  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && closeMenu();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const currencySelect = (
    <select className="cur" value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label="Currency">
      {CURRENCIES.map((code) => <option key={code}>{code}</option>)}
    </select>
  );

  return (
    <>
      {freeFromUsd && <div className="top">Free standard delivery on orders over {formatMoney(Math.round(freeFromUsd * (USD_EXCHANGE_RATES[currency] ?? 1)), currency)}</div>}
      <header className="main">
        <div className="wrap">
          <Link className="logo" to="/">{BUSINESS.name}<small>{BUSINESS.descriptor.toUpperCase()}</small></Link>
          <nav className="links" aria-label="Primary">
            {MAIN_LINKS.map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}
          </nav>
          <div className="icons">
            {currencySelect}
            <button type="button" aria-label={count > 0 ? `Open bag, ${count} ${count === 1 ? 'item' : 'items'}` : 'Open bag'} onClick={openCart}>
              <ShoppingBag />{count > 0 && <span className="count" aria-hidden="true">{count}</span>}
            </button>
            <button type="button" className="burger" aria-label={unseenCount ? `Open menu, ${unseenCount} order update to check` : 'Open menu'} onClick={() => setMenuOpen(true)}>
              <Menu />{unseenCount > 0 && <span id="mdot"><span className="dot" /></span>}
            </button>
          </div>
        </div>
      </header>

      <div className={`scrim${menuOpen ? ' on' : ''}`} onClick={closeMenu} />
      <aside className={`drawer mm${menuOpen ? ' on' : ''}`} aria-label="Menu" inert={!menuOpen}>
        <div className="dh"><span className="logo">{BUSINESS.name}</span><button type="button" aria-label="Close menu" onClick={closeMenu}><X /></button></div>
        <nav className="mnav" aria-label="Mobile">
          {MAIN_LINKS.map((link) => <Link key={link.to} to={link.to} onClick={closeMenu}>{link.label}</Link>)}
          <Link className="mi" to="/orders" onClick={closeMenu}><Package />My orders{unseenCount > 0 && <span className="pill-alert">{unseenCount} update{unseenCount > 1 ? 's' : ''}</span>}</Link>
          <Link className="mi" to="/track" onClick={closeMenu}><MapPin />Track an order</Link>
          <Link className="mi" to="/contact" onClick={closeMenu}><Mail />Contact</Link>
          <PushToggle />
          <button type="button" className="mi" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun /> : <Moon />}<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <label className="mi"><Coins />Currency {currencySelect}</label>
          {user
            ? <button type="button" className="mi" onClick={signOut}>Signed in as {user.name} · Sign out</button>
            : <div className="mi"><GoogleSignInButton /></div>}
        </nav>
      </aside>
    </>
  );
}
