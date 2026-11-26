// The storefront's security headers, built in one place. Used by the Node server (server/security-headers.js) and by
// the Vercel middleware. vercel.json repeats the same values for static files: a test fails if they ever drift apart.
// Only origins the storefront really uses are listed. The admin dashboard has its own, stricter policy.

export function buildSecurityHeaders({ https }) {
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
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', // needed by the Google sign-in popup
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    ...(https && { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }),
    'Content-Security-Policy': contentSecurityPolicy,
  };
}
