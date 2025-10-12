import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL ?? 'http://localhost:3000';
  const apiPrefix = env.VITE_API_VERSION ?? '/api/v1';

  const explicitHosts = env.VITE_ALLOWED_HOSTS?.split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

  const publicHostname = env.PUBLIC_HOSTNAME?.trim();

  const allowedHosts: string[] = ['localhost', '127.0.0.1'];
  if (publicHostname) {
    allowedHosts.push(publicHostname);
  }
  if (explicitHosts && explicitHosts.length > 0) {
    allowedHosts.push(...explicitHosts);
  }

  // Configuração HMR corrigida
  const hmrConfig = {
    // O host e o protocolo são omitidos intencionalmente.
    // O Vite irá inferi-los a partir do window.location do navegador.
    // Isso faz com que funcione tanto para 'localhost' (http -> ws)
    // quanto para 'dev.charhub.app' (https -> wss).
    clientPort: 5173, // Esta é a porta do host mapeada no docker-compose.yml
  };

  return {
    plugins: [react(), tsconfigPaths()],
    server: {
      port: 80, // O container do Vite roda internamente na porta 80
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