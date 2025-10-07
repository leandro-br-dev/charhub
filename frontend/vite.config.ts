import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL ?? 'http://localhost:3000';
  const apiPrefix = env.VITE_API_VERSION ?? '/api/v1';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
          secure: false
        },
        '/health': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
          rewrite: () => `${apiPrefix}/health`
        }
      }
    },
    preview: {
      port: 5173
    },
    build: {
      outDir: 'dist'
    }
  };
});

