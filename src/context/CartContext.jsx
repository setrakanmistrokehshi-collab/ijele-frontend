import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { catalogApi } from '../services/api.js';
import { lineKey, syncWithCatalog, toCartItem } from '../utils/cart.js';
import { storage } from '../utils/storage.js';
import { useSettings } from './SettingsContext.jsx';

const MAX_QUANTITY = 10;
const STORAGE_KEY = 'cart';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const isValidItem = (item) =>
  typeof item?.sku === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && typeof item.prices?.USD === 'number';

function cartReducer(items, action) {
  switch (action.type) {
    case 'add': {
      const existing = items.find((item) => lineKey(item) === lineKey(action.item));
      if (!existing) return [...items, { ...action.item, quantity: 1 }];
      return items.map((item) => (lineKey(item) === lineKey(existing) ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) } : item));
    }
    case 'setQuantity':
      return items
        .map((item) => (lineKey(item) === action.key ? { ...item, quantity: Math.min(action.quantity, MAX_QUANTITY) } : item))
        .filter((item) => item.quantity > 0);
    case 'remove': return items.filter((item) => lineKey(item) !== action.key);
    case 'clear': return [];
    case 'replace': return action.items;
    default: return items;
  }
}

export function CartProvider({ children }) {
  const { currency } = useSettings();
  const [items, dispatch] = useReducer(cartReducer, [], () => (storage.get(STORAGE_KEY, []) || []).filter(isValidItem));
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => storage.set(STORAGE_KEY, items), [items]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2200);
    return () => clearTimeout(timer);
  }, [notice]);

  // Called when the customer reaches checkout, so the bag shows what they will really be charged.
  const refreshFromCatalog = useCallback(async () => {
    try {
      const products = await catalogApi.list();
      if (!Array.isArray(products)) return;
      const before = itemsRef.current;
      const after = syncWithCatalog(before, products);
      if (JSON.stringify(before) === JSON.stringify(after)) return;
      dispatch({ type: 'replace', items: after });
      setNotice(after.length < before.length ? 'Some pieces are no longer available and were removed from your bag' : 'Prices in your bag were updated');
    } catch {
      /* offline or the store is busy: keep the bag as it is; the server still prices the order */
    }
  }, []);

  const addItem = useCallback((product, option) => { dispatch({ type: 'add', item: toCartItem(product, option) }); setNotice('Added to your bag'); }, []);
  const value = useMemo(() => ({
    items, isOpen, notice, addItem, refreshFromCatalog,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.prices[currency] * item.quantity, 0),
    setQuantity: (key, quantity) => dispatch({ type: 'setQuantity', key, quantity }), // key = lineKey(item)
    removeItem: (key) => dispatch({ type: 'remove', key }),
    clearCart: () => dispatch({ type: 'clear' }),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
  }), [items, isOpen, notice, addItem, refreshFromCatalog, currency]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
