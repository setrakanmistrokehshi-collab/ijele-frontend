import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
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
      const existing = items.find((item) => item.sku === action.item.sku);
      if (!existing) return [...items, { ...action.item, quantity: 1 }];
      return items.map((item) => (item.sku === existing.sku ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) } : item));
    }
    case 'setQuantity':
      return items
        .map((item) => (item.sku === action.sku ? { ...item, quantity: Math.min(action.quantity, MAX_QUANTITY) } : item))
        .filter((item) => item.quantity > 0);
    case 'remove': return items.filter((item) => item.sku !== action.sku);
    case 'clear': return [];
    default: return items;
  }
}

/** Public product data only: the server re-prices every order, so nothing here is trusted for payment. */
const toCartItem = (product) => ({
  sku: product.sku, name: product.name, image: product.images?.[0] ?? '', prices: product.prices,
  giftName: product.freeGift?.enabled ? product.freeGift.name : '',
});

export function CartProvider({ children }) {
  const { currency } = useSettings();
  const [items, dispatch] = useReducer(cartReducer, [], () => (storage.get(STORAGE_KEY, []) || []).filter(isValidItem));
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => storage.set(STORAGE_KEY, items), [items]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2200);
    return () => clearTimeout(timer);
  }, [notice]);

  const addItem = useCallback((product) => { dispatch({ type: 'add', item: toCartItem(product) }); setNotice('Added to your bag'); }, []);
  const value = useMemo(() => ({
    items, isOpen, notice, addItem,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.prices[currency] * item.quantity, 0),
    setQuantity: (sku, quantity) => dispatch({ type: 'setQuantity', sku, quantity }),
    removeItem: (sku) => dispatch({ type: 'remove', sku }),
    clearCart: () => dispatch({ type: 'clear' }),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
  }), [items, isOpen, notice, addItem, currency]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
