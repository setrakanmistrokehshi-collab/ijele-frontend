import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSlides } from '../src/utils/heroSlides.js';

const image = 'https://res.cloudinary.com/example/image/upload/v123/watch.jpg';

test('hero slides select an in-stock real product photo for each category', () => {
  const products = [
    { category: 'Watch', sku: 'WATCH-1', name: 'Sold out watch', inStock: false, images: [image], prices: { USD: 10000 } },
    { category: 'Watch', sku: 'WATCH-2', name: 'Available watch', inStock: true, images: [image], prices: { USD: 12000 } },
    { category: 'Chain', sku: 'CHAIN-1', name: 'Available chain', inStock: true, images: [image], prices: { USD: 8000 } },
  ];

  const slides = buildSlides(products, 'USD');
  assert.equal(slides[0].product.sku, 'WATCH-2');
  assert.equal(slides[0].image, 'https://res.cloudinary.com/example/image/upload/f_auto,q_auto,c_fill,w_900,h_900/v123/watch.jpg');
  assert.equal(slides[1].product.sku, 'CHAIN-1');
  assert.equal(slides[2].product, null);
  assert.equal(slides[2].image, null);
});

test('hero slides ignore non-Cloudinary photos and retain live collection summaries', () => {
  const slides = buildSlides([
    { category: 'Necklace', sku: 'NECK-1', name: 'Necklace', inStock: true, images: ['https://example.com/photo.jpg'], prices: { USD: 25000 } },
  ], 'USD');

  assert.equal(slides[2].product, null);
  assert.equal(slides[2].image, null);
  assert.equal(slides[2].summary, '1 piece, from $250.00');
  assert.equal(slides[0].summary, null);
});
