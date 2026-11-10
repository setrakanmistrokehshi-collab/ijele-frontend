import { useEffect, useState } from 'react';

// Shipping zones are public and tiny. One request is shared by the header, the home page and checkout.
let cached = null;
const load = () => {
  cached ??= fetch('/api/shipping/zones/public')
    .then((response) => (response.ok ? response.json() : []))
    .catch(() => []);
  return cached;
};

/** Active shipping zones, or [] while loading or when none are set up. */
export function useZones() {
  const [zones, setZones] = useState([]);
  useEffect(() => {
    let live = true;
    load().then((list) => { if (live) setZones(list); });
    return () => { live = false; };
  }, []);
  return zones;
}
