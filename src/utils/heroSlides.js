import { formatMoney } from './money.js';

// One slide per category, in the same order as the 3D models (watch, chain, necklace).
const CATEGORIES = [
  { key: 'Watch', label: 'Watches', one: 'watch' },
  { key: 'Chain', label: 'Chains', one: 'chain' },
  { key: 'Necklace', label: 'Necklaces', one: 'necklace' },
];

/**
 * What each hero slide says about its category, taken from the live catalogue: how many pieces there are and the lowest
 * price in the shopper's currency. Nothing here is hand-written marketing, so it can never go out of date or overstate.
 * Before the catalogue loads (or if a category is empty) the slide simply omits the numbers.
 */
export function buildSlides(products, currency) {
  return CATEGORIES.map(({ key, label, one }) => {
    const pieces = (products ?? []).filter((product) => product.category === key);
    const prices = pieces.map((product) => product.prices?.[currency]).filter(Number.isFinite);
    const from = prices.length ? formatMoney(Math.min(...prices), currency) : null;
    const summary = pieces.length ? `${pieces.length} ${pieces.length === 1 ? 'piece' : 'pieces'}${from ? `, from ${from}` : ''}` : null;
    return { key, label, one, summary, to: `/?category=${key}`, cta: `Shop ${label.toLowerCase()}` };
  });
}
