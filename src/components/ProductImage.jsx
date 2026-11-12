import { Gem } from 'lucide-react';
import { CLOUDINARY_PREFIX, optimise } from '../utils/productImages.js';

export { CLOUDINARY_PREFIX, galleryUrls, optimise } from '../utils/productImages.js';

export default function ProductImage({ product, size = 700, eager = false }) {
  const url = product.images?.[0];
  if (!url?.startsWith(CLOUDINARY_PREFIX)) return <div className="art-placeholder" aria-hidden="true"><Gem size={56} strokeWidth={1} /></div>;
  return <img src={optimise(url, size)} alt={product.name} width={size} height={size} loading={eager ? 'eager' : 'lazy'} />;
}
