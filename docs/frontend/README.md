# Frontend Overview

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI library | React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| CMS | Payload CMS v3 (embedded in the same process) |
| UI primitives | Radix UI + shadcn/ui-style components |
| Toast notifications | Sonner |
| Package manager | pnpm |

---

## Route Group Structure

All routes live under `src/app/`. Next.js route groups (parentheses) share layouts without affecting the URL.

| Group | URL Prefix | Purpose |
|-------|-----------|---------|
| `(app)` | `/` | Public-facing marketing and auth pages |
| `(dashboard)` | `/dashboard`, `/account` | Authenticated user dashboard |
| `(portfolio)` | `/p/` | Public client review / portfolio viewer |
| `(payload)` | `/admin` | Payload CMS admin UI |
| `(coming-soon)` | `/coming-soon` | Pre-launch gate page |

See `docs/frontend/routing.md` for the complete page inventory.

---

## Server vs Client Component Boundary

- **Default**: all components are Server Components (RSC). Fetch data, query Payload, read env vars directly.
- **Client Components**: add `'use client'` at the top of the file only when the component needs browser APIs, `useState`, `useEffect`, event handlers, or context hooks.
- File naming convention for split pairs: `Component.tsx` (server shell) + `Component.client.tsx` (client island).

Rules of thumb:
- Data fetching → Server Component
- Interactivity / animations / upload queue → Client Component
- Providers are always Client Components (they wrap children with context)

---

## Key Entry Files

| File | Role |
|------|------|
| `src/app/(app)/layout.tsx` | Root layout for public site — mounts Header, Footer, Providers, AdminBar |
| `src/app/(app)/globals.css` | Global CSS, Tailwind base import |
| `src/app/(dashboard)/layout.tsx` | Dashboard shell — wraps all `/dashboard` and `/account` routes with `DashboardLayout` |
| `src/app/(dashboard)/(account)/layout.tsx` | Account sub-layout |
| `src/app/(portfolio)/layout.tsx` | Minimal layout for the portfolio viewer (`/p/[slug]`) |
| `src/app/(payload)/layout.tsx` | Payload admin wrapper |
| `src/middleware.ts` | Edge middleware — handles coming-soon redirect gate |

---

## Providers

All providers are composed in `src/providers/index.tsx` and mounted in the root layout.

| Provider | File | Responsibility |
|----------|------|---------------|
| `AuthProvider` | `src/providers/Auth/index.tsx` | Exposes current user, login/logout helpers via `useAuth()` |
| `ThemeProvider` | `src/providers/Theme/index.tsx` | Light/dark/auto theme toggle, persisted to cookie |
| `HeaderThemeProvider` | `src/providers/HeaderTheme/index.tsx` | Controls transparent-vs-solid header state per page |
| `HeaderProvider` | `src/providers/HeaderProvider.tsx` | Shared header data (nav items) fetched server-side |
| `UploadProvider` | `src/providers/UploadProvider.tsx` | Media upload queue, SSE progress stream, batch state |
| `Sonner` | `src/providers/Sonner.tsx` | Toast notification system (`sonner` package) |

---

## How the Payload Admin UI Is Embedded

Payload runs inside the Next.js process. The `(payload)` route group at `src/app/(payload)/` mounts:
- `/admin/**` — Payload's built-in admin UI (served by `@payloadcms/next`)
- `/api/**` — Payload's REST and GraphQL APIs

This is configured in `src/payload.config.ts` via the `@payloadcms/next` adapter. No separate server process is needed.

Custom Payload admin components (injected via `admin.components` in the config):
- `BeforeDashboard` (`src/components/BeforeDashboard/`) — seed button shown in admin dashboard
- `BeforeLogin` (`src/components/BeforeLogin/`) — branding shown on admin login screen

---

## Navigation and Auth Redirects

### `src/middleware.ts`

The edge middleware runs on all app routes (excluding `api`, `_next`, `admin`, static assets). Its only current role is the **coming-soon gate**:

- If `COMING_SOON=true` env var is set, all non-`/coming-soon` requests are redirected to `/coming-soon`.
- In normal operation the middleware is a no-op (`NextResponse.next()`).

### Auth redirect pattern

Auth protection for dashboard routes is handled at the **page level**, not middleware. Pages call `getMeUser()` (a server-side helper that reads the Payload session cookie) and redirect to `/login` if the user is not authenticated.

```ts
// Typical dashboard page pattern
const { user } = await getMeUser({ nullUserRedirect: '/login' })
```

The `AuthProvider` on the client side keeps a reactive copy of the user for UI state (e.g., showing the user's name in the sidebar).

---

## Design System

All UI must follow `DESIGN.md` — "The Curated Gallery" design language:

- No 1px borders — use tonal layering (background opacity shifts) instead
- Radii: `ROUND_SIXTEEN` (16px) minimum; larger for cards and modals
- Color: tonal palette, no hard borders, depth through shadow and opacity
- Typography: controlled scale, no arbitrary font sizes

Tailwind v4 design tokens are defined in `src/app/(app)/globals.css`.
