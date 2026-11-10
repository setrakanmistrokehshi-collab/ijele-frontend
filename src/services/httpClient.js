import axios from 'axios';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
const STATUS_MESSAGES = {
  400: 'Please check the details you entered and try again.',
  401: 'Please sign in to continue.',
  403: 'You do not have access to this.',
  404: 'We could not find what you were looking for.',
  429: 'Too many attempts. Please wait a few minutes and try again.',
};

/** One shared axios instance: same-origin, cookies on, short timeout, CSRF-defence header. */
export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'X-Requested-With': 'aurora' },
});

export const isUnauthorized = (error) => axios.isAxiosError(error) && error.response?.status === 401;
export const isNotFound = (error) => axios.isAxiosError(error) && error.response?.status === 404;
export const isRateLimited = (error) => axios.isAxiosError(error) && error.response?.status === 429;
/** Seconds the server asked us to wait (Retry-After header), or null. */
export function retryAfterSeconds(error) {
  const seconds = Number(error?.response?.headers?.['retry-after']);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/**
 * Turns any failure into a short message that is safe to show. Raw server text, stack traces and
 * status internals are never displayed; only short conflict messages (e.g. "out of stock") pass through.
 */
export function toUserMessage(error) {
  if (!axios.isAxiosError(error)) return FALLBACK_MESSAGE;
  if (!error.response) return 'We could not reach the store. Check your connection and try again.';
  const { status, data } = error.response;
  const isSafeServerText = (status === 409 || status === 422) && typeof data?.error === 'string' && data.error.length <= 200;
  if (isSafeServerText) return data.error;
  if (status === 429 && retryAfterSeconds(error)) {
    const minutes = Math.ceil(retryAfterSeconds(error) / 60);
    return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
  if (status === 503) return 'We are very busy right now. Please wait a moment and try again.';
  return status >= 500 ? FALLBACK_MESSAGE : STATUS_MESSAGES[status] ?? FALLBACK_MESSAGE;
}
