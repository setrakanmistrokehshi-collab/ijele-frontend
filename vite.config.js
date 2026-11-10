import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to Vite, which forwards /api to the backend (same origin, so cookies work).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
  build: { sourcemap: false }, // do not publish source maps
});
