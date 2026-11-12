import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to Vite, which forwards /api to the backend (same origin, so cookies work).
export default defineConfig(({ mode }) => {
  const projectRoot = path.dirname(fileURLToPath(import.meta.url));
  const { VITE_API_BACKEND_URL = 'http://localhost:4000' } = loadEnv(mode, projectRoot, '');
  let backend;
  try {
    backend = new URL(VITE_API_BACKEND_URL);
  } catch {
    throw new Error('VITE_API_BACKEND_URL must be an absolute backend origin.');
  }
  if (!['http:', 'https:'].includes(backend.protocol) || backend.username || backend.password || backend.pathname !== '/') {
    throw new Error('VITE_API_BACKEND_URL must be an HTTP(S) origin without credentials or a path.');
  }
  const apiProxy = { '/api': { target: backend.origin, changeOrigin: true } };

  return {
    plugins: [react()],
    server: { port: 5173, proxy: apiProxy },
    preview: { proxy: apiProxy },
    build: { sourcemap: false }, // do not publish source maps
  };
});
