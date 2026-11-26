// The Node server's adapter around the shared SEO module (src/utils/seo-render.js): it only knows how to reach the
// backend. Also builds robots.txt and sitemap.xml.
import {
  resolveSeo as resolveSeoTags, robotsTxt as buildRobotsTxt, sitemapXml,
} from '../src/utils/seo-render.js';
import { BACKEND_URL, SITE_URL } from './config.js';

const SITEMAP_LIFETIME_MS = 10 * 60 * 1000;

/** Returns { response } on any answer, or { response: null } when the backend could not be reached. */
async function fetchFromBackend(apiPath) {
  try {
    return { response: await fetch(new URL(apiPath, BACKEND_URL), { signal: AbortSignal.timeout(4000) }) };
  } catch {
    return { response: null }; // SEO enrichment is best-effort: the page still renders without it
  }
}

async function loadProduct(sku) {
  const { response } = await fetchFromBackend(`/api/products/${sku}`);
  if (!response) return { status: 'error' };
  if (response.status === 404) return { status: 'missing' };
  if (!response.ok) return { status: 'error' };
  try {
    return { status: 'ok', product: await response.json() };
  } catch {
    return { status: 'error' };
  }
}

export const resolveSeo = (pathname) => resolveSeoTags(pathname, { siteUrl: SITE_URL, loadProduct });
export const robotsTxt = () => buildRobotsTxt(SITE_URL);

let sitemapCache = { body: '', expiresAt: 0 };

export async function buildSitemap() {
  if (Date.now() < sitemapCache.expiresAt) return sitemapCache.body;
  const { response } = await fetchFromBackend('/api/products');
  const products = response?.ok ? await response.json().catch(() => null) : null;
  const body = sitemapXml(SITE_URL, Array.isArray(products) ? products : []);
  // Never cache a sitemap built while the backend was unreachable: it would hide every product for 10 minutes.
  if (Array.isArray(products)) sitemapCache = { body, expiresAt: Date.now() + SITEMAP_LIFETIME_MS };
  return body;
}
