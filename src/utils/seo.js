// Pure functions shared by the browser (useSeo) and the production server (server.js).
export const SITE_NAME = 'Aurora Fine Jewelry';
export const DEFAULT_DESCRIPTION = 'Watches, chains and necklaces. Pay in USD, NGN, EUR or GBP and follow your order from packing to delivery.';

export const pageTitle = (title) => (!title || title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`);
const centsToDecimal = (minor) => `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;

export const organizationJsonLd = (origin) => ({
  '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: origin,
});

/** Title, description, canonical URL and schema.org/Product data for one product page. */
export function productSeo(product, origin) {
  const url = `${origin}/product/${product.sku}`;
  const description = product.seo?.metaDescription || product.description.slice(0, 160);
  return {
    title: product.seo?.metaTitle || product.name,
    description, url, image: product.images?.[0],
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Product',
      name: product.name, sku: product.sku, description, category: product.category, image: product.images,
      brand: { '@type': 'Brand', name: SITE_NAME },
      offers: {
        '@type': 'Offer', url, priceCurrency: 'USD', price: centsToDecimal(product.prices.USD),
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    },
  };
}
