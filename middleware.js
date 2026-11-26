// Vercel Routing Middleware: gives every page real SEO tags and the security headers before it leaves the server.
// Vercel only serves the static build, so without this the HTML crawlers and link previews (WhatsApp, Facebook, X)
// see has no title, description or product data, /sitemap.xml returns the app shell, /robots.txt does not exist, and
// no CSP header is sent. The same logic runs in server/index.js when you host the storefront on your own Node server.
//
// Environment variables (all optional):
//   BACKEND_URL  the API origin used to read product data (default: your Render backend)
//   SITE_URL     the public https address, e.g. https://www.ijele.com. Defaults to the address the visitor used.
import { next } from '@vercel/edge';
import { buildSecurityHeaders } from './src/utils/security-headers.js';
import { resolveSeo, robotsTxt, sitemapXml } from './src/utils/seo-render.js';

// Every page route, plus robots.txt and sitemap.xml. Files with an extension, /assets and /api are left alone.
export const config = { matcher: ['/robots.txt', '/sitemap.xml', '/((?!api/|assets/|.*\\..*).*)'] };

const DEFAULT_BACKEND_URL = 'https://ijele-jewery-backend.onrender.com';
const BACKEND_TIMEOUT_MS = 4000;
const CACHE_LIFETIME_MS = 5 * 60 * 1000;
const SEO_PLACEHOLDER = '<!--seo-head-->';

// Small per-instance cache, so a burst of visitors does not become a burst of backend calls (the backend rate-limits
// by IP, and on a free host every call may wake it up). Only successful answers are kept.
const cache = new Map();
const MAX_CACHE_ENTRIES = 500;
async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await load();
  if (value.cacheable) {
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(key, { value, expiresAt: Date.now() + CACHE_LIFETIME_MS });
  }
  return value;
}

const backendUrl = () => (process.env.BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');

async function callBackend(apiPath) {
  try {
    return await fetch(`${backendUrl()}${apiPath}`, { signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS) });
  } catch {
    return null; // asleep, slow or unreachable
  }
}

const loadProduct = (sku) => cached(`product:${sku}`, async () => {
  const response = await callBackend(`/api/products/${sku}`);
  if (!response) return { status: 'error' };
  if (response.status === 404) return { status: 'missing', cacheable: true };
  if (!response.ok) return { status: 'error' };
  try {
    return { status: 'ok', product: await response.json(), cacheable: true };
  } catch {
    return { status: 'error' };
  }
});

const loadProducts = () => cached('products', async () => {
  const response = await callBackend('/api/products');
  const products = response?.ok ? await response.json().catch(() => null) : null;
  return { products: Array.isArray(products) ? products : [], cacheable: Array.isArray(products) };
});

export default async function middleware(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();

  const url = new URL(request.url);
  const siteUrl = (process.env.SITE_URL || url.origin).replace(/\/$/, '');
  const securityHeaders = buildSecurityHeaders({ https: true });

  if (url.pathname === '/robots.txt') {
    return new Response(robotsTxt(siteUrl), {
      headers: { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    });
  }
  if (url.pathname === '/sitemap.xml') {
    const { products } = await loadProducts();
    return new Response(sitemapXml(siteUrl, products), {
      headers: { ...securityHeaders, 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
    });
  }

  const shell = await fetch(new URL('/index.html', url.origin));
  if (!shell.ok) return next(); // never break the site because of SEO: fall back to the plain app
  const html = await shell.text();
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname;
  const { status, tags } = await resolveSeo(pathname, { siteUrl, loadProduct });

  return new Response(html.replace(SEO_PLACEHOLDER, tags), {
    status,
    headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
