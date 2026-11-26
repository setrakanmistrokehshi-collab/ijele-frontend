import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildSecurityHeaders } from '../src/utils/security-headers.js';

const SHELL = '<!doctype html><html><head><meta charset="utf-8" /><!--seo-head--></head><body><div id="root"></div></body></html>';
const WATCH = {
  sku: 'WATCH-1', name: 'Royal Chronograph', description: 'A steel watch.', category: 'Watch', images: ['https://res.cloudinary.com/x/image/upload/a.jpg'],
  prices: { USD: 150000 }, inStock: true, seo: { metaTitle: '', metaDescription: '' },
};

/** Replaces fetch for one test. `backend` decides what the product API answers. */
function mockFetch(t, backend) {
  const original = globalThis.fetch;
  const backendCalls = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/index.html')) return new Response(SHELL, { status: 200 });
    backendCalls.push(url);
    return backend(url);
  };
  t.after(() => { globalThis.fetch = original; });
  return backendCalls;
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Fresh module (and cache) per test.
let counter = 0;
const loadMiddleware = async () => (await import(`../middleware.js?run=${counter += 1}`)).default;
const get = (path) => new Request(`https://shop.example.com${path}`);

test('a product page gets its own title, description, canonical URL and structured data', async (t) => {
  mockFetch(t, () => json(WATCH));
  const response = await (await loadMiddleware())(get('/product/WATCH-1'));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Royal Chronograph \| Ijele Smart Jewelry<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/shop\.example\.com\/product\/WATCH-1" \/>/);
  assert.match(html, /application\/ld\+json/);
  assert.ok(!html.includes('<!--seo-head-->'));
  assert.ok(html.includes('<div id="root">'));
});

test('a product that really does not exist is a 404 that search engines will not index', async (t) => {
  mockFetch(t, () => json({ error: 'Not found' }, 404));
  const response = await (await loadMiddleware())(get('/product/NOPE-1'));

  assert.equal(response.status, 404);
  assert.match(await response.text(), /noindex/);
});

test('a sleeping or failing backend never turns a real product page into a 404', async (t) => {
  mockFetch(t, () => { throw new Error('timeout'); });
  const asleep = await (await loadMiddleware())(get('/product/WATCH-1'));
  assert.equal(asleep.status, 200);
  assert.ok(!(await asleep.text()).includes('noindex'));

  mockFetch(t, () => json({ error: 'busy' }, 429));
  const limited = await (await loadMiddleware())(get('/product/WATCH-1'));
  assert.equal(limited.status, 200);
});

test('product lookups are cached, so a burst of visitors is one backend call', async (t) => {
  const calls = mockFetch(t, () => json(WATCH));
  const middleware = await loadMiddleware();
  await middleware(get('/product/WATCH-1'));
  await middleware(get('/product/WATCH-1'));
  await middleware(get('/product/WATCH-1'));

  assert.equal(calls.length, 1);
});

test('private pages are noindex, unknown pages are 404, the home page has organization data', async (t) => {
  mockFetch(t, () => json([]));
  const middleware = await loadMiddleware();

  const checkout = await middleware(get('/checkout'));
  assert.equal(checkout.status, 200);
  assert.match(await checkout.text(), /noindex/);

  assert.equal((await middleware(get('/no-such-page'))).status, 404);
  assert.match(await (await middleware(get('/'))).text(), /"@type":"Organization"/);
});

test('robots.txt and sitemap.xml are real files, not the app shell', async (t) => {
  mockFetch(t, () => json([{ sku: 'WATCH-1' }, { sku: 'CHAIN-2' }]));
  const middleware = await loadMiddleware();

  const robots = await middleware(get('/robots.txt'));
  assert.match(robots.headers.get('content-type'), /text\/plain/);
  assert.match(await robots.text(), /Sitemap: https:\/\/shop\.example\.com\/sitemap\.xml/);

  const sitemap = await middleware(get('/sitemap.xml'));
  assert.match(sitemap.headers.get('content-type'), /xml/);
  const body = await sitemap.text();
  assert.match(body, /\/product\/WATCH-1/);
  assert.match(body, /\/product\/CHAIN-2/);
});

test('an empty sitemap from an unreachable backend is not cached', async (t) => {
  let backendUp = false;
  mockFetch(t, () => (backendUp ? json([{ sku: 'WATCH-1' }]) : new Response('down', { status: 503 })));
  const middleware = await loadMiddleware();

  assert.ok(!(await (await middleware(get('/sitemap.xml'))).text()).includes('WATCH-1'));
  backendUp = true;
  assert.match(await (await middleware(get('/sitemap.xml'))).text(), /WATCH-1/);
});

test('every page response carries the security headers', async (t) => {
  mockFetch(t, () => json(WATCH));
  const response = await (await loadMiddleware())(get('/product/WATCH-1'));

  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('writes are never intercepted', async (t) => {
  mockFetch(t, () => json({}));
  const response = await (await loadMiddleware())(new Request('https://shop.example.com/checkout', { method: 'POST' }));
  assert.equal(response.headers.get('x-middleware-next'), '1');
});

test('vercel.json repeats exactly the headers the code builds, so the two cannot drift apart', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const pageHeaders = config.headers.find((rule) => rule.source.startsWith('/(('));
  const fromConfig = Object.fromEntries(pageHeaders.headers.map(({ key, value }) => [key, value]));

  assert.deepEqual(fromConfig, buildSecurityHeaders({ https: true }));
});
