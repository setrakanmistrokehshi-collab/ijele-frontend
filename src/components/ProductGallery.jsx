import { useState } from 'react';
import ProductImage, { galleryUrls, optimise } from './ProductImage.jsx';

/** Product page photos: a large image with a thumbnail strip when there is more than one. */
export default function ProductGallery({ product }) {
  const urls = galleryUrls(product);
  const [active, setActive] = useState(0);
  if (urls.length < 2) return <ProductImage product={product} size={900} eager />;
  const current = Math.min(active, urls.length - 1);
  return (
    <div className="pgal">
      <ProductImage key={urls[current]} product={{ name: product.name, images: [urls[current]] }} size={900} eager />
      <ul className="pgal-thumbs" aria-label="Product photos">
        {urls.map((url, index) => (
          <li key={url}>
            <button type="button" aria-label={`Show photo ${index + 1} of ${urls.length}`} aria-current={index === current} onClick={() => setActive(index)}>
              <img src={optimise(url, 120)} alt="" width={60} height={60} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
