# Frontend Reference

The frontend is a React 18 + TypeScript single-page application built with Vite. It focuses on authentication, localization, and preparing the groundwork for future modular game experiences.

## Tooling & Libraries

- **React 18** with hooks and functional components.
- **TypeScript** strict configuration.
- **Vite** for development server and production bundling.
- **Tailwind CSS** (with `@tailwindcss/forms`) for styling.
- **React Router DOM** for client-side routing.
- **i18next** + `i18next-browser-languagedetector` + `i18next-http-backend` for localization.
- **Axios** for API communication.
- **@headlessui/react** primitives, extended by custom `SmartDropdown`.

## Application Flow

1. **Auth bootstrap** – `useAuth` pulls token + user info from URL query string (OAuth callback) or localStorage, then exposes session helpers.
2. **Routing** – `App.tsx` decides whether to render the marketing/auth layouts (`/`, `/login`, `/signup`) or the authenticated shell (`/dashboard`, etc.).
3. **External auth pages** – `ExternalAuthLayout` frames marketing imagery, language/theme toggles, and login/signup forms.
4. **OAuth interactions** – `Login` and `Signup` pages call `useAuth.loginWithGoogle/Facebook` which redirect to backend OAuth endpoints with an encoded `redirect_uri`.
5. **Callback handler** – `pages/Callback.tsx` completes the flow by exchanging code/token, storing the user, and routing to `/dashboard`.
6. **Localization** – `i18n.ts` loads resources from `/api/v1/i18n/<lang>/<namespace>`, falling back gracefully when translations are missing.
7. **UI widgets** – Feature components (language switcher, theme toggle, user menu) surface global functionality in both marketing and authenticated shells.

## Directory Highlights (`frontend/src`)

| Path | Purpose |
|------|---------|
| `App.tsx` | Router definition and layout switching. |
| `components/features/LanguageSwitcher.tsx` | Flag-based dropdown backed by Cloudflare-hosted translations. |
| `components/features/ThemeToggle.tsx` | Light/dark/system theme picker with persistence via `useTheme`. |
| `components/features/UserMenu.tsx` | Displays current user and triggers logout. |
| `components/forms/LoginButton.tsx` | Provider-specific CTA buttons. |
| `components/layout/Header.tsx` | Navigation shell for authenticated sections. |
| `components/layout/ProtectedRoute.tsx` | Guards private routes using `useAuth`. |
| `components/ui/Button.tsx` | Reusable Tailwind button variants. |
| `components/ui/SmartDropdown.tsx` | Headless UI-based dropdown with portal positioning. |
| `hooks/useAuth.tsx` | Session store, OAuth redirect helpers, logout.
| `hooks/useTheme.tsx` | Theme context (not shown in repo tree but imported by ThemeToggle). |
| `layouts/ExternalAuthLayout.tsx` | Frame for home/login/signup pages. |
| `lib/api.ts` | Axios instance preconfigured with base URL + credentials. |
| `pages/*` | Screen components (Home, Login, Signup, Callback, Dashboard, NotFound). |
| `i18n.ts` | i18next initialization with backend loader + detection order. |

## Environment Variables (`frontend/.env`)

- `VITE_API_BASE_URL` – Base URL for API requests (defaults to relative path when empty).
- `VITE_API_VERSION` – API prefix (default `/api/v1`).
- `VITE_GOOGLE_AUTH_PATH`, `VITE_FACEBOOK_AUTH_PATH` – Frontend paths used to trigger OAuth (`/api/v1/oauth/...`).
- `VITE_GOOGLE_CALLBACK_PATH`, `VITE_FACEBOOK_CALLBACK_PATH` – Callback URIs for exchanging tokens.
- `VITE_CDN_PUBLIC_URL_BASE` – Placeholder for future CDN asset host (not yet consumed).
- `VITE_GOOGLE_AUTH_PATH`/`VITE_FACEBOOK_AUTH_PATH` align with backend routes and are embedded in redirect URLs.

## Styling & UX

- Tailwind config lives at `tailwind.config.ts` (with design tokens for primary colors, dark theme, etc.).
- Global styles are in `index.css`, including dark mode base, layout defaults, and typography.
- Material Symbols icon font is used via `<span className="material-symbols-outlined">` across components.

## State & Persistence

- `useAuth` stores the authenticated user in `localStorage` under `charhub.auth.user` and removes the `token`/`user` query params once consumed.
- Theme choice persists via `localStorage` (see `useTheme.tsx`).
- i18next caches detected language in `localStorage` (`i18nextLng`).

## Build & Deployment

- `npm run dev` – Vite dev server, proxies `/api` to backend (configure in `vite.config.ts`).
- `npm run build` – Type-check (`tsc -b`) and bundle production assets; `SmartDropdown` and LanguageSwitcher compile cleanly with the current setup.
- `npm run preview` – Serve the built `dist/` locally for smoke testing.
- Docker multi-stage build defined in `frontend/Dockerfile`; final image serves static files with Nginx.

## Current UI Capabilities

- Marketing hero with CTA buttons linking to login & signup flows.
- OAuth login CTA buttons with provider icons.
- Callback status page that displays progress/success/error states.
- Protected dashboard placeholder awaiting feature build-out.
- Language switcher with 12 locales and Cloudflare R2-ready dataset.
- Theme toggle with dropdown & iconography.
- User menu showing avatar/initials and logout action (no profile editing yet).

See `docs/TODO.md` for pending UI tasks (dashboards, premium features, responsive improvements) and `docs/DEV_OPERATIONS.md` for tunnel setup plus shared environment configuration.