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
  const [loadError, setLoadError] = useState(null);
  const [failedUser, setFailedUser] = useState(null);
  const [seen, setSeen] = useState(() => storage.get(SEEN_KEY, {}));
  const ordersRef = useRef([]);
  const userRef = useRef(user);
  userRef.current = user;
  const currentOrders = loadedUser === user ? orders : null;
  ordersRef.current = currentOrders ?? [];

  const refresh = useCallback(async () => {
    if (!user) {
      setOrders(null);
      setLoadedUser(null);
      setLoadError(null);
      setFailedUser(null);
      return;
    }
    try {
      const nextOrders = (await accountApi.listOrders()).orders;
      if (userRef.current !== user) return;
      setOrders(nextOrders);
      setLoadedUser(user);
      setLoadError(null);
      setFailedUser(null);
    } catch (error) {
      if (userRef.current !== user) return;
      setLoadError(error);
      setFailedUser(user);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const isUpdated = useCallback((order) => (seen[order.orderNumber] ?? -1) < order.step, [seen]);
  const status = !user ? 'idle' : currentOrders !== null ? 'ready' : failedUser === user ? 'error' : 'loading';
  const error = failedUser === user ? loadError : null;
  const markSeen = useCallback(() => setSeen((previous) => {
    const next = { ...previous, ...Object.fromEntries(ordersRef.current.map((o) => [o.orderNumber, o.step])) };
    storage.set(SEEN_KEY, next);
    return next;
  }), []);

  const value = useMemo(
    () => ({ orders: currentOrders, status, error, refresh, markSeen, isUpdated, unseenCount: (currentOrders ?? []).filter(isUpdated).length }),
    [currentOrders, status, error, refresh, markSeen, isUpdated],
  );
  return <OrderAlertsContext.Provider value={value}>{children}</OrderAlertsContext.Provider>;
}
