import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lineKey, syncWithCatalog, toCartItem } from '../src/utils/cart.js';

const bagItem = { sku: 'WATCH-1', name: 'Old name', image: '', prices: { USD: 100000 }, giftName: '', quantity: 2 };
const catalogWatch = { sku: 'WATCH-1', name: 'Royal Chronograph', images: ['https://res.cloudinary.com/x/a.jpg'], prices: { USD: 120000 }, freeGift: { enabled: true, name: 'Silk pouch' } };

test('prices, names and gifts in a saved bag follow the catalogue, quantities are kept', () => {
  const [item] = syncWithCatalog([bagItem], [catalogWatch]);

  assert.equal(item.quantity, 2);
  assert.equal(item.name, 'Royal Chronograph');
  assert.equal(item.prices.USD, 120000);
  assert.equal(item.giftName, 'Silk pouch');
  assert.equal(item.image, 'https://res.cloudinary.com/x/a.jpg');
});

test('a piece that is no longer sold is removed from the bag', () => {
  const gone = { ...bagItem, sku: 'OLD-1' };
  assert.deepEqual(syncWithCatalog([gone, bagItem], [catalogWatch]).map((item) => item.sku), ['WATCH-1']);
});

test('an unchanged bag comes back identical, so nothing is announced', () => {
  const once = syncWithCatalog([bagItem], [catalogWatch]);
  assert.equal(JSON.stringify(syncWithCatalog(once, [catalogWatch])), JSON.stringify(once));
});

const option = (id, label, usd) => ({ id, label, prices: { USD: usd } });
const withOptions = { ...catalogWatch, priceOptions: [option('o1', 'Gold', 200000), option('o2', 'Silver', 150000)] };
const gold = { ...bagItem, optionId: 'o1', optionLabel: 'Gold', prices: { USD: 1 } };

test('a line with a price option follows that option, and the same piece with another option is a separate line', () => {
  const [item] = syncWithCatalog([gold], [withOptions]);
  assert.equal(item.prices.USD, 200000);
  assert.equal(item.optionLabel, 'Gold');
  assert.notEqual(lineKey(gold), lineKey({ ...gold, optionId: 'o2' }));
  assert.equal(lineKey(bagItem), 'WATCH-1');
});

test('a line whose option was removed, or whose piece gained options, is dropped', () => {
  assert.deepEqual(syncWithCatalog([{ ...gold, optionId: 'gone' }], [withOptions]), []);
  assert.deepEqual(syncWithCatalog([bagItem], [withOptions]), []);
});

test('a bag line is built from the chosen option', () => {
  const line = toCartItem(withOptions, withOptions.priceOptions[1]);
  assert.deepEqual([line.optionId, line.optionLabel, line.prices.USD], ['o2', 'Silver', 150000]);
  assert.equal('optionId' in toCartItem(catalogWatch), false);
});
