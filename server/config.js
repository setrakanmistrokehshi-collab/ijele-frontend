import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PORT = Number(process.env.PORT || 5173);
export const BACKEND_URL = new URL(process.env.BACKEND_URL || 'http://localhost:4000');
export const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
// Set TRUST_PROXY=1 when Caddy or nginx terminates TLS in front of this server. It enables HSTS and
// upgrade-insecure-requests, which must only be sent when the site really is served over HTTPS.
export const BEHIND_TLS_PROXY = process.env.TRUST_PROXY === '1';
export const BUILD_DIRECTORY = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
