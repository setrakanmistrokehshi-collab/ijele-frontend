import { useEffect } from 'react';
import { DEFAULT_DESCRIPTION, pageTitle } from '../utils/seo.js';

function upsertTag(selector, create, apply) {
  let element = document.head.querySelector(selector);
  if (!element) { element = create(); document.head.appendChild(element); }
  apply(element);
}
const setMeta = (attribute, key, content) =>
  upsertTag(`meta[${attribute}="${key}"]`, () => Object.assign(document.createElement('meta'), { [attribute]: key }), (el) => el.setAttribute('content', content));

/** Keeps title, description, canonical, Open Graph and JSON-LD in sync with the current page. */
export function useSeo({ title, description = DEFAULT_DESCRIPTION, path = '/', image, jsonLd, noindex = false }) {
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const fullTitle = pageTitle(title);
    const url = `${window.location.origin}${path}`;
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', 'website');
    if (image) setMeta('property', 'og:image', image);
    upsertTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), (el) => el.setAttribute('href', url));

    const script = document.getElementById('jsonld'); // the server injects the same element for crawlers
    if (jsonLdText) {
      const target = script ?? Object.assign(document.createElement('script'), { id: 'jsonld', type: 'application/ld+json' });
      target.textContent = jsonLdText; // textContent: never parsed as HTML
      if (!script) document.head.appendChild(target);
    } else script?.remove();
  }, [title, description, path, image, jsonLdText, noindex]);
}
