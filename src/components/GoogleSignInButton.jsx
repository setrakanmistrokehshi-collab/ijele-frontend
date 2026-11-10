import { useEffect, useRef, useState } from 'react';
import { accountApi, configApi } from '../services/api.js';
import { toUserMessage } from '../services/httpClient.js';
import { useAuth } from '../context/AuthContext.jsx';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement('script'), {
      src: GOOGLE_SCRIPT_URL, async: true, onload: resolve, onerror: reject,
    });
    document.head.appendChild(script);
  });
}

/** Renders Google's button when configured and reports setup failures when sign-in is required. */
export default function GoogleSignInButton({ required = false }) {
  const { signIn } = useAuth();
  const containerRef = useRef(null);
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    // Each attempt needs a fresh server-issued nonce: it is single-use and tied to this browser, so a Google token
    // that leaks or is replayed elsewhere cannot sign anyone in.
    async function prepareButton(googleClientId) {
      const { nonce } = await accountApi.getGoogleNonce();
      if (cancelled || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        nonce,
        callback: async ({ credential }) => {
          try {
            await signIn(credential);
            setMessage('');
          } catch (error) {
            setMessage(toUserMessage(error));
            prepareButton(googleClientId).catch(() => {
              if (!cancelled) setAvailability('error');
            }); // the used nonce is gone, so get a new one for the retry
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with',
      });
      setAvailability('ready');
    }

    configApi.get()
      .then(async ({ googleClientId }) => {
        if (cancelled) return;
        if (!googleClientId) {
          setAvailability('unconfigured');
          return;
        }
        await loadGoogleScript();
        await prepareButton(googleClientId);
      })
      .catch(() => { if (!cancelled) setAvailability('error'); });

    return () => { cancelled = true; };
  }, [signIn]);

  return (
    <>
      <div ref={containerRef} />
      {required && availability === 'loading' && <p className="help-text" role="status">Preparing Google sign-in…</p>}
      {required && availability === 'unconfigured' && <p className="field-error" role="alert">Google sign-in is not configured. Please contact support.</p>}
      {required && availability === 'error' && <p className="field-error" role="alert">Google sign-in is unavailable right now. Please try again later.</p>}
      {message && <p className="field-error" role="alert">{message}</p>}
    </>
  );
}
