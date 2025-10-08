import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL ?? 'http://localhost:3000';
  const apiPrefix = env.VITE_API_VERSION ?? '/api/v1';

  const explicitHosts = env.VITE_ALLOWED_HOSTS?.split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

  const publicHostname = env.PUBLIC_HOSTNAME?.trim();
  const publicFacingUrl = env.PUBLIC_FACING_URL?.trim();

  const allowedHosts: string[] = ['localhost', '127.0.0.1'];
  if (publicHostname) {
    allowedHosts.push(publicHostname);
  }
  if (explicitHosts && explicitHosts.length > 0) {
    allowedHosts.push(...explicitHosts);
  } else if (mode !== 'development') {
    allowedHosts.push('dev.charhub.app');
  }

  // HMR configuration - let Vite auto-detect the host from browser location
  // Only override if explicitly set via env vars
  const explicitHmrHost = env.VITE_HMR_HOST?.trim();
  const inferredClientPort = env.VITE_HMR_CLIENT_PORT ? Number(env.VITE_HMR_CLIENT_PORT) : undefined;
  const hmrProtocolEnv = env.VITE_HMR_PROTOCOL?.trim()?.toLowerCase();

  // HMR configuration strategy:
  // - In development: use clientPort 5173 (mapped host port) so browser connects directly to Vite, bypassing nginx
  // - Protocol is always 'ws' for localhost (no SSL on direct Vite connection)
  // - Host is 'localhost' (browser connects to localhost:5173)
  const hmrConfig: { host: string; protocol: 'ws'; clientPort: number } = {
    host: 'localhost',
    protocol: 'ws',
    clientPort: 5173, // This is the host port mapped in docker-compose.yml
  };

  // Allow override via environment variables if needed
  if (explicitHmrHost) {
    hmrConfig.host = explicitHmrHost;
  }

  if (hmrProtocolEnv === 'ws' || hmrProtocolEnv === 'wss') {
    hmrConfig.protocol = hmrProtocolEnv;
  }

  if (!Number.isNaN(inferredClientPort ?? NaN) && (inferredClientPort ?? 0) > 0) {
    hmrConfig.clientPort = inferredClientPort as number;
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts,
      hmr: hmrConfig,
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
      port: 5173,
      host: '0.0.0.0'
    },
    build: {
      outDir: 'dist'
    }
  };
});
