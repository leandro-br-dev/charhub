# Frontend OAuth Client

## Overview
React + TypeScript single-page application that triggers OAuth 2.0 flows for Google and Facebook via the backend service. It delivers a branded login area, a callback handler, and a restricted dashboard that is only available to authenticated users. Styling is powered by Tailwind CSS and the bundle is produced with Vite.

## Tech Stack
- Node.js 20 as the toolchain version
- React 18 with TypeScript
- Vite for bundling and dev server
- Tailwind CSS (stable 3.x) with `@tailwindcss/forms`
- Axios for backend API calls
- TanStack Query for future data synchronization
- React Router for client-side navigation

## Project Structure
```
frontend/
|- index.html
|- package.json
|- tsconfig.json
|- tsconfig.node.json
|- postcss.config.js
|- tailwind.config.ts
|- vite.config.ts
|- .env.example
|- Dockerfile
|- public/
|- src/
|  |- App.tsx
|  |- main.tsx
|  |- index.css
|  |- vite-env.d.ts
|  |- components/
|  |  |- features/
|  |  |  |- LanguageSwitcher.tsx
|  |  |  |- ThemeToggle.tsx
|  |  |  |- UserMenu.tsx
|  |  |- forms/
|  |  |  |- LoginButton.tsx
|  |  |- layout/
|  |  |  |- Header.tsx
|  |  |  |- ProtectedRoute.tsx
|  |  |- ui/
|  |  |  |- Button.tsx
|  |  |  |- SmartDropdown.tsx
|  |- hooks/useAuth.tsx
|  |- lib/api.ts
|  |- pages/
|  |  |- Callback.tsx
|  |  |- Dashboard.tsx
|  |  |- Login.tsx
|  |  |- NotFound.tsx
|  |- types/auth.ts
```

## Environment Variables
```
VITE_API_BASE_URL=http://localhost
VITE_API_VERSION=/api/v1
VITE_GOOGLE_AUTH_PATH=/api/v1/oauth/google
VITE_FACEBOOK_AUTH_PATH=/api/v1/oauth/facebook
VITE_GOOGLE_CALLBACK_PATH=/api/v1/oauth/google/callback
VITE_FACEBOOK_CALLBACK_PATH=/api/v1/oauth/facebook/callback
```
All build-time variables must be prefixed with `VITE_` so Vite exposes them to the client bundle.

## Authentication Flow
1. The login page renders provider buttons that redirect to `VITE_API_BASE_URL + VITE_*_AUTH_PATH`.
2. The backend starts the OAuth flow and ultimately redirects back to `/auth/callback` with either:
   - `token` and an encoded `user` payload, or
   - `code` and `state`, allowing the frontend to exchange them with the backend via `/api/v1/oauth/{provider}/callback`.
3. `pages/Callback.tsx` finalizes the flow, persists the session via `useAuth`, and routes the user to `/dashboard`.
4. Protected routes are wrapped with `ProtectedRoute` to ensure only logged-in users gain access.

## Key Modules
- `hooks/useAuth.tsx`: centralizes session state, provides helpers to start provider logins, finalize sessions, and call logout.
- `lib/api.ts`: Axios instance configured with `withCredentials` for cookie-based sessions and version-aware fallbacks.
- `components/features/LanguageSwitcher.tsx`: Flag-based selector that syncs the interface language.
- `components/forms/LoginButton.tsx`: Tailwind-styled buttons for each provider.
- `components/features/UserMenu.tsx`: Displays the active user and issues logout requests.
- `components/ui/SmartDropdown.tsx`: Headless UI wrapper that positions floating menus.
- `pages/Dashboard.tsx`: Restricted area showing profile details and follow-up actions.

## Local Development
1. `cp frontend/.env.example frontend/.env` and adjust the URLs.
2. `npm install` to fetch dependencies.
3. `npm run dev` starts Vite at `http://localhost:5173` with proxy rules for `/api` and `/health` hitting the backend (`vite.config.ts`).
4. `npm run build` generates production assets in `dist/`.
5. `npm run preview` serves the built bundle locally for smoke testing.

## Docker & Orchestration
- The provided `Dockerfile` performs a multi-stage build (Node build phase + Nginx static host) aligned with the backend and docker-compose setup.
- `docker-compose.yml` mounts the built frontend behind the shared Nginx gateway and networks it with the backend container.

## Testing Recommendations
- Component tests for login buttons and protected route behaviour.
- Integration tests mocking the callback exchange with tools like MSW.
- E2E scenarios (Cypress/Playwright) validating the redirect loop with staging credentials.

## Security Notes
- Always validate the `state` returned from providers (handled server-side).
- Prefer HTTP-only cookies for long-lived sessions; the UI is ready to skip storing tokens locally when that is the case.
- Serve the app over HTTPS in production to protect OAuth redirects.

## Next Steps
- Connect Unity clients to the same session endpoints exposed by the backend.
- Add analytics or telemetry to track auth success/failure events.
- Integrate feature flags or role-based guards once backend authorization rules are available.
