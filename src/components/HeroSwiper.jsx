import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Gem, Link as ChainIcon, Pause, Play, Watch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildSlides } from '../utils/heroSlides.js';

const SWIPE_DISTANCE_PX = 50;
const AUTO_ADVANCE_MS = 6000;
const ICONS = [Watch, ChainIcon, Gem]; // fallback art when 3D is unavailable
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The headline is stable; featured categories rotate automatically and can be selected manually. */
export default function HeroSwiper({ products, currency }) {
  const slides = buildSlides(products, currency);
  const [index, setIndex] = useState(0);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [resumeWhileFocused, setResumeWhileFocused] = useState(false);
  const swipeStartX = useRef(null);
  const sectionRef = useRef(null);
  const [reduced] = useState(() => reducedMotion());
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);
  const goTo = useCallback((target) => setIndex((target + slides.length) % slides.length), [slides.length]);
  const rotationPaused = manuallyPaused || isHovered || (isFocused && !resumeWhileFocused) || reduced || !inView || !tabVisible;
  const slide = slides[index];
  const Icon = ICONS[index];

  // Pause automatic rotation while the hero is off-screen or the tab is hidden.
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(sectionRef.current);
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  useEffect(() => {
    if (rotationPaused || slides.length < 2) return undefined;
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(interval);
  }, [index, rotationPaused, slides.length]);

  const handlePointerUp = (event) => {
    const start = swipeStartX.current;
    swipeStartX.current = null;
    if (start !== null && Math.abs(event.clientX - start) > SWIPE_DISTANCE_PX) goTo(index + (event.clientX < start ? 1 : -1));
  };

  return (
    <section
      ref={sectionRef}
      className="hero"
      aria-label="Featured collections"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => { setIsFocused(true); setResumeWhileFocused(false); }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsFocused(false);
          setResumeWhileFocused(false);
        }
      }}
    >
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1>Fine jewelry, tracked to your door.</h1>
          <p>Watches, chains and necklaces. Pay in USD, NGN, EUR or GBP, then follow your order from packing to delivery.</p>
          <p className="hero-feature" aria-live={rotationPaused ? 'polite' : 'off'}><strong>{slide.label}</strong>{slide.summary ? `: ${slide.summary}` : ''}</p>
          <div className="hero-actions">
            <Link className="cta" to={slide.to}>{slide.cta}<ArrowRight /></Link>
            <Link className="textlink" to="/track">Track an order</Link>
          </div>
        </div>

        <div
          className="hero-stage"
          onPointerDown={(event) => { swipeStartX.current = event.clientX; }} onPointerUp={handlePointerUp}
        >
          <div className="hero-visual" aria-hidden="true">
            {slide.image
              ? <img className="hero-product-photo" src={slide.image} alt="" width="1200" height="1200" fetchPriority="high" />
              : <Icon />}
          </div>
        </div>

        <div className="hero-index" role="group" aria-label="Choose a category to feature">
          {slides.map(({ key, label }, position) => (
            <button key={key} type="button" aria-pressed={position === index} onClick={() => goTo(position)}>
              <b>{String(position + 1).padStart(2, '0')}</b>{label}
            </button>
          ))}
          {!reduced && (
            <button
              className="hero-autoplay"
              type="button"
              aria-label={manuallyPaused ? 'Resume automatic slide rotation' : 'Pause automatic slide rotation'}
              aria-pressed={manuallyPaused}
              onClick={() => {
                if (manuallyPaused) {
                  setManuallyPaused(false);
                  if (isFocused) setResumeWhileFocused(true);
                } else {
                  setManuallyPaused(true);
                }
              }}
            >
              {manuallyPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
              <span>{manuallyPaused ? 'Play' : 'Pause'}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
