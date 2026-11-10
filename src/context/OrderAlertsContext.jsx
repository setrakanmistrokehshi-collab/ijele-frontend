import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { accountApi } from '../services/api.js';
import { storage } from '../utils/storage.js';
import { useAuth } from './AuthContext.jsx';

const SEEN_KEY = 'seenOrderSteps'; // { orderNumber: lastSeenStep } - no personal data
const REFRESH_MS = 60_000;

const OrderAlertsContext = createContext(null);
export const useOrderAlerts = () => useContext(OrderAlertsContext);

/** Loads a signed-in customer's orders and tells the UI how many changed since they last looked. */
export function OrderAlertsProvider({ children }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [seen, setSeen] = useState(() => storage.get(SEEN_KEY, {}));
  const ordersRef = useRef([]);
  ordersRef.current = orders ?? [];

  const refresh = useCallback(async () => {
    if (!user?.trusted) { setOrders(null); return; }
    try { setOrders((await accountApi.listOrders()).orders); } catch { /* keep the last known list */ }
  }, [user]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const isUpdated = useCallback((order) => (seen[order.orderNumber] ?? -1) < order.step, [seen]);
  const markSeen = useCallback(() => setSeen((previous) => {
    const next = { ...previous, ...Object.fromEntries(ordersRef.current.map((o) => [o.orderNumber, o.step])) };
    storage.set(SEEN_KEY, next);
    return next;
  }), []);

  const value = useMemo(
    () => ({ orders, refresh, markSeen, isUpdated, unseenCount: (orders ?? []).filter(isUpdated).length }),
    [orders, refresh, markSeen, isUpdated],
  );
  return <OrderAlertsContext.Provider value={value}>{children}</OrderAlertsContext.Provider>;
}
