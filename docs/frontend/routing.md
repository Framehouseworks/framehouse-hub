# Routing Reference

## Route Group Architecture

```
src/app/
├── (app)/                    # Public site — marketing, auth
│   ├── layout.tsx            # Header + Footer + Providers
│   ├── page.tsx              # Homepage (/)
│   ├── [slug]/               # CMS-driven pages
│   ├── pricing/
│   ├── login/
│   ├── create-account/
│   ├── forgot-password/
│   ├── logout/
│   ├── learn/
│   │   ├── articles/[slug]/
│   │   └── tutorials/[slug]/
│   ├── company/
│   └── next/
│       ├── preview/          # Draft preview entry
│       └── exit-preview/     # Exits draft preview
│
├── (dashboard)/              # Authenticated dashboard
│   ├── layout.tsx            # DashboardLayout (sidebar + topbar)
│   ├── (account)/            # Account sub-group
│   │   ├── layout.tsx
│   │   └── account/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx          # /dashboard home
│   │   ├── library/
│   │   │   ├── page.tsx
│   │   │   ├── collections/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── sessions/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── portfolios/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── reviews/page.tsx
│   │   └── diagnostic/
│   │       └── [token]/
│   │           ├── page.tsx
│   │           ├── layout.tsx
│   │           └── expired/page.tsx
│   └── actions/              # Server Actions (not pages)
│
├── (portfolio)/              # Public client review portal
│   ├── layout.tsx
│   └── p/[slug]/page.tsx
│
├── (payload)/                # Payload CMS admin
│   ├── admin/**              # Handled by @payloadcms/next
│   └── api/**               # REST + GraphQL APIs
│
├── (coming-soon)/            # Pre-launch gate
│   └── coming-soon/page.tsx
│
└── api/                      # Custom Next.js API routes
    ├── media/
    │   ├── signed-url/
    │   ├── register-gcs/
    │   ├── register-local/
    │   ├── process-callback/
    │   ├── status-stream/
    │   ├── reprocess/
    │   ├── search/
    │   └── [id]/
    ├── portfolios/
    │   └── unlock/
    ├── portfolio-review/[slug]/
    ├── smart-collections/
    │   ├── generate/
    │   ├── preview/
    │   ├── tag-suggestions/
    │   └── [id]/
    ├── dashboard/reviews/
    ├── admin/
    │   ├── diagnostic-sessions/
    │   ├── creative-metrics/
    │   └── media/
    ├── coming-soon/waitlist/
    ├── seed-hub/
    └── healthz/
```

---

## All Pages

### `(app)` — Public Site

| Path | Purpose |
|------|---------|
| `/` | Homepage — rendered from `page.tsx`; may render `LandingPage` or a CMS page |
| `/[slug]` | CMS-driven pages authored in the Pages collection |
| `/pricing` | Pricing page — pulls from the Pricing global |
| `/login` | Login form (`LoginForm`) |
| `/create-account` | Account creation form (`CreateAccountForm`) |
| `/forgot-password` | Password reset request form (`ForgotPasswordForm`) |
| `/logout` | Logs out the user and redirects to `/login` |
| `/learn` | Learn hub index |
| `/learn/articles/[slug]` | Individual article page |
| `/learn/tutorials/[slug]` | Individual tutorial page |
| `/company` | Company/about page |
| `/coming-soon` | Pre-launch gate (only active when `COMING_SOON=true`) |
| `/next/preview` | Activates Payload draft preview mode |
| `/next/exit-preview` | Exits draft preview mode |

### `(dashboard)` — Authenticated Dashboard

