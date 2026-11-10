/** localStorage that never throws (private mode, quota, blocked cookies). Only non-sensitive preferences go here. */
export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: the app keeps working without persistence */
    }
  },
};

export const CHECKOUT_DRAFT_KEY = 'checkout_draft';
export const CHECKOUT_ATTEMPT_KEY = 'checkout_attempt';

/**
 * sessionStorage that never throws. It lives only as long as the browser tab, so it suits drafts that hold personal
 * details (a half-filled checkout): they survive a reload or a dropped connection, but not a closed tab.
 */
export const sessionDraft = {
  get(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: the app keeps working without persistence */
    }
  },
  remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* nothing to clean up */
    }
  },
};
