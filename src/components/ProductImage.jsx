import { Gem } from 'lucide-react';

export const CLOUDINARY_PREFIX = 'https://res.cloudinary.com/';

/** Cloudinary delivers an optimised, square-cropped image; anything else falls back to a placeholder. */
export const optimise = (url, size) => url.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${size},h_${size}/`);

/** The product's usable photos (Cloudinary only), cover first, capped at `max`. */
export const galleryUrls = (product, max = 12) => (product.images ?? []).filter((url) => url?.startsWith(CLOUDINARY_PREFIX)).slice(0, max);

export default function ProductImage({ product, size = 700, eager = false }) {
  const url = product.images?.[0];
  if (!url?.startsWith(CLOUDINARY_PREFIX)) return <div className="art-placeholder" aria-hidden="true"><Gem size={56} strokeWidth={1} /></div>;
  return <img src={optimise(url, size)} alt={product.name} width={size} height={size} loading={eager ? 'eager' : 'lazy'} />;
}
