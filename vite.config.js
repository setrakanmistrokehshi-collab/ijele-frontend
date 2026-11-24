import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const { VITE_API_BACKEND_URL = 'http://localhost:4000' } = loadEnv(mode, process.cwd(), '');
  const apiProxy = { '/api': { target: VITE_API_BACKEND_URL, changeOrigin: true } };

  return {
    plugins: [react()],
    server: { port: 5173, proxy: apiProxy },
    preview: { proxy: apiProxy },
    build: { sourcemap: false },
  };
});
