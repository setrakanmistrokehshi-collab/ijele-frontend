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
  const [loadedUser, setLoadedUser] = useState(null);
  const [seen, setSeen] = useState(() => storage.get(SEEN_KEY, {}));
  const ordersRef = useRef([]);
  const userRef = useRef(user);
  userRef.current = user;
  const currentOrders = loadedUser === user ? orders : null;
  ordersRef.current = currentOrders ?? [];

  const refresh = useCallback(async () => {
    if (!user) { setOrders(null); setLoadedUser(null); return; }
    try {
      const nextOrders = (await accountApi.listOrders()).orders;
      if (userRef.current !== user) return;
      setOrders(nextOrders);
      setLoadedUser(user);
    } catch { /* keep the last known list for this signed-in user */ }
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
    () => ({ orders: currentOrders, refresh, markSeen, isUpdated, unseenCount: (currentOrders ?? []).filter(isUpdated).length }),
    [currentOrders, refresh, markSeen, isUpdated],
  );
  return <OrderAlertsContext.Provider value={value}>{children}</OrderAlertsContext.Provider>;
}
