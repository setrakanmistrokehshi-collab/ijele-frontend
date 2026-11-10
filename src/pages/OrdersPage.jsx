import { useEffect, useState } from 'react';
import { ordersApi } from '../services/api.js';
import { toUserMessage } from '../services/httpClient.js';
import OrderCard from '../components/OrderCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrderAlerts } from '../context/OrderAlertsContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { linkPushIdentity } from '../services/pushNotifications.js';
import { useFormValidation } from '../hooks/useFormValidation.js';
import Field from '../components/Field.jsx';
import { CHECKOUT_ATTEMPT_KEY, CHECKOUT_DRAFT_KEY, sessionDraft } from '../utils/storage.js';
import { email, orderNumber } from '../utils/validation.js';

const SPEC = { email, orderNumber };

export default function OrdersPage({ justPaid = false }) {
  useSeo({ title: 'My orders', path: '/orders', noindex: true });
  const { user } = useAuth();
  const { orders: accountOrders, refresh, markSeen, isUpdated } = useOrderAlerts();
  const [guestOrders, setGuestOrders] = useState(null);
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState({ email: '', orderNumber: '' });
  const [busy, setBusy] = useState(false);
  const { errors, clear, blur, validate } = useFormValidation(SPEC);

  const orders = user?.trusted ? accountOrders : guestOrders;
  const showLookupForm = !user?.trusted && !guestOrders;

  useEffect(() => {
    if (!justPaid) return;
    refresh();
    // The order is paid, so the saved checkout details are no longer needed.
    sessionDraft.remove(CHECKOUT_DRAFT_KEY);
    sessionDraft.remove(CHECKOUT_ATTEMPT_KEY);
  }, [justPaid, refresh]);
  useEffect(() => markSeen, [markSeen]); // leaving the page counts as "seen": the alert dot clears

  async function handleLookup(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const { ok, values } = validate(lookup, event.currentTarget);
    if (!ok) return;
    setBusy(true);
    try {
      const result = await ordersApi.listForGuest(values);
      linkPushIdentity(result.pushId);
      setGuestOrders(result.orders);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap sec">
      <h1 className="pg">{justPaid ? 'Thank you for your order' : 'My orders'}</h1>
      <p className="lede">{justPaid ? 'Your payment is being confirmed. Your order appears below once it is.' : 'Every piece you’ve ordered, with live shipping status.'}</p>
      {showLookupForm && (
        <form className="stack" onSubmit={handleLookup} noValidate style={{ maxWidth: 460 }}>
          <Field name="email" type="email" required maxLength={254} label="Email used at checkout" autoComplete="email" value={lookup.email} error={errors.email} onChange={(e) => setLookup({ ...lookup, email: e.target.value })} onValueChange={clear} onValueBlur={blur} />
          <Field name="orderNumber" required maxLength={12} label="Any order number" placeholder="AUR-1234567" autoCapitalize="characters" value={lookup.orderNumber} error={errors.orderNumber} onChange={(e) => setLookup({ ...lookup, orderNumber: e.target.value })} onValueChange={clear} onValueBlur={blur} />
          <button className="cta" type="submit" disabled={busy}>{busy ? 'Checking…' : 'View my orders'}</button>
        </form>
      )}
      {error && <p role="alert" className="field-error">{error}</p>}
      {orders?.length === 0 && <p className="note">No paid orders yet.</p>}
      {orders?.map((order) => <OrderCard key={order.orderNumber} order={order} isUpdated={user?.trusted && isUpdated(order)} />)}
    </div>
  );
}
