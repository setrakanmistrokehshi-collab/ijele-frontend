import { useEffect, useRef, useState } from 'react';
import { shippingApi } from '../services/api.js';

const DEBOUNCE_MS = 400;

export function useShippingQuote({ items, country, state, city, method, currency }) {
  const [result, setResult] = useState({ fee: 0, freeStandardThreshold: null, zoneName: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (items.length === 0 || !country) return undefined;

    const thisRequest = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const quote = await shippingApi.quote({
          currency,
          items: items.map(({ sku, quantity, optionId }) => ({ sku, qty: quantity, ...(optionId && { optionId }) })),
          shipping: { country, state, city, method },
        });
        if (requestId.current !== thisRequest) return;
        setResult(quote);
        setError(false);
      } catch {
        if (requestId.current !== thisRequest) return;
        setError(true);
      } finally {
        if (requestId.current === thisRequest) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [JSON.stringify(items.map(({ sku, quantity, optionId }) => [sku, quantity, optionId ?? ''])), country, state, city, method, currency]);

  return { ...result, loading, error };
}
