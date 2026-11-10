import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductImage, { galleryUrls, optimise } from './ProductImage.jsx';

const MAX_CARD_PHOTOS = 4; // keeps a grid of cards light on mobile data
const SWIPE_PX = 40;

/**
 * Photo area of a shop card. One photo behaves exactly as before. With several, shoppers get arrows (mouse),
 * dots and swipe (touch). The photo area stays a link to the product page; `children` (e.g. the Sold out badge) sit on top.
 */
export default function ProductCarousel({ product, to, children }) {
  const urls = galleryUrls(product, MAX_CARD_PHOTOS);
  const [active, setActive] = useState(0);
  const touchStart = useRef(null);
  const swipedAt = useRef(0);

  if (urls.length < 2) {
    return <Link className="art" to={to} aria-label={`View ${product.name}`}><ProductImage product={product} />{children}</Link>;
  }

  const go = (target) => setActive((target + urls.length) % urls.length);
  const handlePointerDown = (event) => { if (event.pointerType !== 'mouse') touchStart.current = { x: event.clientX, y: event.clientY }; };
  const handlePointerUp = (event) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swipedAt.current = Date.now();
      go(active + (dx < 0 ? 1 : -1));
    }
  };

  return (
    <div className="art gal" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={() => { touchStart.current = null; }}>
      {/* A swipe must not also open the product page */}
      <Link className="gal-link" to={to} aria-label={`View ${product.name}`} onClick={(event) => { if (Date.now() - swipedAt.current < 400) event.preventDefault(); }}>
        {urls.map((url, index) => (
          <img
            key={url} className={index === active ? 'on' : ''} src={optimise(url, index === 0 ? 600 : 480)}
            alt={index === 0 ? product.name : `${product.name}, photo ${index + 1}`} aria-hidden={index !== active}
            width={600} height={600} loading="lazy" draggable={false}
          />
        ))}
        {children}
      </Link>
      <button type="button" className="gal-arrow l" aria-label="Previous photo" onClick={() => go(active - 1)}><ChevronLeft /></button>
      <button type="button" className="gal-arrow r" aria-label="Next photo" onClick={() => go(active + 1)}><ChevronRight /></button>
      <div className="gal-dots">
        {urls.map((url, index) => (
          <button key={url} type="button" tabIndex={-1} aria-label={`Show photo ${index + 1} of ${urls.length}`} aria-current={index === active} onClick={() => go(index)} />
        ))}
      </div>
    </div>
  );
}
