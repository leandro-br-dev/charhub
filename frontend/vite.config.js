import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var _b, _c;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiBase = (_b = env.VITE_API_BASE_URL) !== null && _b !== void 0 ? _b : 'http://localhost:3000';
    var apiPrefix = (_c = env.VITE_API_VERSION) !== null && _c !== void 0 ? _c : '/api/v1';
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
                    rewrite: function () { return "".concat(apiPrefix, "/health"); }
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
