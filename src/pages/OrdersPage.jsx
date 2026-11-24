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
const CHECKOUT_STATUS_POLL_WINDOW_MS = 2 * 60 * 1000;
const CHECKOUT_STATUS_POLL_INITIAL_DELAY_MS = 2_000;
const CHECKOUT_ORDER_MAX_AGE_MS = 45 * 60 * 1000;

export default function OrdersPage({ justPaid = false }) {
  useSeo({ title: 'My orders', path: '/orders', noindex: true });
  const { user, loading: authLoading } = useAuth();
  const { orders: accountOrders, status: accountStatus, error: accountError, refresh, markSeen, isUpdated } = useOrderAlerts();
  const [guestOrders, setGuestOrders] = useState(null);
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState({ email: '', orderNumber: '' });
  const [busy, setBusy] = useState(false);
  const { errors, clear, blur, validate } = useFormValidation(SPEC);

  const orders = user ? accountOrders : guestOrders;
  const showLookupForm = !authLoading && !user && !guestOrders;
  const checkoutOrder = justPaid && user
    ? accountOrders?.find((order) => {
      const placedAt = Date.parse(order.placedAt);
      return Number.isFinite(placedAt) && placedAt >= Date.now() - CHECKOUT_ORDER_MAX_AGE_MS;
    })
    : null;
  const checkoutMessage = checkoutOrder?.status === 'paid'
    ? 'Payment confirmed. Your order is shown below.'
    : checkoutOrder?.status === 'review'
      ? 'Your payment is being reviewed. Your order status is shown below.'
      : ['cancelled', 'expired', 'failed'].includes(checkoutOrder?.status)
        ? 'This checkout did not complete. If you were charged, contact us with your order number.'
        : 'Your payment is being confirmed. Your order appears below once Bachs confirms it.';

  useEffect(() => {
    if (!justPaid) return;
    // The order is paid, so the saved checkout details are no longer needed.
    sessionDraft.remove(CHECKOUT_DRAFT_KEY);
    sessionDraft.remove(CHECKOUT_ATTEMPT_KEY);

    let active = true;
    let timer;
    let delay = CHECKOUT_STATUS_POLL_INITIAL_DELAY_MS;
    const startedAt = Date.now();

    async function pollForPaymentStatus() {
      const refreshedOrders = await refresh();
      if (!active || Date.now() - startedAt >= CHECKOUT_STATUS_POLL_WINDOW_MS) return;

      const checkoutOrder = refreshedOrders?.find((order) => {
        const placedAt = Date.parse(order.placedAt);
        return Number.isFinite(placedAt) && placedAt >= startedAt - CHECKOUT_ORDER_MAX_AGE_MS;
      });
      if (checkoutOrder && checkoutOrder.status !== 'pending') return;

      timer = setTimeout(pollForPaymentStatus, delay);
      delay = Math.min(delay * 2, 15_000);
    }

    pollForPaymentStatus();
    return () => {
      active = false;
      clearTimeout(timer);
    };
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
      <p className="lede">{justPaid ? checkoutMessage : 'Every piece you’ve ordered, with live shipping status.'}</p>
      {showLookupForm && (
        <form className="stack" onSubmit={handleLookup} noValidate style={{ maxWidth: 460 }}>
          <Field name="email" type="email" required maxLength={254} label="Email used at checkout" autoComplete="email" value={lookup.email} error={errors.email} onChange={(e) => setLookup({ ...lookup, email: e.target.value })} onValueChange={clear} onValueBlur={blur} />
          <Field name="orderNumber" required maxLength={12} label="Any order number" placeholder="IJL-1234567" autoCapitalize="characters" value={lookup.orderNumber} error={errors.orderNumber} onChange={(e) => setLookup({ ...lookup, orderNumber: e.target.value })} onValueChange={clear} onValueBlur={blur} />
          <button className="cta" type="submit" disabled={busy}>{busy ? 'Checking…' : 'View my orders'}</button>
        </form>
      )}
      {error && <p role="alert" className="field-error">{error}</p>}
      {user && accountStatus === 'loading' && <p className="note" role="status">Loading your order history…</p>}
      {user && accountStatus === 'error' && (
        <div className="state" role="alert">
          <h2>Your orders couldn’t load</h2>
          <p>{toUserMessage(accountError)}</p>
          <button type="button" className="cta" onClick={refresh}>Try again</button>
        </div>
      )}
      {orders?.length === 0 && <p className="note">{user ? 'No orders yet.' : 'No paid orders found for that email.'}</p>}
      {orders?.map((order) => <OrderCard key={order.orderNumber} order={order} isUpdated={user?.trusted && isUpdated(order)} />)}
    </div>
  );
}
