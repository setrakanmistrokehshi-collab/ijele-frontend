import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { checkoutApi } from '../services/api.js';
import { toUserMessage } from '../services/httpClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { useFormValidation } from '../hooks/useFormValidation.js';
import Field from '../components/Field.jsx';
import { CHECKOUT_ATTEMPT_KEY, CHECKOUT_DRAFT_KEY, sessionDraft } from '../utils/storage.js';
import { line, phone as phoneRule } from '../utils/validation.js';
import { formatMoney } from '../utils/money.js';
import { USD_EXCHANGE_RATES, shippingFee, countriesFromZones, freeShippingFromUsd } from '../utils/shipping.js';
import { useZones } from '../hooks/useZones.js';
import { DELIVERY } from '../content/business.js';

// Mirrors the server's checkout rules; address.name is "first last" and the server allows 120 characters in total.
const SPEC = {
  phone: phoneRule(), firstName: line('First name', { max: 58 }), lastName: line('Last name', { max: 58 }),
  line1: line('Street address', { max: 200 }), city: line('City', { max: 100 }), postal: line('Postal code', { max: 20 }),
};
const EMPTY_FORM = { phone: '', firstName: '', lastName: '', line1: '', city: '', postal: '', country: 'Nigeria', state: '', method: 'standard' };

/** Only ever navigate to the payment provider's own https domain. */
function redirectToPayment(url) {
  const { protocol, hostname } = new URL(url);
  if (protocol !== 'https:' || !hostname.endsWith('.bachs.io')) throw new Error('Unexpected payment address');
  window.location.assign(url);
}

