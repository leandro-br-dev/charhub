import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var _b, _c, _d, _e;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiBase = (_b = env.VITE_API_BASE_URL) !== null && _b !== void 0 ? _b : 'http://localhost:3000';
    var apiPrefix = (_c = env.VITE_API_VERSION) !== null && _c !== void 0 ? _c : '/api/v1';
    var explicitHosts = (_d = env.VITE_ALLOWED_HOSTS) === null || _d === void 0 ? void 0 : _d.split(',').map(function (entry) { return entry.trim(); }).filter(Boolean);
    var publicHostname = (_e = env.PUBLIC_HOSTNAME) === null || _e === void 0 ? void 0 : _e.trim();
    var allowedHosts = ['localhost', '127.0.0.1'];
    if (publicHostname) {
        allowedHosts.push(publicHostname);
    }
    if (explicitHosts && explicitHosts.length > 0) {
        allowedHosts.push.apply(allowedHosts, explicitHosts);
    }
    // ConfiguraÃ§Ã£o HMR corrigida
    var hmrConfig = {
    // O host e o protocolo sÃ£o omitidos intencionalmente.
    // O Vite irÃ¡ inferi-los a partir do window.location do navegador.
    // Isso faz com que funcione tanto para 'localhost' (http -> ws)
    // quanto para 'dev.charhub.app' (https -> wss).
    };
    return {
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        plugins: [react()],
        esbuild: {
            drop: mode === 'production' ? ['console', 'debugger'] : [],
        },
        server: {
            port: 80, // O container do Vite roda internamente na porta 80
            host: '0.0.0.0',
            allowedHosts: allowedHosts,
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
                    rewrite: function () { return "".concat(apiPrefix, "/health"); }
                }
            }
        },
        preview: {
            port: 5173,
            host: '0.0.0.0'
        },
        build: {
            outDir: 'dist',
            minify: 'esbuild'
        }
    };
});
