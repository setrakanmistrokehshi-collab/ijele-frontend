import { useState } from 'react';
import { ordersApi } from '../services/api.js';
import { toUserMessage } from '../services/httpClient.js';
import OrderCard from '../components/OrderCard.jsx';
import { linkPushIdentity } from '../services/pushNotifications.js';
import { useSeo } from '../hooks/useSeo.js';
import { useFormValidation } from '../hooks/useFormValidation.js';
import Field from '../components/Field.jsx';
import { email, orderNumber } from '../utils/validation.js';

const SPEC = { orderNumber, email };

export default function TrackPage() {
  useSeo({ title: 'Track your order', path: '/track', noindex: true });
  const [lookup, setLookup] = useState({ orderNumber: '', email: '' });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { errors, clear, blur, validate } = useFormValidation(SPEC);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const { ok, values } = validate(lookup, event.currentTarget);
    if (!ok) return;
    setBusy(true);
    try {
      const result = await ordersApi.track(values);
      linkPushIdentity(result.pushId);
      setOrder(result);
    } catch (caught) {
      setOrder(null);
      setError(toUserMessage(caught).replace('We could not find what you were looking for.', 'We couldn’t find an order matching those details.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap sec">
      <h1 className="pg">Track your order</h1>
      <p className="lede">Enter the order number from your confirmation and the email used at checkout.</p>
      <form className="stack" onSubmit={handleSubmit} noValidate style={{ maxWidth: 460, margin: '1.5rem 0' }}>
        <Field name="orderNumber" required maxLength={12} label="Order number" placeholder="AUR-1234567" autoCapitalize="characters" value={lookup.orderNumber} error={errors.orderNumber} onChange={(e) => setLookup({ ...lookup, orderNumber: e.target.value })} onValueChange={clear} onValueBlur={blur} />
        <Field name="email" type="email" required maxLength={254} label="Email address" autoComplete="email" value={lookup.email} error={errors.email} onChange={(e) => setLookup({ ...lookup, email: e.target.value })} onValueChange={clear} onValueBlur={blur} />
        <button className="cta" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Track order'}</button>
      </form>
      {error && <p role="alert" className="field-error">{error}</p>}
      {order && <OrderCard order={order} />}
    </div>
  );
}
