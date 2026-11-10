// Production server for the storefront. It serves the Vite build and injects SEO tags.
// It does NOT proxy /api or /admin: the reverse proxy in front (see deploy/Caddyfile.example) routes those.
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { BUILD_DIRECTORY, PORT, SITE_URL } from './config.js';
import { SECURITY_HEADERS } from './security-headers.js';
import { buildSitemap, resolveSeo, robotsTxt } from './seo-renderer.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain',
};

function send(response, status, headers, body) {
  response.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  response.end(body);
}
const sendNotFound = (response) => send(response, 404, { 'Content-Type': 'text/plain' }, 'Not found');

async function sendStaticFile(response, requestPath) {
  try {
    const filePath = path.join(BUILD_DIRECTORY, path.normalize(decodeURIComponent(requestPath)));
    if (!filePath.startsWith(BUILD_DIRECTORY + path.sep)) return sendNotFound(response); // block ../ traversal
    const cacheControl = requestPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
    const contentType = MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream';
    return send(response, 200, { 'Content-Type': contentType, 'Cache-Control': cacheControl }, await readFile(filePath));
  } catch {
    return sendNotFound(response);
  }
}

let htmlTemplate = null;
async function sendApp(response, pathname) {
  htmlTemplate ??= await readFile(path.join(BUILD_DIRECTORY, 'index.html'), 'utf8');
  const { status, tags } = await resolveSeo(pathname);
  send(response, status, { 'Content-Type': MIME_TYPES['.html'], 'Cache-Control': 'no-cache' }, htmlTemplate.replace('<!--seo-head-->', tags));
}

http.createServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost');
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, { Allow: 'GET, HEAD' }, '');
    if (pathname === '/robots.txt') return send(response, 200, { 'Content-Type': MIME_TYPES['.txt'] }, robotsTxt());
    if (pathname === '/sitemap.xml') return send(response, 200, { 'Content-Type': 'application/xml' }, await buildSitemap());
    if (path.extname(pathname)) return await sendStaticFile(response, pathname);
    return await sendApp(response, pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname);
  } catch (error) {
    console.error('Request failed:', error.message); // log server-side only; visitors get a generic message
    return send(response, 500, { 'Content-Type': 'text/plain' }, 'Something went wrong');
  }
}).listen(PORT, () => console.log(`Storefront on ${SITE_URL}`));
