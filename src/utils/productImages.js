export const CLOUDINARY_PREFIX = 'https://res.cloudinary.com/';

/** Cloudinary delivers an optimised, square-cropped image. */
export const optimise = (url, size) => url.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${size},h_${size}/`);

/** The product's usable photos (Cloudinary only), cover first, capped at `max`. */
export const galleryUrls = (product, max = 12) => (product.images ?? []).filter((url) => url?.startsWith(CLOUDINARY_PREFIX)).slice(0, max);
