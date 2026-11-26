/** One bag line is a piece plus, when the piece has price options, the option chosen. */
export const lineKey = (item) => (item.optionId ? `${item.sku}:${item.optionId}` : item.sku);

/** Public product data only: the server re-prices every order, so nothing here is trusted for payment. */
export const toCartItem = (product, option) => ({
  sku: product.sku, name: product.name, image: product.images?.[0] ?? '', prices: option?.prices ?? product.prices,
  giftName: product.freeGift?.enabled ? product.freeGift.name : '',
  ...(option && { optionId: option.id, optionLabel: option.label }),
});

/**
 * Brings a saved bag up to date with the current catalogue: prices, names and gifts are refreshed, and pieces that are
 * no longer sold are dropped. A bag kept in the browser for days would otherwise show last week's prices while the
 * server (correctly) charges today's. A line whose option was removed, or whose piece gained options, cannot be bought
 * as it stands, so it is dropped too.
 */
export function syncWithCatalog(items, products) {
  const productBySku = new Map(products.map((product) => [product.sku, product]));
  return items.flatMap((item) => {
    const product = productBySku.get(item.sku);
    if (!product) return [];
    const options = product.priceOptions ?? [];
    if (!item.optionId) return options.length > 0 ? [] : [{ ...item, ...toCartItem(product) }];
    const option = options.find((candidate) => candidate.id === item.optionId);
    return option ? [{ ...item, ...toCartItem(product, option) }] : [];
  });
}
