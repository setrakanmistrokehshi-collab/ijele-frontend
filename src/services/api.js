import { http } from './httpClient.js';

const unwrap = (request) => request.then((response) => response.data);

export const configApi = { get: () => unwrap(http.get('/config')) };

export const catalogApi = {
  list: () => unwrap(http.get('/products')),
  get: (sku) => unwrap(http.get(`/products/${encodeURIComponent(sku)}`)),
};

export const checkoutApi = { createSession: (payload, idempotencyKey) =>
    unwrap(http.post('/checkout/create-session', payload, { headers: { 'Idempotency-Key': idempotencyKey } })) };

export const ordersApi = {
  track: (lookup) => unwrap(http.post('/orders/track', lookup)),
  listForGuest: (lookup) => unwrap(http.post('/orders/mine', lookup)),
};

export const accountApi = {
  getGoogleNonce: () => unwrap(http.post('/user/google-nonce')),
  signInWithGoogle: (credential) => unwrap(http.post('/user/google', { credential })),
  currentUser: () => unwrap(http.get('/user/me')),
  signOut: () => unwrap(http.post('/user/logout')),
  listOrders: () => unwrap(http.get('/user/orders')),
};

export const contactApi = { send: (message) => unwrap(http.post('/contact', message)) };
