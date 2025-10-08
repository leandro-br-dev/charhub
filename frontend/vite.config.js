import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiBase = (_b = env.VITE_API_BASE_URL) !== null && _b !== void 0 ? _b : 'http://localhost:3000';
    var apiPrefix = (_c = env.VITE_API_VERSION) !== null && _c !== void 0 ? _c : '/api/v1';
    var explicitHosts = (_d = env.VITE_ALLOWED_HOSTS) === null || _d === void 0 ? void 0 : _d.split(',').map(function (entry) { return entry.trim(); }).filter(Boolean);
    var publicHostname = (_e = env.PUBLIC_HOSTNAME) === null || _e === void 0 ? void 0 : _e.trim();
    var publicFacingUrl = (_f = env.PUBLIC_FACING_URL) === null || _f === void 0 ? void 0 : _f.trim();
    var allowedHosts = ['localhost', '127.0.0.1'];
    if (publicHostname) {
        allowedHosts.push(publicHostname);
    }
    if (explicitHosts && explicitHosts.length > 0) {
        allowedHosts.push.apply(allowedHosts, explicitHosts);
    }
    else if (mode !== 'development') {
        allowedHosts.push('dev.charhub.app');
    }
    var fallbackHost = ((_g = env.VITE_HMR_HOST) === null || _g === void 0 ? void 0 : _g.trim()) || publicHostname || (mode === 'development' ? 'localhost' : 'dev.charhub.app');
    var isHttps = Boolean(publicFacingUrl && publicFacingUrl.startsWith('https://'));
    var inferredClientPort = env.VITE_HMR_CLIENT_PORT ? Number(env.VITE_HMR_CLIENT_PORT) : undefined;
    var hmrProtocolEnv = (_j = (_h = env.VITE_HMR_PROTOCOL) === null || _h === void 0 ? void 0 : _h.trim()) === null || _j === void 0 ? void 0 : _j.toLowerCase();
    var hmrConfig = {};
    if (fallbackHost) {
        hmrConfig.host = fallbackHost;
    }
    if (hmrProtocolEnv === 'ws' || hmrProtocolEnv === 'wss') {
        hmrConfig.protocol = hmrProtocolEnv;
    }
    else if (isHttps) {
        hmrConfig.protocol = 'wss';
    }
    if (!Number.isNaN(inferredClientPort !== null && inferredClientPort !== void 0 ? inferredClientPort : NaN) && (inferredClientPort !== null && inferredClientPort !== void 0 ? inferredClientPort : 0) > 0) {
        hmrConfig.clientPort = inferredClientPort;
    }
    else if (hmrConfig.protocol === 'wss') {
        hmrConfig.clientPort = 443;
    }
    return {
        plugins: [react()],
        server: {
            port: 5173,
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
            outDir: 'dist'
        }
    };
});
