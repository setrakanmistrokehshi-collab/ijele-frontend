// Display-only shipping estimate. The server always recalculates the real fee.
// Zone data comes from GET /api/shipping/zones/public (see hooks/useZones.js).

/** Fixed estimate rates relative to USD. They mirror backend/src/utils/shipping-rules.js. */
export const USD_EXCHANGE_RATES = { USD: 1, NGN: 1500, EUR: 0.92, GBP: 0.79 };

/** Used before the zone list loads, or when no zone matches. Values are USD cents. */
const DEFAULT_FEES_USD = { standard: 2500, express: 5500, freeStandardThreshold: 100_000 };

const normalise = (text) => String(text ?? '').trim().toLowerCase();
const matchesList = (list, value) => list.length === 0 || list.some((entry) => normalise(entry) === value);

/** Finds the best matching zone for a location (same priority logic as the server). `zones` come sorted by priority. */
function findMatchingZone(zones, country, state, city) {
  const wanted = { country: normalise(country), state: normalise(state), city: normalise(city) };
  return zones.find((zone) => (
    matchesList(zone.countries, wanted.country)
    && matchesList(zone.states, wanted.state)
    && matchesList(zone.cities, wanted.city)
  )) ?? null;
}

/**
 * Returns the shipping fee in the currency's minor units.
 * `goodsTotal` is the basket subtotal in minor units of `currency`.
 */
export function shippingFee(zones, country, state = '', city = '', method, currency, goodsTotal) {
  const rate = USD_EXCHANGE_RATES[currency] ?? 1;
  const zone = findMatchingZone(zones, country, state, city);
  const standardFeeUsd = zone ? zone.stdFeeUsd : DEFAULT_FEES_USD.standard;
  const expressFeeUsd = zone ? zone.expFeeUsd : DEFAULT_FEES_USD.express;
  const freeAboveUsd = zone ? zone.freeStdThresholdUsd : DEFAULT_FEES_USD.freeStandardThreshold;

  if (method === 'exp' || method === 'express') return Math.round(expressFeeUsd * rate);
  const goodsTotalUsd = Math.round(goodsTotal / rate);
  const qualifiesForFreeDelivery = freeAboveUsd > 0 && goodsTotalUsd >= freeAboveUsd;
  return qualifiesForFreeDelivery ? 0 : Math.round(standardFeeUsd * rate);
}

/** All countries mentioned in at least one active zone, sorted and without duplicates. */
export function countriesFromZones(zones) {
  return [...new Set(zones.flatMap((zone) => zone.countries))].sort();
}

/**
 * The lowest order value (USD cents) at which standard delivery is free, but only when EVERY active zone offers a
 * free threshold. Otherwise null, so the site never promises free delivery that some destinations do not get.
 */
export function freeShippingFromUsd(zones) {
  if (zones.length === 0 || zones.some((zone) => !(zone.freeStdThresholdUsd > 0))) return null;
  return Math.min(...zones.map((zone) => zone.freeStdThresholdUsd));
}
