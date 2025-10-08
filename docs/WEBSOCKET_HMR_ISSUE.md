# WebSocket HMR Connection Issue - Troubleshooting Report

**Status**: ❌ UNRESOLVED
**Date**: 2025-10-08
**Severity**: Medium (affects development experience, not production)

## Problem Description

Vite HMR (Hot Module Replacement) WebSocket fails to connect when accessing the application via localhost or dev.charhub.app in development mode.

### Error Messages

```
WebSocket connection to 'ws://localhost/?token=yNkdMNEZYvAh' failed:
[vite] failed to connect to websocket.
your current setup:
  (browser) localhost/ <--[HTTP]--> localhost:80/ (server)
  (browser) localhost:/ <--[WebSocket (failing)]--> localhost:80/ (server)
Check out your Vite / network configuration and https://vite.dev/config/server-options.html#server-hmr
```

### Expected Behavior

- WebSocket should connect to `ws://localhost:5173` (direct connection to Vite, bypassing Nginx)
- HMR should work properly, allowing hot-reload of React components during development

### Actual Behavior

- WebSocket attempts to connect to `ws://localhost` (port 80)
- Connection fails because Nginx is not proxying WebSocket correctly
- Application works normally, but hot-reload does not function

## Environment

- **Node Version**: 20-alpine
- **Vite Version**: 7.1.9
- **Docker Compose**: Yes (multi-container setup)
- **Reverse Proxy**: Nginx
- **Access Methods**:
  - Direct: http://localhost/ (through Nginx)
  - Tunnel: https://dev.charhub.app/ (through Cloudflare Tunnel + Nginx)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ BROWSER                                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ HTTP → localhost:80 → Nginx → frontend:80 (Vite)   │
│                                                     │
│ WebSocket (failing) → localhost:80 → Nginx → ???   │
│                                                     │
│ WebSocket (expected) → localhost:5173 → Vite        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Attempted Solutions

### 1. Initial Configuration - Dynamic Host Detection ❌

**Attempt**: Configure vite.config.ts to auto-detect host from `window.location.host`

**Changes**:
- Set `hmrConfig = {}` (empty object)
- Removed hardcoded `dev.charhub.app` from HMR config
- Let Vite determine host automatically

**Result**: Failed - WebSocket still tried to connect to wrong host

---

### 2. Environment Variable Configuration ❌

**Attempt**: Use environment variables to control HMR host

**Changes**:
- Added `VITE_HMR_HOST`, `VITE_HMR_PROTOCOL`, `VITE_HMR_CLIENT_PORT` to .env
- Commented out `VITE_HMR_HOST` to allow auto-detection
- Removed `PUBLIC_HOSTNAME` and `PUBLIC_FACING_URL` from frontend container environment

**Result**: Failed - WebSocket still used port 80 instead of 5173

---

### 3. Volume Mounting for Hot-Reload ❌

**Attempt**: Mount source code as Docker volumes to ensure config changes are picked up

**Changes in docker-compose.yml**:
```yaml
volumes:
  - type: bind
    source: ./frontend/src
    target: /app/src
  - type: bind
    source: ./frontend/vite.config.ts
    target: /app/vite.config.ts
  - type: bind
    source: ./frontend/.env
    target: /app/.env
  - /app/node_modules
```

**Result**: Partial success - Files are mounted correctly, but HMR config not applied

---

### 4. Port Mapping + Fixed HMR Config ❌

**Attempt**: Map port 5173 on host to bypass Nginx, with hardcoded HMR config

**Changes in docker-compose.yml**:
```yaml
ports:
  - "5173:80"  # Map host:5173 to container:80
```

**Changes in vite.config.ts**:
```typescript
const hmrConfig = {
  host: 'localhost',
  protocol: 'ws',
  clientPort: 5173,
};
```

**Result**: Failed - WebSocket still connects to port 80

**Verification**:
- Port 5173 is accessible: `curl http://localhost:5173/` returns 200 OK
- Vite server is running and serving files
- Browser continues to use port 80 for WebSocket

---

### 5. Nginx WebSocket Proxy Headers ❌

