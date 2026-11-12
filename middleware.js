import { rewrite } from '@vercel/edge';

export const config = { matcher: '/api/:path*' };

export default function middleware(request) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) return new Response('BACKEND_URL is not configured', { status: 500 });

  let backend;
  try {
    backend = new URL(backendUrl);
  } catch {
    return new Response('BACKEND_URL must be an absolute URL', { status: 500 });
  }

  if (!['http:', 'https:'].includes(backend.protocol) || backend.username || backend.password || backend.pathname !== '/') {
    return new Response('BACKEND_URL must be an HTTP(S) origin without credentials or a path', { status: 500 });
  }
  if (process.env.NODE_ENV === 'production' && backend.protocol !== 'https:') {
    return new Response('BACKEND_URL must use HTTPS in production', { status: 500 });
  }

  const url = new URL(request.url);
  return rewrite(`${backend.origin}${url.pathname}${url.search}`);
}
