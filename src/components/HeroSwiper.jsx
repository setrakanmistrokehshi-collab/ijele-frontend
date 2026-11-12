import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Gem, Link as ChainIcon, Watch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildSlides } from '../utils/heroSlides.js';

const SWIPE_DISTANCE_PX = 50;
const ICONS = [Watch, ChainIcon, Gem]; // fallback art when 3D is unavailable
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The 3D scene (three.js, ~200 KB gzipped) is its own chunk: it loads after the page is idle and never blocks first paint.
const HeroScene = lazy(() => import('./hero3d/HeroScene.jsx'));

/** Skip 3D for visitors who asked to save data, are on a 2G link, have very little memory, or have no WebGL. */
function canRun3D() {
  const connection = navigator.connection;
  if (connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType ?? '')) return false;
  if (navigator.deviceMemory && navigator.deviceMemory < 2) return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    context?.getExtension('WEBGL_lose_context')?.loseContext(); // release the probe context straight away
    return Boolean(context);
  } catch {
    return false;
  }
}

/** If the 3D chunk fails to load or the scene throws, quietly keep the original icon artwork. */
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Auto-advancing carousel. Pauses on hover/focus, supports swipe, arrows and dots, and respects reduced-motion. */
/**
 * The headline is the same on every slide (one stable h1). The slides only change the category in focus, with real
 * numbers from the catalogue. There is no autoplay: the 3D scene already moves, and nothing here moves on its own timer.
 */
export default function HeroSwiper({ products, currency }) {
  const slides = buildSlides(products, currency);
  const [index, setIndex] = useState(0);
  const swipeStartX = useRef(null);
  const sectionRef = useRef(null);
  const pointer = useRef({ x: 0, y: 0 }); // mouse position over the hero, -1..1, read by the 3D scene every frame
  const [readySceneKey, setReadySceneKey] = useState(null);
  const [reduced] = useState(() => reducedMotion());
  const [mode, setMode] = useState('idle'); // idle -> loading -> ready, or off when 3D isn't available
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);
  const goTo = useCallback((target) => setIndex((target + slides.length) % slides.length), [slides.length]);
  const slide = slides[index];
  const sceneKey = `${slide.key}:${slide.image ?? ''}`;
  const sceneIsReady = mode === 'ready' && readySceneKey === sceneKey;
  const onSceneReady = useCallback(() => {
    setReadySceneKey(sceneKey);
    setMode('ready');
  }, [sceneKey]);
  const Icon = ICONS[index];

  // Start loading the scene once the browser is idle
  useEffect(() => {
    const start = () => setMode(canRun3D() ? 'loading' : 'off');
    if ('requestIdleCallback' in window) {
      const idleHandle = window.requestIdleCallback(start, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleHandle);
    }
    const idleHandle = setTimeout(start, 800);
    return () => clearTimeout(idleHandle);
  }, []);

  // Draw frames only while the hero is on screen and the tab is visible
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(sectionRef.current);
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const handlePointerMove = (event) => {
    if (event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    pointer.current = { x: ((event.clientX - box.left) / box.width) * 2 - 1, y: ((event.clientY - box.top) / box.height) * 2 - 1 };
  };
  const handlePointerUp = (event) => {
    const start = swipeStartX.current;
    swipeStartX.current = null;
    if (start !== null && Math.abs(event.clientX - start) > SWIPE_DISTANCE_PX) goTo(index + (event.clientX < start ? 1 : -1));
  };

  return (
    <section ref={sectionRef} className={`hero${sceneIsReady ? ' is3d' : ''}`} aria-label="Featured collections">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1>Fine jewelry, tracked to your door.</h1>
          <p>Watches, chains and necklaces. Pay in USD, NGN, EUR or GBP, then follow your order from packing to delivery.</p>
          <p className="hero-feature" aria-live="polite"><strong>{slide.label}</strong>{slide.summary ? `: ${slide.summary}` : ''}</p>
          <div className="hero-actions">
            <Link className="cta" to={slide.to}>{slide.cta}<ArrowRight /></Link>
            <Link className="textlink" to="/track">Track an order</Link>
          </div>
        </div>

        <div
          className="hero-stage" onPointerMove={handlePointerMove} onMouseLeave={() => { pointer.current = { x: 0, y: 0 }; }}
          onPointerDown={(event) => { swipeStartX.current = event.clientX; }} onPointerUp={handlePointerUp}
        >
          <div className="hero-fallback" aria-hidden="true">
            {slide.image
              ? <img className="hero-product-photo" src={slide.image} alt="" width="900" height="900" fetchPriority="high" />
              : <Icon />}
          </div>
          {(mode === 'loading' || mode === 'ready') && (
            <div className="stage3d" aria-hidden="true">
              <SceneBoundary onFail={() => setMode('off')}>
                <Suspense fallback={null}>
                  <HeroScene slides={slides} index={index} pointer={pointer} active={inView && tabVisible} reducedMotion={reduced} onReady={onSceneReady} onFail={() => setMode('off')} />
                </Suspense>
              </SceneBoundary>
            </div>
          )}
          {sceneIsReady && (
            <span className="stage-note" aria-hidden="true">
              {slide.product ? `${slide.product.name} · ${slide.product.sku}` : '3D illustration, not a product photo'}
            </span>
          )}
        </div>

        <div className="hero-index" role="group" aria-label="Choose a category to feature">
          {slides.map(({ key, label }, position) => (
            <button key={key} type="button" aria-pressed={position === index} onClick={() => goTo(position)}>
              <b>{String(position + 1).padStart(2, '0')}</b>{label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