**Attempt**: Add WebSocket upgrade headers to Nginx configuration

**Changes in nginx/conf.d/app.conf**:
```nginx
location / {
    proxy_pass http://frontend_service;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support for Vite HMR
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

**Result**: Failed - Nginx proxies WebSocket, but still to wrong destination

---

## Analysis Based on Working Old Version

### Old Version (charhub_dev_old_version) - WORKING ✅

**Key Configuration**:

1. **Separate internal/external ports**:
   - Internal: `FRONTEND_INTERNAL_PORT=5173`
   - External: `FRONTEND_PORT_MAP=5174`

2. **Explicit HMR config**:
   ```javascript
   hmr: {
     protocol: 'ws',
     host: 'localhost',
     clientPort: viteHmrClientPort, // 5174
   }
   ```

3. **Port mapping**:
   ```
   ports:
     - "5174:5173"  # Different ports!
   ```

### Current Version - NOT WORKING ❌

**Key Differences**:

1. **Same port mapping**:
   ```
   ports:
     - "5173:80"  # Container runs on port 80
   ```

2. **Vite server port**:
   - Configured in vite.config.ts as 5173
   - Overridden by Dockerfile CMD: `--port 80`

3. **Mismatch**: Browser receives HMR config to connect to port 5173, but Vite is actually on port 80

## Root Cause Hypothesis

The issue appears to be a **port configuration mismatch**:

1. **vite.config.ts** sets `server.port: 5173` and `hmr.clientPort: 5173`
2. **Dockerfile** overrides with `vite --host 0.0.0.0 --port 80`
3. **docker-compose.yml** maps host `5173:80` (host:container)
4. **Browser** receives JavaScript telling it to connect to `ws://localhost:5173`
5. **But WebSocket goes to port 80** (possibly due to browser behavior or cached config)

## Potential Solutions to Try

### Option A: Align All Ports to 5173

1. Update Dockerfile to use port 5173 instead of 80
2. Keep vite.config.ts with port 5173
3. Update docker-compose nginx proxy to use `frontend:5173`
4. Keep HMR direct mapping as `5173:5173`

### Option B: Dedicated HMR Route in Nginx

1. Add specific Nginx location for HMR WebSocket:
   ```nginx
   location /_vite_hmr {
       proxy_pass http://frontend:80;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```
2. Configure Vite to use path-based HMR

### Option C: Use Different Port for HMR

1. Run Vite on port 80 for HTTP (through Nginx)
2. Expose additional port (e.g., 24678) for HMR only
3. Configure HMR to use that port

### Option D: Disable HMR Temporarily

For development without HMR:
```bash
VITE_HMR=false npm run dev
```

## Impact

**Current Impact**:
- ⚠️ Hot Module Replacement does not work
- ✅ Application functions normally (full page refresh works)
- ⚠️ Development experience degraded (must manually refresh)

**Production Impact**:
- ✅ No impact (production uses static build, no HMR)

## Files Modified During Troubleshooting

1. `frontend/vite.config.ts` - HMR configuration changes
2. `frontend/.env` - Environment variable configuration
3. `frontend/.env.example` - Documentation updates
4. `docker-compose.yml` - Port mappings and volumes
5. `nginx/conf.d/app.conf` - WebSocket proxy headers
6. `backend/Dockerfile` - npm retry configuration (unrelated fix)

## References

- [Vite HMR Configuration](https://vite.dev/config/server-options.html#server-hmr)
- [Working old version config](../charhub_dev_old_version/frontend/web/vite.config.js)
- [Working old nginx config](../charhub_dev_old_version/nginx/conf/default.conf)

## Next Steps

1. Try Option A (align all ports to 5173)
2. Add debug logging to understand what port browser is actually trying
3. Check if vite.config.ts is being transpiled correctly (TypeScript compilation)
4. Test with simple static `hmr: { port: 5173, host: 'localhost', protocol: 'ws' }`
5. Consider reverting to simpler setup similar to old working version

---

**Last Updated**: 2025-10-08
**Assignee**: TBD
**Priority**: Medium
