# CharHub Frontend

## Overview
React 18 + TypeScript SPA built with Vite and Tailwind. It implements OAuth-first auth, chat, characters, and profile. Authenticated UI uses a desktop Navigation Rail + Sidebar and a mobile bottom navigation.

## Stack
- React 18 + TypeScript
- Vite + Tailwind CSS
- React Router v6
- i18next
- Axios for API (`src/lib/api.ts`)

## App Architecture
- Routing shell: `src/App.tsx`
  - Public routes (home, login, signup, auth callback)
  - Protected routes under `AuthenticatedLayout` (dashboard, chat, characters, profile)
- Authenticated layout: `src/layouts/AuthenticatedLayout.tsx`
  - Desktop: `NavigationRail` + `Sidebar`
  - Mobile: `MobileFooterNav` (bottom nav)
  - Main content via `<Outlet />`

## Notable Components
- Layout (`src/components/layout/`)
  - `NavigationRail`, `Sidebar`, `ProtectedRoute`, `MobileFooterNav`
- UI (`src/components/ui/`)
  - `Button`, `Dialog`, `Modal`, `SmartDropdown`, `Avatar`, `CachedImage`, `Textarea`, `Input`, `Select`
- Features (`src/components/features/`)
  - `LanguageSwitcher`, `ThemeToggle`, `UserMenu`

## Pages (Colocation)
Pages are grouped by feature with colocated components/hooks.

```
src/pages/
  (auth)/
    login/               # Login
    signup/              # Signup
    callback/            # OAuth callback handler
    shared/
      components/
      hooks/

  (characters)/
    hub/                 # Gallery/listing
    create/              # Create character
    [characterId]/       # Detail
      edit/              # Edit
    shared/
      components/
        CharacterCard.tsx
        CharacterFormLayout.tsx
        CharacterAvatarUploader.tsx
        CharacterListSidebar.tsx
      hooks/
      utils/

  (chat)/
    index.tsx            # Chat landing
    new/                 # Create new conversation
    [conversationId]/    # Conversation view
    shared/
      components/
        ChatView.tsx
        MessageList.tsx
        MessageItem.tsx
        ConversationHistory.tsx
        ConversationHeader.tsx
        MessageInput.tsx
      hooks/

  dashboard/
  home/
  not-found/
  profile/
```

## Data & Services
- `src/services/characterService.ts`, `chatService.ts`, `userService.ts`
- API base and version via env (see below).

## Images & Caching
- Use `CachedImage` to avoid redundant R2 fetches; it dedupes concurrent requests and caches Blob URLs with TTL.
- Avatars (`Avatar`) are implemented on top of `CachedImage`.

## Character Cards
- `CharacterCard.tsx` mirrors the legacy layout and behaviour:
  - Large cover, blur for sensitive, age badge, favorite toggle
  - Click action: view/edit/startChat
  - Optional stats footer (chats, favorites, stickers)

## Chat UX
- `ChatView.tsx` provides the chat surface with a fixed input and auto-scroll.
- `MessageList.tsx` renders messages with date separators.

## Auth Flow
- `(auth)/login`, `(auth)/signup` start OAuth via backend
- `(auth)/callback` finalizes login using `token` or exchanging `code + state`
- `ProtectedRoute` guards authenticated routes

## Environment Variables
Build-time vars (must be prefixed with `VITE_`):
```
VITE_API_BASE_URL=http://localhost
VITE_API_VERSION=/api/v1
VITE_GOOGLE_AUTH_PATH=/api/v1/oauth/google
VITE_FACEBOOK_AUTH_PATH=/api/v1/oauth/facebook
VITE_GOOGLE_CALLBACK_PATH=/api/v1/oauth/google/callback
VITE_FACEBOOK_CALLBACK_PATH=/api/v1/oauth/facebook/callback
VITE_ALLOWED_HOSTS=localhost
```

## Development
- `cp frontend/.env.example frontend/.env`
- `npm install`
- `npm run dev` (Vite dev server)
- `npm run build` (build to `dist/`)
- `npm run preview` (serve built output)

## Styling
- Tailwind CSS 3.x; prefer semantic tokens used across the app:
  - Text: `text-title`, `text-content`, `text-description`, `text-muted`
  - Surfaces: `bg-card`, `bg-input`, `bg-background`, `bg-normal`
  - Borders: `border-border`

## Removed Header
- The old top `Header` has been removed in favour of `NavigationRail` + `Sidebar` for desktop and `MobileFooterNav` for mobile.

## Notes
- Use colocation pattern for new pages and shared group resources.
- Prefer `CachedImage` for any external images (avatars, covers, galleries).
