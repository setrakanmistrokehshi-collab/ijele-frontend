// Server-side SEO: puts the title, description, canonical URL, Open Graph tags and JSON-LD into the HTML before it
// leaves the server, so crawlers and link previews (WhatsApp, Facebook, X) see them without running JavaScript.
// Pure functions with no Node-only imports, so the Node server and the Vercel middleware share them.
import {
  DEFAULT_DESCRIPTION, SITE_NAME, organizationJsonLd, pageTitle, productSeo,
} from './seo.js';

const STATIC_PAGES = {
  '/': { title: SITE_NAME },
  '/contact': { title: 'Contact us' },
};
const PRIVATE_PAGES = new Set(['/checkout', '/orders', '/track', '/thanks']);
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

export function renderSeoTags({ title, description = DEFAULT_DESCRIPTION, url, image, jsonLd, noindex }) {
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

/**
 * Decides the HTTP status and the <head> tags for a page path.
 * `loadProduct(sku)` resolves to { status: 'ok', product } | { status: 'missing' } | { status: 'error' }.
 * Only a definite "missing" is a 404: if the backend is asleep or slow, the page is still served normally (and stays
 * indexable) instead of telling Google that a real product page does not exist.
 */
export async function resolveSeo(pathname, { siteUrl, loadProduct }) {
  const productMatch = pathname.match(/^\/product\/([A-Za-z0-9-]{3,40})$/);
  if (productMatch) {
    const result = await loadProduct(productMatch[1]);
    if (result.status === 'ok') return { status: 200, tags: renderSeoTags(productSeo(result.product, siteUrl)) };
    if (result.status === 'missing') return { status: 404, tags: renderSeoTags({ title: 'Page not found', noindex: true }) };
    return { status: 200, tags: renderSeoTags({ title: SITE_NAME, url: siteUrl + pathname }) };
  }
  if (STATIC_PAGES[pathname]) {
    const jsonLd = pathname === '/' ? organizationJsonLd(siteUrl) : undefined;
    return { status: 200, tags: renderSeoTags({ ...STATIC_PAGES[pathname], url: siteUrl + pathname, jsonLd }) };
  }
  const isPrivatePage = PRIVATE_PAGES.has(pathname);
  return { status: isPrivatePage ? 200 : 404, tags: renderSeoTags({ title: SITE_NAME, noindex: true }) };
}

export const robotsTxt = (siteUrl) =>
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /orders\nDisallow: /track\nDisallow: /thanks\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`;

export function sitemapXml(siteUrl, products) {
  const paths = ['/', '/contact', ...products.map((product) => `/product/${product.sku}`)];
  const entries = paths.map((urlPath) => `  <url><loc>${escapeHtml(siteUrl + urlPath)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}
