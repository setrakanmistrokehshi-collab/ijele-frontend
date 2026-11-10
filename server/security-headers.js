import { BEHIND_TLS_PROXY } from './config.js';

// Only origins the storefront really uses are listed. The admin dashboard has its own, stricter policy.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' https://cdn.onesignal.com https://accounts.google.com/gsi/client",
  "connect-src 'self' https://accounts.google.com/gsi/ https://*.onesignal.com",
  "img-src 'self' data: https://res.cloudinary.com https://lh3.googleusercontent.com https://*.onesignal.com",
  "style-src 'self' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
  "font-src 'self' https://fonts.gstatic.com",
  'frame-src https://accounts.google.com/gsi/',
  "object-src 'none'",
  "form-action 'self' https://*.bachs.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  ...(BEHIND_TLS_PROXY ? ['upgrade-insecure-requests'] : []),
].join('; ');

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', // needed by the Google sign-in popup
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  ...(BEHIND_TLS_PROXY && { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }),
  'Content-Security-Policy': contentSecurityPolicy,
};
