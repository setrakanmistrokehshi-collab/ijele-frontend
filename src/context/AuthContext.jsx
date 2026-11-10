import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { accountApi } from '../services/api.js';
import { unlinkPushIdentity } from '../services/pushNotifications.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/** Customer session state. The session itself lives in an HttpOnly cookie; JavaScript never sees a token. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    accountApi.currentUser()
      .then((data) => { if (active) setUser(data.user); })
      .catch(() => { if (active) setUser(null); }) // 401 simply means "signed out"
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (googleCredential) => {
    const data = await accountApi.signInWithGoogle(googleCredential);
    setUser(data.user);
  }, []);
  const signOut = useCallback(async () => {
    try {
      await accountApi.signOut();
    } finally {
      setUser(null);
      window.google?.accounts?.id?.disableAutoSelect?.(); // stop Google silently re-signing this browser in
      unlinkPushIdentity();
    }
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