| Path | Purpose |
|------|---------|
| `/dashboard` | Dashboard home — overview / welcome |
| `/dashboard/library` | Media library — `IngestionWorkbench` + `LibraryView` with upload |
| `/dashboard/library/collections` | SmartCollections grid (`CollectionsGrid`) |
| `/dashboard/library/collections/[id]` | Individual collection detail with media grid |
| `/dashboard/library/sessions` | Ingest sessions list (`SessionsView`) |
| `/dashboard/library/sessions/[id]` | Session detail with batch media grid |
| `/dashboard/portfolios` | Portfolio list (`PortfolioListPage`) |
| `/dashboard/portfolios/new` | Portfolio creation wizard (`PortfolioWizardPage`) |
| `/dashboard/portfolios/[id]` | Portfolio editor (`PortfolioEditorPage`) |
| `/dashboard/portfolios/[id]/reviews` | Client review submissions (`PortfolioReviewsPage`) |
| `/account` | Account settings (`AccountForm`) |
| `/dashboard/diagnostic/[token]` | Admin diagnostics view (token-gated) |
| `/dashboard/diagnostic/[token]/expired` | Expired diagnostic token page |

### `(portfolio)` — Client Review Portal

| Path | Purpose |
|------|---------|
| `/p/[slug]` | Public portfolio viewer — password gate, section navigation, lightbox, review mode |

### `(payload)` — Payload Admin

| Path | Purpose |
|------|---------|
| `/admin/**` | Full Payload CMS admin UI — collections, globals, users, media |

---

## Middleware

`src/middleware.ts` runs at the Next.js edge layer.

**Coming-soon gate:**
- Triggered when `COMING_SOON=true` env var is set.
- Redirects all traffic to `/coming-soon` except requests that start with `/coming-soon`.
- The matcher excludes `api`, `_next/static`, `_next/image`, `admin`, and common static files.

```ts
matcher: ['/((?!api|_next/static|_next/image|admin|favicon\\.ico|favicon\\.svg|assets).*)']
```

**Auth protection** is not in middleware — it is enforced at the page level via `getMeUser()`.

---

## Dynamic Segments

| Segment | Collection | Notes |
|---------|-----------|-------|
| `/[slug]` | Pages | CMS-authored slug from Payload |
| `/learn/articles/[slug]` | Articles | |
| `/learn/tutorials/[slug]` | Tutorials | |
| `/p/[slug]` | Portfolios | Public slug — can be password protected |
| `/dashboard/library/collections/[id]` | SmartCollections | Payload document ID |
| `/dashboard/library/sessions/[id]` | UploadBatches | Payload document ID |
| `/dashboard/portfolios/[id]` | Portfolios | Payload document ID |
| `/dashboard/diagnostic/[token]` | — | Admin-issued one-time token |

---

## Server Actions vs API Routes

| Use Case | Approach |
|----------|---------|
| Dashboard mutations (create portfolio, update collection) | Server Actions in `src/app/(dashboard)/actions/` |
| Media ingestion pipeline (upload, GCS registration, callbacks) | API routes under `src/app/api/media/` |
| SSE progress streams | API route (`/api/media/status-stream`) — Server Actions cannot stream |
| External webhooks (GCS Eventarc, Go worker callback) | API routes — must be reachable by external services |
| Portfolio unlock (password verification) | API route (`/api/portfolios/unlock`) — needs response cookies |

Server Actions are colocated in `src/app/(dashboard)/actions/`:
- `media.ts` — media CRUD, tagging, reprocess triggers
- `collections.ts` — smart collection CRUD and rule management
- `portfolios.ts` — portfolio create/update/delete, section management
- `revalidate.ts` — `revalidatePath` / `revalidateTag` helpers

---

## Preview Mode

Draft preview is enabled for the Pages collection. Flow:

1. User clicks "Preview" in Payload admin for a draft page.
2. Payload redirects to `/next/preview?secret=<token>&slug=<slug>`.
3. `preview/route.ts` validates the token, sets the `__prerender_bypass` cookie, and redirects to `/<slug>`.
4. The page fetches draft content using `draft: true` in the Payload query.
5. `/next/exit-preview` clears the cookie and returns to the page.
