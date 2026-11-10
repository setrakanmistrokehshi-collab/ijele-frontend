// Puts SEO tags into the HTML before it leaves the server, so crawlers and link previews see them without running
// JavaScript. Also builds robots.txt and sitemap.xml.
import {
  DEFAULT_DESCRIPTION, SITE_NAME, organizationJsonLd, pageTitle, productSeo,
} from '../src/utils/seo.js';
import { BACKEND_URL, SITE_URL } from './config.js';

const STATIC_PAGES = {
  '/': { title: SITE_NAME, jsonLd: organizationJsonLd(SITE_URL) },
  '/contact': { title: 'Contact us' },
};
const PRIVATE_PAGES = new Set(['/checkout', '/orders', '/track', '/thanks']);
const SITEMAP_LIFETIME_MS = 10 * 60 * 1000;
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

function renderSeoTags({ title, description = DEFAULT_DESCRIPTION, url, image, jsonLd, noindex }) {
  const fullTitle = escapeHtml(pageTitle(title));
  const tags = [
    `<title>${fullTitle}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:title" content="${fullTitle}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    '<meta property="og:type" content="website" />',
  ];
  if (url) tags.push(`<link rel="canonical" href="${escapeHtml(url)}" />`, `<meta property="og:url" content="${escapeHtml(url)}" />`);
  if (image) tags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
  if (noindex) tags.push('<meta name="robots" content="noindex,nofollow" />');
  // "<" is escaped so product text can never close the script element.
  if (jsonLd) {
    const safeJson = JSON.stringify(jsonLd).replaceAll('<', '\\u003c');
    tags.push(`<script id="jsonld" type="application/ld+json">${safeJson}</script>`);
  }
  return tags.join('\n    ');
}

async function fetchFromBackend(apiPath) {
  try {
    const response = await fetch(new URL(apiPath, BACKEND_URL), { signal: AbortSignal.timeout(4000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null; // SEO enrichment is best-effort: the page still renders without it
  }
}

/** Decides the HTTP status and the <head> tags for a page path. */
export async function resolveSeo(pathname) {
  const productMatch = pathname.match(/^\/product\/([A-Za-z0-9-]{3,40})$/);
  if (productMatch) {
    const product = await fetchFromBackend(`/api/products/${productMatch[1]}`);
    return product
      ? { status: 200, tags: renderSeoTags(productSeo(product, SITE_URL)) }
      : { status: 404, tags: renderSeoTags({ title: 'Page not found', noindex: true }) };
  }
  if (STATIC_PAGES[pathname]) {
    return { status: 200, tags: renderSeoTags({ ...STATIC_PAGES[pathname], url: SITE_URL + pathname }) };
  }
  const isPrivatePage = PRIVATE_PAGES.has(pathname);
  return { status: isPrivatePage ? 200 : 404, tags: renderSeoTags({ title: SITE_NAME, noindex: true }) };
}

export const robotsTxt = () =>
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /orders\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`;

let sitemapCache = { body: '', expiresAt: 0 };

export async function buildSitemap() {
  if (Date.now() < sitemapCache.expiresAt) return sitemapCache.body;
  const products = (await fetchFromBackend('/api/products')) ?? [];
  const paths = ['/', '/contact', ...products.map((product) => `/product/${product.sku}`)];
  const entries = paths.map((urlPath) => `  <url><loc>${escapeHtml(SITE_URL + urlPath)}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
  sitemapCache = { body, expiresAt: Date.now() + SITEMAP_LIFETIME_MS };
  return body;
}
