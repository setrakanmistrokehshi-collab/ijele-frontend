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

/** Renders Google's own button when the server has a client id configured; renders nothing otherwise. */
export default function GoogleSignInButton() {
  const { signIn } = useAuth();
  const containerRef = useRef(null);
  const [message, setMessage] = useState('');

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
          } catch (error) {
            setMessage(toUserMessage(error));
            prepareButton(googleClientId).catch(() => {}); // the used nonce is gone, so get a new one for the retry
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with',
      });
    }

    configApi.get()
      .then(async ({ googleClientId }) => {
        if (!googleClientId) return;
        await loadGoogleScript();
        await prepareButton(googleClientId);
      })
      .catch(() => { /* sign-in is optional: the shop works without it */ });

    return () => { cancelled = true; };
  }, [signIn]);

  return (
    <>
      <div ref={containerRef} />
      {message && <p className="field-error" role="alert">{message}</p>}
    </>
  );
}