export default function CheckoutPage() {
  useSeo({ title: 'Checkout', path: '/checkout', noindex: true });
  const { items, subtotal } = useCart();
  const { currency } = useSettings();
  const { user, loading: authLoading } = useAuth();
  // The form is kept for the life of the tab, so a reload, a dropped connection or a cancelled payment brings the
  // customer back to what they had typed. It is cleared once the order is paid (see OrdersPage).
  const [form, setForm] = useState(() => {
    const draft = sessionDraft.get(CHECKOUT_DRAFT_KEY, {});
    delete draft.email;
    return { ...EMPTY_FORM, ...draft };
  });
  useEffect(() => sessionDraft.set(CHECKOUT_DRAFT_KEY, form), [form]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { errors, clear, blur, validate } = useFormValidation(SPEC);
  const zones = useZones();
  const attemptRef = useRef(sessionDraft.get(CHECKOUT_ATTEMPT_KEY, { basket: '', key: '' }));

  if (items.length === 0) return <div className="wrap sec"><h1 className="pg">Your bag is empty</h1><Link className="cta" to="/">Continue shopping</Link></div>;
  if (authLoading) return <div className="wrap sec"><h1 className="pg">Checkout</h1><p role="status">Checking your sign-in…</p></div>;
  if (!user) {
    return (
      <div className="wrap sec">
        <h1 className="pg">Sign in to continue</h1>
        <p className="lede">Sign in with Google before checkout so your order is securely linked to your account and available in My orders.</p>
        <GoogleSignInButton required />
      </div>
    );
  }

  const email = user.email;
  const fee = shippingFee(zones, form.country, form.state, form.city, form.method, currency, subtotal);
  const freeFromUsd = freeShippingFromUsd(zones);
  const countries = countriesFromZones(zones).length > 0 ? countriesFromZones(zones) : ['Nigeria'];
  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  // One random key per customer and basket. If a request is retried (a slow network, a second tap), the server
  // returns the same payment page instead of creating a second order. A changed basket or account gets a fresh key.
  // The key is also kept for the tab: if the connection drops AFTER the server created the order, reloading and
  // pressing Pay again returns the same payment page instead of making a second order.
  function idempotencyKeyFor(basket) {
    const serialised = JSON.stringify({ basket, customerEmail: user.email });
    if (attemptRef.current.basket !== serialised) {
      attemptRef.current = { basket: serialised, key: crypto.randomUUID() };
      sessionDraft.set(CHECKOUT_ATTEMPT_KEY, attemptRef.current);
    }
    return attemptRef.current.key;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const { ok, values } = validate(form, event.currentTarget);
    if (!ok) return; // nothing invalid ever reaches the server
    setIsSubmitting(true);
    setError('');
    try {
      const basket = {
        currency,
        items: items.map(({ sku, quantity }) => ({ sku, qty: quantity })), // never prices: the server looks those up
        phone: values.phone,
        address: { name: `${values.firstName} ${values.lastName}`, line1: values.line1, city: values.city, postal: values.postal },
        shipping: { country: form.country, state: form.state, city: form.city, method: form.method === 'express' ? 'exp' : 'std' },
      };
      const { url } = await checkoutApi.createSession(basket, idempotencyKeyFor(basket));
      redirectToPayment(url);
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsSubmitting(false);
    }
  }

  const field = (name, label, props = {}) => (
    <Field name={name} value={name === 'email' ? email : form[name]} onChange={handleChange} onValueChange={clear} onValueBlur={blur} error={errors[name]} required label={label} {...props} />
  );

  return (
    <div className="wrap sec">
      <h1 className="pg">Checkout</h1>
      <form className="co" onSubmit={handleSubmit} noValidate>
        <div className="body">
          <fieldset><legend>Contact</legend><div className="stack">
            <Field name="email" type="email" label="Google account email" autoComplete="email" value={email} readOnly />
            {field('phone', 'Phone number', { type: 'tel', autoComplete: 'tel', minLength: 7, maxLength: 20 })}
          </div></fieldset>
          <fieldset><legend>Delivery address</legend><div className="stack">
            <div className="two">{field('firstName', 'First name', { autoComplete: 'given-name' })}{field('lastName', 'Last name', { autoComplete: 'family-name' })}</div>
            {field('line1', 'Street address', { autoComplete: 'street-address' })}
            <div className="two">{field('city', 'City', { autoComplete: 'address-level2' })}{field('postal', 'Postal code', { autoComplete: 'postal-code' })}</div>
            <div className="fld">
              <label htmlFor="country">Country</label>
              <select id="country" className="f" name="country" value={form.country} onChange={handleChange}>
                {countries.map((country) => <option key={country}>{country}</option>)}
              </select>
            </div>
            <Field name="state" value={form.state} onChange={handleChange} onValueChange={clear} autoComplete="address-level1" label="State or province (optional)" />
          </div></fieldset>
          <fieldset><legend>Delivery method</legend><div className="stack">
            {[['standard', `Standard delivery${DELIVERY.standard ? `, ${DELIVERY.standard}` : ''}`], ['express', `Express delivery${DELIVERY.express ? `, ${DELIVERY.express}` : ''}`]].map(([method, label]) => {
              const cost = shippingFee(zones, form.country, form.state, form.city, method, currency, subtotal);
              return (
                <label key={method} className="opt">
                  <input type="radio" name="method" value={method} checked={form.method === method} onChange={handleChange} />
                  {label}<b>{cost ? formatMoney(cost, currency) : 'Free'}</b>
                </label>
              );
            })}
          </div><p className="note">The fee depends on your city, state and country.{freeFromUsd ? ` Standard delivery is free on orders over ${formatMoney(Math.round(freeFromUsd * (USD_EXCHANGE_RATES[currency] ?? 1)), currency)}.` : ''}</p></fieldset>
          <p className="note">You pay on Bachs’s hosted checkout page. Card details are entered there, not on this site.</p>
          {error && <p role="alert" className="field-error">{error}</p>}
        </div>
        <div className="sum">
          <h2>Order summary</h2>
          <ul>
            {items.map((item) => (
              <li key={item.sku}><span>{item.name} × {item.quantity}</span><span>{formatMoney(item.prices[currency] * item.quantity, currency)}</span></li>
            ))}
            {items.filter((item) => item.giftName).map((item) => <li key={`gift-${item.sku}`} className="note"><span>+ {item.giftName}</span><span>Free</span></li>)}
          </ul>
          <div className="row"><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
          <div className="row"><span>Shipping</span><span>{fee ? formatMoney(fee, currency) : 'Free'}</span></div>
          <div className="row total"><span>Total</span><span>{formatMoney(subtotal + fee, currency)}</span></div>
          <button className="cta" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Preparing payment…' : 'Continue to payment'}</button>
        </div>
      </form>
    </div>
  );
}
