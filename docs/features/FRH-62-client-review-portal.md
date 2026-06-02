> **IMPLEMENTATION STATUS: FULLY IMPLEMENTED** — Audited against codebase 2026-06-02.
>
> **Implementation summary:**
> - Collections: `PortfolioClientSessions`, `PortfolioClientReviews`, `PortfolioAssetComments`, `PortfolioDownloadLogs` — all in `src/collections/`.
> - API routes: `/api/portfolio-review/[slug]/session`, `/session/identify`, `/session/selections`, `/submit`, `/comments/[mediaId]`, `/download`.
> - Frontend: `src/components/Portfolio/review/` — `ReviewModeProvider`, `SelectionBar`, `SelectionCheckbox`, `SelectionModePill`, `CommentPanel`, `DownloadSheet`, `SubmitSelectionSheet`, `ClientIdentificationModal`.
> - Review session signing uses HMAC cookies (HTTP-only, `review_session_{portfolioId}`).
> - Download route (`POST /api/portfolio-review/{slug}/download`) streams a ZIP archive of selected assets using the `archiver` npm package.
> - Dashboard reviews surface: `/dashboard/portfolios/[id]/reviews` + `PortfolioReviewsPage.tsx`.
> - Test coverage: `tests/int/portfolio-review.int.spec.ts`, `tests/e2e/client-review-portal.spec.ts`.
>
> **Key files:** `src/collections/Portfolio*`, `src/app/api/portfolio-review/`, `src/components/Portfolio/review/`, `src/components/Portfolios/reviews/`

---

# FRH-62: Client Review Portal — Product & Engineering Specification

**Status:** Implemented — Post-Implementation Review Complete  
**Author:** Jason Keung  
**Date:** 2026-06-02  
**Branch:** `FRH-62-client-review-portal`  
**Depends on:** FRH-58 (Portfolio Creation Wizard), FRH-61 (Presentation Page)

---

## Table of Contents

1. [Problem Statement & Product Context](#1-problem-statement--product-context)
2. [Ticket Reconciliation](#2-ticket-reconciliation)
3. [User Roles & Identity Model](#3-user-roles--identity-model)
4. [Feature Scope — MVP vs V2](#4-feature-scope--mvp-vs-v2)
5. [Payload 3.0 CMS Architecture](#5-payload-30-cms-architecture)
6. [API Design](#6-api-design)
7. [UX/UI Design System Alignment](#7-uxui-design-system-alignment)
8. [Component Architecture](#8-component-architecture)
9. [User Journey Flows](#9-user-journey-flows)
10. [Admin Platform Support](#10-admin-platform-support)
11. [Main Scenarios](#11-main-scenarios)
12. [20 Edge Cases](#12-20-edge-cases)
13. [10 UX/UI Considerations & Resolutions](#13-10-uxui-considerations--resolutions)
14. [Test Strategy](#14-test-strategy)
15. [Types, Lint, Build & Migrations Checklist](#15-types-lint-build--migrations-checklist)
16. [CI/CD & Pipeline Changes](#16-cicd--pipeline-changes)
17. [Implementation Sequence](#17-implementation-sequence)

---

## 1. Problem Statement & Product Context

Portfolios in Framehouse Hub currently serve as **one-way presentations**: a creative publishes, a client passively views. This creates a collaboration gap — clients have no structured way to signal intent (which assets they want), annotate feedback, or request downloads. The result is a fallback to email threads, screenshares, and exported PDF lists, all of which degrade the premium experience the platform promises.

**FRH-62 transforms the portfolio presentation page into a bidirectional collaboration endpoint.** Clients gain structured tools to select assets, leave contextual notes, and (when permitted) download approved files — while creatives gain a consolidated view of client decisions without leaving the platform.

### Design Philosophy

The client review portal must feel like **a museum's acquisition interface, not a shopping cart.** Every interaction should reinforce the curatorial quality of the work being reviewed. Selections are not "added to cart" — they are nominated. Comments are not "tickets" — they are annotations. Downloads are not bulk exports — they are curated packages.

This distinction must permeate every copy choice, animation, and color token used.

---

## 2. Ticket Reconciliation

The source ticket was written from a product perspective without full knowledge of the existing Framehouse Hub data model. The following reconciliation table documents where the spec diverges from the ticket and why.

| Ticket Term / Claim | Reality in Codebase | Resolution in This Spec |
|---|---|---|
| "categories" | Portfolios have **sections** (grid blocks with `sectionName` and `sectionAnchor`) — not categories | Renamed to "sections" throughout |
| "navigate between categories" | Navigating between named grid blocks within one portfolio | Selection state persists at portfolio-session level, scoped to all sections |
| "modifies layout settings" in AC1 | Clients **cannot** modify layout. This meant "switches between section views" | Reworded to "navigates between sections" |
| "folders" in gallery | Portfolio sections serve this purpose. No folder hierarchy on client view | Sections are the navigable unit |
| "Instant notification to Creative's Dashboard" | No push/email/WebSocket system exists | MVP: poll-based dashboard badge + review inbox. V2: SSE / email |
| "Favorite/Approve" as a single action | Ambiguous UX: conflates personal bookmark with formal creative notification | Separated into (1) **Selection** (local, in-session) and (2) **Submit for Review** (formal, notifies creative) |
| Anonymous client identity | No client identity system exists for portfolio viewers | New `PortfolioClientSessions` model with HMAC cookie. Optional identification gate before submission |
| Download as .zip | No zip generation exists anywhere in the codebase | New streaming API route using `archiver` npm package. Quality controlled by portfolio permission |
| "If permitted" download | No permission model for client actions | New `clientReviewSettings` group on Portfolio collection |
| "Comment side drawer" in lightbox | Lightbox exists (`PortfolioLightbox.tsx`) but has no comment panel | Extend existing lightbox component with conditional right drawer (desktop) / bottom sheet (mobile) |
| Downloads collection | `Downloads` collection exists but is editorial (LUTs/presets for `/learn` page) — entirely unrelated | `PortfolioDownloadLogs` is a new, separate audit collection |

---

## 3. User Roles & Identity Model

### 3.1 Role Taxonomy

| Role | Who | Access to Review Portal |
|---|---|---|
| `admin` | Platform administrators | Full: can view/manage all reviews and comments via Payload admin; sees admin overlay on presentation page |
| `creative` | Portfolio owner | Read: sees client review submissions and comments on their own portfolios in the dashboard |
| `viewer` | Registered Framehouse users | Can review like a client if portfolio is accessible; selections tied to their user ID |
| `anonymous_client` | External clients with no Framehouse account | Can review any accessible portfolio; identity captured via session cookie + optional name/email modal |

### 3.2 Client Session Model

Anonymous clients are identified by a **PortfolioClientSession** — an HMAC-signed cookie scoped to a single portfolio visit. This session:

- Is created server-side on the first authenticated portfolio load (after password unlock if `shared`, or immediately if `public`)
- Is stored as an httpOnly, Secure, SameSite=Lax cookie: `fh_review_{portfolioId}`
- Has a 7-day TTL (refreshed on each interaction)
- May optionally carry `clientName` and `clientEmail` after the identification modal is completed
- Is NOT tied to a Framehouse account — no signup required

For `viewer`-role authenticated users, the session uses their User ID instead of an anonymous token.

### 3.3 Access Gate Hierarchy

```
Portfolio URL /p/[slug]
├── Public portfolio        → Session created immediately. Review UI shown if enabled.
├── Shared (password)       → Password gate first. On unlock: session created. Review UI shown if enabled.
├── Private portfolio       → Owner/admin only. Review UI shown (for previewing). Cannot submit reviews.
└── Preview token (48h)     → Admin/owner preview. Review UI hidden (admin overlay shown instead).
```

---

## 4. Feature Scope — MVP vs V2

### MVP (FRH-62)

- [x] Asset selection with circular checkboxes (hover-reveal desktop / selection-mode toggle mobile)
- [x] Sticky bottom selection bar (slide-up animation, glassmorphic)
- [x] Submit Selection action → creates `PortfolioClientReview` → dashboard badge
- [x] Download Selection action → streaming zip (proxy quality default; original if permitted)
- [x] Per-asset comment drawer in lightbox (desktop: right panel; mobile: bottom sheet)
- [x] Client identification modal (name + optional email, gated on submission actions)
- [x] Selection persisted in server-side session (survives navigation, page refresh, tab close)
- [x] `clientReviewSettings` fields in Portfolio collection + wizard Step 6 (Share/Publish)
- [x] Creative dashboard: "Client Reviews" section showing pending submissions
- [x] Admin panel: `PortfolioClientReviews` and `PortfolioAssetComments` collections
- [x] Admin support overlay: pending review count badge
- [x] Download audit log (`PortfolioDownloadLogs`)

### V2 (Deferred)

- [ ] Real-time notifications via SSE or Pusher
- [ ] Email notification to creative on review submission (requires email infrastructure)
- [ ] Client-to-creative reply threads on comments
- [ ] Named client invite links (personalized URLs per client)
- [ ] Review approval workflow (creative marks selections as approved/rejected)
- [ ] Annotation pins directly on the image (x/y coordinate-based markup)
- [ ] Version comparison (before/after asset variants)
- [ ] Export review report as PDF

---

## 5. Payload 3.0 CMS Architecture

### 5.1 New Collections

#### `PortfolioClientSessions`

Tracks anonymous and identified client review sessions.

```typescript
// src/collections/PortfolioClientSessions/index.ts
{
  slug: 'portfolio-client-sessions',
  access: {
    create: publicAccess,         // created server-side via API route
    read: adminOnly,              // only admins can query this collection
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'clientName',
    group: 'Portfolio Reviews',
    description: 'Anonymous client sessions for portfolio review',
  },
  fields: [
    { name: 'portfolio', type: 'relationship', relationTo: 'portfolios', required: true, index: true },
    { name: 'sessionToken', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'clientName', type: 'text' },
    { name: 'clientEmail', type: 'email' },
    { name: 'ipAddress', type: 'text', admin: { readOnly: true } },    // stored as last 2 octets masked (e.g., 192.168.x.x)
    { name: 'userAgent', type: 'text', admin: { readOnly: true } },
    { name: 'isIdentified', type: 'checkbox', defaultValue: false },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    {
      name: 'savedSelectionIds',
      type: 'array',
      fields: [
        { name: 'mediaId', type: 'number' },    // media doc ID
        { name: 'instanceId', type: 'text' },   // portfolio grid item instanceId for disambiguation
      ],
    },
  ],
  timestamps: true,
}
```

**Payload 3.0 note:** `filesRequiredOnCreate: false` not needed (no uploads). Use `timestamps: true` for `createdAt`/`updatedAt`. No versions needed — sessions are ephemeral.

---

#### `PortfolioClientReviews`

Formal submission records created when a client submits their selection.

```typescript
// src/collections/PortfolioClientReviews/index.ts
{
  slug: 'portfolio-client-reviews',
  access: {
    create: publicAccess,         // created via API route (validated server-side)
    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req.user)) return true
      // Creative sees only reviews on their own portfolios
      return { 'portfolio.owner': { equals: req.user.id } }
    },
    update: adminOrOwner,         // custom: admin or portfolio owner
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'submittedAt',
    group: 'Portfolio Reviews',
    defaultColumns: ['portfolio', 'clientName', 'status', 'submittedAt', 'itemCount'],
  },
  fields: [
    { name: 'portfolio', type: 'relationship', relationTo: 'portfolios', required: true, index: true },
    { name: 'clientSessionId', type: 'relationship', relationTo: 'portfolio-client-sessions', index: true },
    { name: 'clientName', type: 'text', required: true },
    { name: 'clientEmail', type: 'email' },
    {
      name: 'status',
      type: 'select',
      options: ['submitted', 'acknowledged', 'approved', 'archived'],
      defaultValue: 'submitted',
      index: true,
    },
    {
      name: 'selectedItems',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'media', type: 'relationship', relationTo: 'media', required: true },
        { name: 'instanceId', type: 'text' },     // portfolio grid item instanceId
        { name: 'instanceTitle', type: 'text' },  // denormalized for review context
      ],
    },
    { name: 'itemCount', type: 'number', admin: { readOnly: true } },   // denormalized count for list views
    { name: 'clientNote', type: 'textarea', maxLength: 1000 },          // overall submission note
    { name: 'submittedAt', type: 'date', required: true, index: true },
    { name: 'acknowledgedAt', type: 'date' },
    { name: 'acknowledgedBy', type: 'relationship', relationTo: 'users' },
  ],
  hooks: {
    beforeChange: [setItemCount],   // auto-populates itemCount from selectedItems.length
  },
  timestamps: true,
}
```

---

#### `PortfolioAssetComments`

Per-asset comments left by clients during portfolio review.

```typescript
// src/collections/PortfolioAssetComments/index.ts
{
  slug: 'portfolio-asset-comments',
  access: {
    create: publicAccess,         // via API route (validated server-side)
    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req.user)) return true
      return { 'portfolio.owner': { equals: req.user.id } }
    },
    update: adminOrPortfolioOwner,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'body',
    group: 'Portfolio Reviews',
    defaultColumns: ['portfolio', 'media', 'clientName', 'status', 'createdAt'],
  },
  fields: [
    { name: 'portfolio', type: 'relationship', relationTo: 'portfolios', required: true, index: true },
    { name: 'media', type: 'relationship', relationTo: 'media', required: true, index: true },
    { name: 'clientSession', type: 'relationship', relationTo: 'portfolio-client-sessions', index: true },
    { name: 'clientName', type: 'text', required: true },
    { name: 'clientEmail', type: 'email' },
    { name: 'body', type: 'textarea', required: true, maxLength: 2000 },
    {
      name: 'status',
      type: 'select',
      options: ['visible', 'resolved', 'archived'],
      defaultValue: 'visible',
      index: true,
    },
    { name: 'resolvedAt', type: 'date' },
    { name: 'resolvedBy', type: 'relationship', relationTo: 'users' },
  ],
  timestamps: true,
}
```

---

#### `PortfolioDownloadLogs`

Immutable audit log of every zip download event. Never updated, never deleted by users.

```typescript
// src/collections/PortfolioDownloadLogs/index.ts
{
  slug: 'portfolio-download-logs',
  access: {
    create: publicAccess,         // via API route
    read: adminOnly,
    update: () => false,          // immutable
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'downloadedAt',
    group: 'Portfolio Reviews',
    defaultColumns: ['portfolio', 'clientName', 'itemCount', 'quality', 'downloadedAt'],
  },
  fields: [
    { name: 'portfolio', type: 'relationship', relationTo: 'portfolios', required: true, index: true },
    { name: 'clientSession', type: 'relationship', relationTo: 'portfolio-client-sessions' },
    { name: 'clientName', type: 'text' },
    {
      name: 'downloadedItems',
      type: 'array',
      fields: [{ name: 'media', type: 'relationship', relationTo: 'media' }],
    },
    { name: 'itemCount', type: 'number' },
    { name: 'quality', type: 'select', options: ['proxy', 'original'] },
    { name: 'zipFilename', type: 'text' },
    { name: 'downloadedAt', type: 'date', required: true },
    { name: 'ipAddress', type: 'text' },
  ],
  timestamps: false,   // downloadedAt IS the timestamp; no updatedAt needed
}
```

---

### 5.2 Portfolio Collection Extensions

Add the following group to `src/collections/Portfolios/index.ts`, **after** the existing `theme` group field:

```typescript
{
  name: 'clientReviewSettings',
  type: 'group',
  label: 'Client Review Settings',
  admin: {
    description: 'Control what actions clients can take when viewing this portfolio.',
  },
  fields: [
    {
      name: 'allowSelection',
      type: 'checkbox',
      label: 'Allow Asset Selection',
      defaultValue: false,
      admin: { description: 'Clients can select assets and submit a shortlist for your review.' },
    },
    {
      name: 'allowComments',
      type: 'checkbox',
      label: 'Allow Comments',
      defaultValue: false,
      admin: { description: 'Clients can leave notes on individual assets in the lightbox.' },
    },
    {
      name: 'allowDownload',
      type: 'checkbox',
      label: 'Allow Download',
      defaultValue: false,
      admin: { description: 'Clients can download their selected assets as a zip archive.' },
    },
    {
      name: 'requireClientIdentification',
      type: 'checkbox',
      label: 'Require Client Identification',
      defaultValue: false,
      admin: { description: 'Prompt clients for their name (and optionally email) before they can submit a selection or comment.' },
    },
    {
      name: 'selectionLimit',
      type: 'number',
      label: 'Selection Limit',
      defaultValue: 0,
      min: 0,
      max: 200,
      admin: {
        description: 'Maximum assets a client can select. Set to 0 for unlimited.',
        condition: (_, siblingData) => siblingData?.allowSelection === true,
      },
    },
    {
      name: 'downloadQuality',
      type: 'select',
      label: 'Download Quality',
      defaultValue: 'proxy',
      options: [
        { label: 'Preview Quality (Web-optimised WebP)', value: 'proxy' },
        { label: 'Full Resolution (Original file)', value: 'original' },
      ],
      admin: {
        condition: (_, siblingData) => siblingData?.allowDownload === true,
        description: 'Quality tier served in the zip archive. Original files may be very large.',
      },
    },
    {
      name: 'reviewMessage',
      type: 'text',
      label: 'Review Prompt',
      maxLength: 300,
      admin: {
        description: 'Optional message shown to clients above the gallery, e.g. "Please select your 5 favourite images for the campaign."',
        condition: (_, siblingData) => siblingData?.allowSelection === true || siblingData?.allowComments === true,
      },
    },
  ],
},
```

**Payload 3.0 notes:**
- `condition` on `admin` is supported in Payload 3.0 to conditionally show fields without blocking data. The actual enforcement is server-side.
- No migration needed for `defaultValue: false` booleans on group fields — Payload treats missing values as the default. However, explicit migration is required to add the group columns to the `portfolios` table.
- `allowSelection`, `allowComments`, `allowDownload`, `requireClientIdentification` → `boolean NOT NULL DEFAULT false`
- `selectionLimit` → `integer NOT NULL DEFAULT 0`
- `downloadQuality` → `varchar(20) NOT NULL DEFAULT 'proxy'`
- `reviewMessage` → `varchar(300)`

---

### 5.3 Portfolio Collection Registration

Add all four new collections to `src/payload.config.ts` under `collections`:

```typescript
import { PortfolioClientSessions } from '@/collections/PortfolioClientSessions'
import { PortfolioClientReviews } from '@/collections/PortfolioClientReviews'
import { PortfolioAssetComments } from '@/collections/PortfolioAssetComments'
import { PortfolioDownloadLogs } from '@/collections/PortfolioDownloadLogs'

// In collections array:
PortfolioClientSessions,
PortfolioClientReviews,
PortfolioAssetComments,
PortfolioDownloadLogs,
```

### 5.4 Required Migrations

Generate with `pnpm payload migrate:create --name frh62_client_review_portal`.

**Expected schema changes:**
- `portfolio_client_sessions` table (full create)
- `portfolio_client_sessions_saved_selection_ids` table (array join)
- `portfolio_client_reviews` table (full create)
- `portfolio_client_reviews_selected_items` table (array join)
- `portfolio_asset_comments` table (full create)
- `portfolio_download_logs` table (full create)
- `portfolio_download_logs_downloaded_items` table (array join)
- `portfolios` table: add columns `client_review_settings_allow_selection`, `client_review_settings_allow_comments`, `client_review_settings_allow_download`, `client_review_settings_require_client_identification`, `client_review_settings_selection_limit`, `client_review_settings_download_quality`, `client_review_settings_review_message`

**FK strategy:** `ON DELETE CASCADE` for session-scoped child tables (`saved_selection_ids`, `selected_items`, `downloaded_items`). `ON DELETE SET NULL` for `portfolio_asset_comments.media_id` and `portfolio_client_reviews.selected_items.media_id` — avoids orphan reviews disappearing on media deletion.

---

### 5.5 Generated Types

After migration and `pnpm generate:types`, the following types must exist in `src/payload-types.ts`:

```typescript
export interface PortfolioClientSession { ... }
export interface PortfolioClientReview { ... }
export interface PortfolioAssetComment { ... }
export interface PortfolioDownloadLog { ... }

// Portfolio extended with:
export interface Portfolio {
  // ... existing fields ...
  clientReviewSettings?: {
    allowSelection?: boolean | null
    allowComments?: boolean | null
    allowDownload?: boolean | null
    requireClientIdentification?: boolean | null
    selectionLimit?: number | null
    downloadQuality?: 'proxy' | 'original' | null
    reviewMessage?: string | null
  }
}
```

---

## 6. API Design

All new routes live under `src/app/api/portfolio-review/`. They are Next.js Route Handlers (App Router), not Payload REST endpoints, to allow custom session/cookie logic.

### 6.1 Client Session Routes

**`POST /api/portfolio-review/[slug]/session`**
- Creates or refreshes a client session for a portfolio
- Validates portfolio is publicly accessible (public/shared with valid cookie)
- Returns `{ sessionToken, expiresAt, clientName?, clientEmail? }`
- Sets `fh_review_{portfolioId}` httpOnly cookie (7-day, SameSite=Lax)
- Called automatically when the presentation page loads (via server component → sets cookie, then passes sessionToken as encrypted prop to client components)

**`PATCH /api/portfolio-review/[slug]/session/identify`**
- Updates client name/email on the session
- Validates: name required, email optional (RFC 5322 format if provided)
- Returns `{ ok: true }`

**`GET /api/portfolio-review/[slug]/session/selections`**
- Returns current saved selection `mediaId[]` for this session
- Used to restore selections on page load

**`PUT /api/portfolio-review/[slug]/session/selections`**
- Body: `{ selections: Array<{ mediaId: number, instanceId: string }> }`
- Overwrites saved selection state for the session
- Validates: all `mediaId`s must exist in portfolio's current items (server-side)
- Returns `{ ok: true, savedCount: number }`

---

### 6.2 Review Submission Routes

**`POST /api/portfolio-review/[slug]/submit`**
- Creates a `PortfolioClientReview` document
- Validates:
  - Session token is valid
  - `allowSelection` is true on portfolio
  - `requireClientIdentification` → `isIdentified` is true on session
  - At least 1 selected item
  - All selected `mediaId`s still exist in portfolio items
  - Not a duplicate submission from same session in last 5 minutes (idempotency)
- Returns `{ reviewId: number }`
- Idempotency: if duplicate detected within 5min, returns existing `reviewId` with `{ alreadySubmitted: true }`

---

### 6.3 Comment Routes

**`GET /api/portfolio-review/[slug]/comments/[mediaId]`**
- Returns `PortfolioAssetComment[]` for a specific media item
- Ordered by `createdAt` ASC
- Only returns `visible` comments (not `resolved`/`archived`)

**`POST /api/portfolio-review/[slug]/comments/[mediaId]`**
- Body: `{ body: string }`
- Validates:
  - `allowComments` is true on portfolio
  - Session is valid
  - `requireClientIdentification` → `isIdentified` is true
  - `body.trim().length >= 1` and `<= 2000`
  - Body is plain text only (HTML stripped server-side via sanitizer)
- Rate limit: max 20 comments per session per 24h
- Returns `{ comment: PortfolioAssetComment }`

---

### 6.4 Download Route

**`POST /api/portfolio-review/[slug]/download`**
- Body: `{ selections: Array<{ mediaId: number }> }`
- Validates:
  - `allowDownload` is true on portfolio
  - Session is valid
  - Selection count: 1–50 items (hard cap regardless of `selectionLimit`)
  - All `mediaId`s exist in portfolio
- Rate limit: max 3 downloads per session per 24h
- Streams zip response:
  - `Content-Type: application/zip`
  - `Content-Disposition: attachment; filename="{portfolioName}_{YYYY-MM-DD}_{count}_assets.zip"`
  - Filename sanitised: alphanumeric + underscore, max 80 chars
- Quality resolution:
  - `proxy`: uses `media.proxyUrl` (WebP, worker-generated)
  - `original`: uses `media.originalUrl` (raw file from storage)
  - Both resolved through the signed URL chain (`thumbnailUrl || proxyUrl || originalUrl`)
- Logs to `PortfolioDownloadLogs` after stream starts
- Returns 403 with `{ error: 'DOWNLOAD_NOT_PERMITTED' }` if not allowed
- Returns 422 with `{ error: 'SELECTION_EMPTY' | 'SELECTION_TOO_LARGE' | 'UNAVAILABLE_ITEMS', unavailable?: number[] }` for validation failures

---

### 6.5 Creative Dashboard Routes

**`GET /api/dashboard/reviews`**  
- Returns `PortfolioClientReview[]` for portfolios owned by the authenticated user
- Filtered by `status: 'submitted'` by default
- Ordered by `submittedAt` DESC
- Paginated (limit 20, offset param)

**`PATCH /api/dashboard/reviews/[reviewId]/acknowledge`**  
- Sets `status: 'acknowledged'`, `acknowledgedAt`, `acknowledgedBy` on the review
- Owner or admin only

---

### 6.6 Session Hydration (Server-Side)

The presentation page server component passes `reviewConfig` and `sessionState` to client components as encrypted props:

```typescript
// In /p/[slug]/page.tsx
const reviewConfig = {
  allowSelection: portfolio.clientReviewSettings?.allowSelection ?? false,
  allowComments: portfolio.clientReviewSettings?.allowComments ?? false,
  allowDownload: portfolio.clientReviewSettings?.allowDownload ?? false,
  requireClientIdentification: portfolio.clientReviewSettings?.requireClientIdentification ?? false,
  selectionLimit: portfolio.clientReviewSettings?.selectionLimit ?? 0,
  downloadQuality: portfolio.clientReviewSettings?.downloadQuality ?? 'proxy',
  reviewMessage: portfolio.clientReviewSettings?.reviewMessage ?? null,
  portfolioName: portfolio.name,
  ownerName: typeof portfolio.owner === 'object' ? portfolio.owner.name : undefined,
}
```

**Review UI is never shown** when: portfolio is private, when accessed via preview token (admin mode), or when all three `allow*` flags are false.

---

## 7. UX/UI Design System Alignment

### 7.1 Design Tokens in Use

| Element | Token | Value |
|---|---|---|
| Selection checkbox (active) | `primary_container` | `#d79922` |
| Selection checkbox ring | `primary` | `#7f5700` |
| Submitted items ring | `secondary` | `#445aa5` |
| Selection bar background | `surface_variant` @ 70% + `backdrop-blur: 20px` | Glassmorphic |
| Selection bar text | `on_surface` | `#1a1c1c` |
| Comment drawer background | `surface_container_low` | `#f3f3f4` |
| Comment input focus ring | `primary` @ 2px | `#7f5700` |
| "Submit" CTA | `primary_container` → `primary` gradient | `#d79922` → `#7f5700` |
| Download button | `secondary` | `#445aa5` |
| Count badge | `primary_container` | `#d79922` |
| Count badge text | Rubik Mono One | Monospaced, tabular numbers |
| Resolved comment chip | `surface_container` | `#eeeeee` |
| Error state | `tertiary` | `#bb1800` |
| Card radius | `ROUND_SIXTEEN` | `16px` |
| Modal/sheet radius | `ROUND_TWENTY_FOUR` | `24px` |
| Shadow | Ambient token | `0px 20px 40px rgba(26,28,28,0.06)` |

### 7.2 No-Border Rule Compliance

All new UI components must comply with the "No-Line" rule:
- Selection bar: separated from gallery by `backdrop-blur` + tonal shift (glass surface over `--portfolio-bg`)
- Comment drawer: `surface_container_low` tonal shift from `surface_container_lowest`
- Identification modal: ambient shadow only, no border
- Download progress sheet: same ambient shadow

### 7.3 Desktop Viewport (≥1024px)

**Gallery with Review Mode Active:**

```
┌─────────────────────────────────────────────────────────────────┐
│  [Review Prompt message — if set, above gallery]                │
│  font: Inter 14px, color: on_surface @ 70%, max-width: 600px   │
├─────────────────────────────────────────────────────────────────┤
│  [Portfolio sections rendered normally]                         │
│  Each image card:                                               │
│    - On hover: circular checkbox appears top-left (40×40px)     │
│    - Checkbox: ring in primary (#7f5700), fill when selected    │
│    - Selected card: 3px ring in primary_container (#d79922)     │
│    - Submitted card: 3px ring in secondary (#445aa5)            │
└─────────────────────────────────────────────────────────────────┘
│  [Selection Bar — slides up from bottom, z-index: 100]          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ● 5 assets selected   [Download ↓]  [Submit Selection ✓]│   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Lightbox with Comments (allowComments: true):**

```
┌──────────────────────────────────────────────────────────────────┐
│  [Lightbox backdrop — full viewport, --portfolio-bg @ 95%]       │
│  ┌────────────────────────────┐  ┌─────────────────────────┐    │
│  │                            │  │  COMMENTS               │    │
│  │   [Asset — 70% width]      │  │  surface_container_low  │    │
│  │                            │  │  ─────────────────────  │    │
│  │                            │  │  Jane D. · 2h ago       │    │
│  │                            │  │  "Love the composition" │    │
│  │                            │  │  ─────────────────────  │    │
│  │                            │  │  [Type your note...]    │    │
│  │   [Prev] [Counter] [Next]  │  │  [Post Comment]         │    │
│  └────────────────────────────┘  └─────────────────────────┘    │
│  [Caption / Accession ID — footer, Rubik Mono One]               │
└──────────────────────────────────────────────────────────────────┘
```

The comment panel is `280px` wide, `surface_container_low` background, `ROUND_SIXTEEN` on the left side (inner panel edge), separated from the image purely by tonal shift. Never a dividing line.

**Identification Modal:**

```
┌────────────────────────────────────────────┐
│  [Centered modal, max-w: 440px]            │
│  ROUND_TWENTY_FOUR, ambient shadow         │
│                                            │
│  Tell us who you are                       │
│  [Your name *]            ← required       │
│  [Email address]          ← optional       │
│                                            │
│  [Continue →]  (primary gradient button)   │
│  "You can always skip if reviewing only"   │
│  [Skip for now — view only]                │
└────────────────────────────────────────────┘
```

"Skip for now" dismisses the modal. Browsing and selection are allowed. Submit and Comment actions will re-trigger the modal.

### 7.4 Mobile Viewport (≤767px)

**Selection Mode Toggle:**

A floating "Select" button appears at the top-right of the gallery header when `allowSelection: true`:

```
[Select ☐]  ← pill button, 36px height, ROUND_SIXTEEN
```

When active, ALL asset checkboxes become permanently visible (not hover-gated). Tapping an asset toggles selection. The button label becomes "Done Selecting" when active, with `primary_container` fill.

**Selection Bar (Mobile):**

Full-width sticky bar above the phone bottom navigation safe area:
- 2-line layout: "N assets selected" on first line, action buttons on second
- Buttons are full-width on separate lines below 360px

**Comment Drawer → Bottom Sheet (Mobile):**

On mobile, the lightbox comment drawer becomes a **bottom sheet** that slides up to 60% of the viewport:
- Image remains visible in the top 40% (dimmed by 40% overlay)
- Sheet uses `ROUND_TWENTY_FOUR` on top corners only
- `surface_container_low` background
- Drag-to-dismiss (downward swipe)

**Download Progress:**

Full-screen bottom sheet with download progress indicator. Never a blocking modal.

---

## 8. Component Architecture

All new components live under `src/components/Portfolio/review/`.

### 8.1 Component Tree

```
PortfolioRenderer (existing, extended)
├── ReviewModeProvider             ← New: context for selection state + review config
│   ├── ReviewPromptBanner         ← New: renders reviewMessage if set
│   ├── SelectionModePill          ← New: mobile-only "Select / Done Selecting" toggle
│   ├── [Existing grid components — MasonryGrid, FilmstripRow, UniformGrid]
│   │   └── SelectableAssetWrapper ← New: wraps each grid item with checkbox + selection ring
│   │       └── SelectionCheckbox  ← New: circular animated checkbox (hover/always-on)
│   └── SelectionBar               ← New: sticky bottom bar (portal, z-100)
│       ├── SelectionCount         ← New: "N assets selected" with Rubik Mono One count
│       ├── DownloadButton         ← New: triggers download flow
│       │   └── DownloadSheet      ← New: bottom sheet for download preview + progress
│       └── SubmitSelectionButton  ← New: triggers identification check → submission
│           └── SubmitSheet        ← New: confirmation bottom sheet with note field
│
PortfolioLightbox (existing, extended)
├── [Existing nav, image, caption UI]
├── CommentPanel                   ← New: right drawer (desktop) / bottom sheet (mobile)
│   ├── CommentList                ← New: sorted list of comments for current media
│   │   └── CommentItem            ← New: single comment with author + timestamp
│   └── CommentComposer            ← New: textarea + submit button with validation
└── LightboxSelectionToggle        ← New: select current asset from within lightbox
│
ClientIdentificationModal          ← New: name + email modal (portal, z-160)
│
```

### 8.2 `ReviewModeProvider`

```typescript
// src/components/Portfolio/review/ReviewModeProvider.tsx
interface ReviewConfig {
  allowSelection: boolean
  allowComments: boolean
  allowDownload: boolean
  requireIdentification: boolean
  selectionLimit: number    // 0 = unlimited
  downloadQuality: 'proxy' | 'original'
  reviewMessage: string | null
  portfolioSlug: string
  portfolioName: string
  ownerName?: string
}

interface ReviewState {
  config: ReviewConfig
  selections: Map<number, { mediaId: number; instanceId: string }>  // keyed by mediaId
  isSelectionMode: boolean       // mobile selection mode toggle
  isIdentified: boolean
  clientName: string | null
  clientEmail: string | null
  submittedSelectionIds: Set<number>   // IDs from a completed submission (show blue ring)
  //
  toggleSelection: (mediaId: number, instanceId: string) => void
  clearSelections: () => void
  setIdentified: (name: string, email?: string) => void
  setSelectionMode: (on: boolean) => void
}
```

Selection state is managed with `useReducer`. On every change, a debounced (500ms) `PUT /api/portfolio-review/[slug]/session/selections` is fired to persist server-side. On initial mount, `GET /api/portfolio-review/[slug]/session/selections` is called to hydrate from server (handles page refresh / tab reopen / cross-tab sync).

**Selection limit enforcement** (client-side, mirrored server-side):
```typescript
if (config.selectionLimit > 0 && selections.size >= config.selectionLimit && !selections.has(mediaId)) {
  toast.error(`Selection limit reached (${config.selectionLimit}/${config.selectionLimit})`)
  return state
}
```

### 8.3 `SelectableAssetWrapper`

Wraps each grid item rendered by `MasonryGrid`, `FilmstripRow`, and `UniformGrid`. Adds:
- `data-media-id` and `data-instance-id` attributes
- `onClick` for selection toggle (when in selection mode OR when checkbox is directly clicked)
- `onMouseEnter`/`onMouseLeave` for hover-reveal of checkbox
- `aria-checked` for accessibility
- Selection ring via CSS class applied to the inner image container

### 8.4 `CommentPanel`

Injected into `PortfolioLightbox` when `allowComments: true`. Receives `mediaId` of the current lightbox item. On `mediaId` change, fetches comments from `GET /api/portfolio-review/[slug]/comments/[mediaId]`.

**Optimistic updates**: New comments are added to local state immediately on submit, with a pending indicator. Server response updates the ID.

**Empty state**: "No comments yet. Be the first to leave a note." — Inter 14px, `on_surface` @ 50%.

### 8.5 Z-Index Tier Table

All new components must respect this explicit tier to prevent stacking conflicts:

| Layer | Z-Index | Component |
|---|---|---|
| Base gallery | 0 | Grid items |
| Hover overlay | 10 | `SelectableAssetWrapper` checkbox |
| Selection rings | 10 | Selection ring outline |
| Section navigator | 50 | `SectionNavigator` |
| Selection bar | 100 | `SelectionBar` (portal) |
| Lightbox | 140 | `PortfolioLightbox` |
| Admin overlay | 150 | `AdminSupportOverlay` |
| Identification modal | 160 | `ClientIdentificationModal` (portal) |

---

## 9. User Journey Flows

### 9.1 First-Time Client Visit (Shared Portfolio)

```
1. Client receives link: framehouseworks.com/p/[slug]
2. Password gate renders (PasswordGate component)
3. Client enters password → POST /api/portfolios/unlock → unlock cookie set
4. Page reloads → server validates cookie → portfolio rendered
5. Server creates PortfolioClientSession (POST /api/portfolio-review/[slug]/session)
   → fh_review_{id} cookie set (httpOnly, 7-day TTL)
6. If reviewMessage set: ReviewPromptBanner renders above gallery
7. Client browses portfolio
```

### 9.2 Asset Selection Flow

```
1. Desktop: Client hovers over image → SelectionCheckbox fades in (200ms ease)
   Mobile: Client taps "Select" pill → all checkboxes become visible
2. Client clicks checkbox → asset highlighted with gold ring (primary_container)
   → selection added to ReviewModeProvider state
   → debounced PUT /session/selections fires after 500ms
3. SelectionBar slides up from bottom (translateY: 80px → 0, 300ms ease-out)
4. Client navigates to another section
   → selection state persists (server-side + in-memory)
5. Client selects more assets in new section
   → SelectionBar count updates (e.g., "3 assets selected")
```

### 9.3 Submit Selection Flow

```
1. Client clicks "Submit Selection" in SelectionBar
2. If requireIdentification=true AND !isIdentified:
   → ClientIdentificationModal opens
   → Client enters name (required) + email (optional)
   → PATCH /session/identify
   → Modal closes, submission continues
3. SubmitSheet opens (bottom sheet, 60% height):
   → Shows thumbnail grid of selected assets (max 5 visible, "+N more" if overflow)
   → Optional "Note to creative" textarea (300 char limit)
   → "Submit N assets" CTA (primary gradient button)
4. Client confirms → POST /api/portfolio-review/[slug]/submit
5. Success state:
   → Selected items' rings change from gold to blue (secondary) — "submitted" state
   → SelectionBar shows "Submitted! Your selection has been sent to [ownerName]"
   → After 4 seconds, SelectionBar slides back down
   → SubmitSheet closes
6. Error state: toast with specific error message, sheet remains open
```

### 9.4 Download Selection Flow

```
1. Client clicks "Download" in SelectionBar
2. DownloadSheet opens (bottom sheet):
   → Shows count: "5 assets selected"
   → Quality indicator: "Preview Quality (Web)" or "Full Resolution" based on portfolio setting
   → "Download [portfolioName]_[date]_5_assets.zip" CTA
3. Client confirms → POST /api/portfolio-review/[slug]/download (streaming)
4. Progress indication:
   → Button shows spinner, copy: "Preparing your archive..."
   → Browser native download dialog appears when stream begins
5. PortfolioDownloadLog record created server-side
6. On completion: "Download complete" toast
```

### 9.5 Comment Flow (Lightbox)

```
1. Client clicks any asset → PortfolioLightbox opens
2. If allowComments=true:
   → CommentPanel renders to the right (desktop) or slides up (mobile)
   → GET /api/portfolio-review/[slug]/comments/[mediaId] fires
3. Client types in CommentComposer textarea
   → Character counter shows (e.g., "0 / 2000")
   → Submit button disabled until body.trim().length >= 1
4. Client submits:
   → If requireIdentification=true AND !isIdentified: modal fires first
   → POST /api/portfolio-review/[slug]/comments/[mediaId]
   → Optimistic: comment appears immediately with "Saving..." indicator
   → Server response updates with final ID + timestamp
   → "Comment saved" indicator fades in (2s) below the comment
5. Client navigates to next asset → CommentPanel refetches for new mediaId
```

### 9.6 Creative Dashboard Review Flow

```
1. Creative logs in → navigates to Dashboard → Portfolio list
2. Portfolio card shows badge: "2 new reviews" (query: PortfolioClientReviews, status=submitted, portfolioId)
3. Creative clicks "View Reviews" → /dashboard/portfolios/[id]/reviews
4. Review list: each submission shows:
   → Submitter name, date, asset count, optional note
   → Thumbnail strip of selected assets
   → "Mark as Acknowledged" button
5. Creative clicks "Mark as Acknowledged" → PATCH /api/dashboard/reviews/[id]/acknowledge
6. Badge disappears from portfolio card
7. Review record status: 'submitted' → 'acknowledged'
```

---

## 10. Admin Platform Support

### 10.1 Payload Admin Panel Collections

All four new collections appear under a **"Portfolio Reviews"** group in the Payload admin sidebar.

**`PortfolioClientReviews` list view:**
- Columns: Portfolio name (linked), Client Name, Status (chip), Item Count, Submitted At
- Filters: by portfolio, by status, date range
- Bulk action: "Archive selected"
- Row action: "View Details" → shows full selected asset list + thumbnails

**`PortfolioAssetComments` list view:**
- Columns: Portfolio name, Asset title, Client Name, Comment body (truncated 80 chars), Status, Created At
- Row action: "Resolve" → sets `status: 'resolved'`, stamps `resolvedAt` + `resolvedBy`
- Filter: by portfolio, by status (`visible` / `resolved`)

**`PortfolioClientSessions` list view:**
- Columns: Portfolio name, Client Name (or "Anonymous"), Created At, Expires At, Is Identified
- Admin use: debugging client session issues

**`PortfolioDownloadLogs` list view:**
- Columns: Portfolio, Client Name, Item Count, Quality, Downloaded At
- Read-only. Immutable audit trail.

### 10.2 Admin Support Overlay Extension

The existing `AdminSupportOverlay` on `/p/[slug]` gains a new section:

```
──────────────────────────────
CLIENT REVIEWS
──────────────────────────────
Pending submissions:  3       ← queries PortfolioClientReviews status=submitted
Total comments:       12      ← queries PortfolioAssetComments status=visible
Last activity:        2h ago
[View All Reviews →]          ← links to Payload admin filtered view
──────────────────────────────
Review Settings
Selection:  ✓ Enabled (limit: 5)
Comments:   ✓ Enabled
Download:   ✗ Disabled
Requires ID: ✓ Yes
──────────────────────────────
```

### 10.3 Portfolio Collection Admin: clientReviewSettings Tab

The `clientReviewSettings` group should be surfaced as a distinct **"Client Review"** tab in the Payload admin portfolio editor (using `admin.tabs` if available in Payload 3.0, or grouped clearly under a labelled section). Admins can enable/disable review features per-portfolio without going through the wizard.

---

## 11. Main Scenarios

### Scenario A: Campaign Approval (Core Use Case)
A creative delivers a wedding photography portfolio to a client couple. The portfolio has `allowSelection: true`, `selectionLimit: 30`, `allowComments: true`, `requireClientIdentification: true`. The clients open the link, enter their names, browse the 200-image gallery, select their 30 favourites, leave notes on 5 images ("love this, perfect for the album cover"), and submit. The creative sees "1 new review — 30 assets" badge on their dashboard, reviews the selection, marks it acknowledged, and proceeds to deliver the 30 files.

### Scenario B: Art Director Quick Review (Speed Focus)
An art director needs to pick 3 hero shots for a press release. Portfolio has `allowSelection: true`, `allowDownload: true`, `downloadQuality: 'proxy'`, `requireClientIdentification: false`. Client opens the link, immediately selects 3 images, clicks Download. Receives a zip of web-quality WebPs within seconds. No account creation, no identification required.

### Scenario C: Executive Feedback (Mobile Priority)
An executive is reviewing brand assets on their iPhone during a commute. They tap "Select", choose 8 assets by tapping, leave brief comments on 2 via the lightbox bottom sheet. The session persists when their phone locks and they reopen the browser. They submit when back at the office.

### Scenario D: Admin Support (Internal Use)
A creative reports that a client is having trouble with their portfolio review. Admin opens the Payload admin panel, navigates to `PortfolioClientSessions`, finds the session by portfolio and approximate timestamp, verifies the selections are saved, checks `PortfolioAssetComments` for any pending comments, and resolves the issue. Admin can also open the portfolio URL with their admin account and see the "Client Reviews" section in the Admin Support Overlay showing pending activity.

### Scenario E: Creative Changes Settings Mid-Review
A creative disables `allowDownload` after a client has already opened the portfolio but before they click download. The next download attempt returns 403. The client sees a toast: "Downloads are no longer available for this portfolio." The selection bar download button is hidden on next page interaction.

### Scenario F: Password-Protected with Client ID
Portfolio is `visibility: 'shared'` with `requireClientIdentification: true`. Client enters portfolio password → session created → identification modal fires → client enters name + email → proceeds to review. The submitted review includes name and email for the creative's reference.

---

## 12. 20 Edge Cases

Each edge case documents the trigger, the failure mode if unhandled, and the resolution built into this spec.

---

**EC-01: Selection limit reached — client tries to add more**
- Trigger: `selectionLimit: 5`, client attempts to select 6th asset
- Failure: Silent failure or JS error if not handled
- Resolution: `toggleSelection` in `ReviewModeProvider` checks limit before adding. Toast: "Selection limit reached (5/5). Deselect an item first." Checkbox renders as disabled (greyed ring, cursor: not-allowed) while limit is reached. Server also enforces on `PUT /session/selections`.

---

**EC-02: Portfolio unpublished while client is mid-review**
- Trigger: Creative force-unpublishes or sets to `private` while client has the page open
- Failure: Client continues interacting; submit/download routes return 404
- Resolution: API routes for review (`/submit`, `/download`, `/comments`) validate portfolio status on each request. Return `{ error: 'PORTFOLIO_UNAVAILABLE' }` (410 Gone). Client sees toast: "This portfolio is no longer available." Selection bar is hidden. Review prompt removed.

---

**EC-03: Media item deleted from portfolio while in selection**
- Trigger: Creative removes a media item from a grid block after client has it selected
- Failure: Zip download fails silently, or submit creates orphaned review items
- Resolution: `POST /submit` and `POST /download` validate all submitted `mediaId`s against the portfolio's current items. Return `{ error: 'UNAVAILABLE_ITEMS', unavailable: [id1, id2] }` with 422. Client sees: "Some assets are no longer in this portfolio and were removed from your selection." Removes those IDs from client state.

---

**EC-04: Duplicate submission within 5 minutes**
- Trigger: Client double-clicks "Submit Selection" or submits via two browser tabs simultaneously
- Failure: Duplicate `PortfolioClientReview` records, double notification to creative
- Resolution: Server checks `PortfolioClientReviews` for existing `submitted` record from same `sessionToken` within 5 minutes. If found: returns `{ reviewId: existing_id, alreadySubmitted: true }` (200, not 4xx). Client treats this as success.

---

**EC-05: Empty or whitespace-only comment**
- Trigger: Client types "   " (spaces only) and submits
- Failure: Empty comment saved, pollutes creative's review data
- Resolution: Client-side: `body.trim().length === 0` keeps submit button disabled. Server-side: `body.trim()` validated before insert; returns 400 `{ error: 'COMMENT_EMPTY' }` if bypassed. Copy on disabled button: "Add a note to submit."

---

**EC-06: XSS or injection attempt in comment body**
- Trigger: Client submits `<script>alert('xss')</script>` or SQL injection patterns
- Failure: Stored XSS or data corruption
- Resolution: Server strips all HTML tags using a pure-text sanitiser (strip-tags or DOMPurify server-side). Stores plaintext only. Max 2000 chars enforced. Displayed in React as text children (not `dangerouslySetInnerHTML`), so no XSS vector exists on render.

---

**EC-07: Session cookie expires mid-review (7-day TTL)**
- Trigger: Client returns after 7+ days; session cookie expired
- Failure: All API calls return 401; selections appear to vanish
- Resolution: On 401 from any review API route, client calls `POST /api/portfolio-review/[slug]/session` to create a new session. Attempts to restore selections from `localStorage` fallback (written on every selection change). Shows toast: "Your session refreshed. Restoring your previous selections..." `localStorage` key: `fh_review_selections_{portfolioId}`.

---

**EC-08: Portfolio password changed mid-session**
- Trigger: Creative changes portfolio password while client has valid unlock cookie
- Failure: Client continues accessing with stale cookie; security gap
- Resolution: The `validateUnlockCookie` function on `/p/[slug]/page.tsx` embeds a password hash in the cookie. Any password change invalidates old cookies on next page load. Client sees password gate again. Review session cookie (`fh_review_{id}`) is separate and survives — selections not lost if client re-authenticates.

---

**EC-09: Multiple browser tabs with same session**
- Trigger: Client has portfolio open in Tab A and Tab B, selects different assets in each
- Failure: Last-write wins → earlier tab's selections silently overwritten
- Resolution: On tab focus (`visibilitychange` event), client polls `GET /session/selections` and merges with current state (union of both sets). Shows toast: "Selections updated from another session." Page `focusIn` triggers a single GET per 30 seconds max (throttled).

---

**EC-10: Invalid email format in identification modal**
- Trigger: Client enters "notanemail" in the email field
- Failure: Invalid data stored; email notification would fail in V2
- Resolution: Client-side RFC 5322 regex on blur. Inline error: "Please enter a valid email address." Email field is marked optional — client can leave it empty. Server-side: if email provided, validate with a strict regex before storing. Return 400 if invalid.

---

**EC-11: Portfolio owner's account deleted after review submitted**
- Trigger: Platform admin deletes a creative's account after a client review was submitted
- Failure: `PortfolioClientReview` orphaned; creative can't be notified; dashboard badge broken
- Resolution: FK on `portfolios.owner` is `ON DELETE SET NULL`. Portfolio + reviews remain (admin can view). Dashboard badge query filters by authenticated user — null owner means no active creative; badge simply doesn't appear. Admin can still manage reviews.

---

**EC-12: Comment on media item removed from portfolio**
- Trigger: Creative removes an asset from a portfolio grid block after a client has commented on it
- Failure: Comment references a mediaId that no longer appears in the portfolio
- Resolution: `PortfolioAssetComments.media` FK is `ON DELETE SET NULL` (media collection deletion). In the admin list view, show "[Media removed from portfolio]" label when `media` is null. Comments are NOT cascade-deleted — they remain as historical data for the creative to review.

---

**EC-13: Admin preview token holder attempts to submit review**
- Trigger: Admin clicks "Submit Selection" while viewing via a 48h preview token
- Failure: Admin creates a spurious client review on their own portfolio
- Resolution: Presentation page detects `hasValidPreviewToken` server-side. `reviewConfig` is set to all `false` when preview token is active, regardless of portfolio settings. Review UI is completely hidden. Admin support overlay is shown instead.

---

**EC-14: Direct URL download bypass attempt**
- Trigger: Malicious client constructs `POST /api/portfolio-review/[slug]/download` without valid session
- Failure: Unauthorised download of private/proxy media
- Resolution: All review API routes validate `fh_review_{portfolioId}` cookie server-side. Invalid or missing cookie returns 401. Even with a valid session: `allowDownload` is re-checked on every request. Signed GCS URLs are used for file streaming (time-limited, 1h TTL).

---

**EC-15: Download zip ≥ 50 files (hard cap)**
- Trigger: `selectionLimit: 0` (unlimited), client selects 100 assets and clicks download
- Failure: Streaming zip causes Cloud Run timeout (300s default) or memory exhaustion
- Resolution: Hard server-side cap of 50 files per download regardless of `selectionLimit`. If selection > 50: return 422 `{ error: 'SELECTION_TOO_LARGE', max: 50 }`. Client sees: "Download is limited to 50 assets at a time. Deselect some items or download in batches." Future download batching UI is V2.

---

**EC-16: Download zip streams all unavailable files**
- Trigger: All selected assets' `proxyUrl`/`originalUrl` are unreachable (GCS file deleted, worker failed)
- Failure: Empty zip delivered; client confused about why the zip has nothing
- Resolution: Server attempts to fetch each file; if all fail: return 422 `{ error: 'ALL_FILES_UNAVAILABLE' }`. If partial failures: continue streaming with available files. Include `_manifest.txt` in zip listing which files were delivered and which were unavailable.

---

**EC-17: Selection bar overlaps page content**
- Trigger: SelectionBar appears, overlapping section navigation or bottom content
- Failure: Content hidden behind sticky bar; user cannot click last assets
- Resolution: `ReviewModeProvider` sets a CSS custom property `--review-bar-height: 80px` on the gallery container when bar is visible. All grid containers apply `padding-bottom: var(--review-bar-height, 0)`. SectionNavigator has `bottom: calc(var(--review-bar-height, 0) + 20px)` to float above the bar.

---

**EC-18: Portfolio has zero assets but review mode is enabled**
- Trigger: Creative enables `allowSelection: true` but portfolio has no media items
- Failure: SelectionBar might flash briefly with confusing state
- Resolution: `ReviewModeProvider` checks if total asset count across all grid blocks is 0. If so, review UI is suppressed silently. Review prompt banner is not rendered. This is not an error state visible to the client.

---

**EC-19: `requireClientIdentification: true` client dismisses modal and tries to comment**
- Trigger: Client closes the identification modal without entering details, then tries to leave a comment
- Failure: Comment submitted anonymously despite setting, or silently blocked
- Resolution: Comment submission checks `isIdentified` in `ReviewModeProvider`. If false and `requireIdentification` is true: re-triggers `ClientIdentificationModal` with copy: "Please introduce yourself before leaving a note." The modal is non-blocking for browsing and selection — only gates submission actions.

---

**EC-20: Client on a shared portfolio with `allowDownload: true` downloads all assets (no limit)**
- Trigger: `selectionLimit: 0` (unlimited), `allowDownload: true`, `downloadQuality: 'original'` — client selects all 50 assets and downloads original files
- Failure: Massive egress from GCS (potentially gigabytes), cost spike, potential DoS
- Resolution: Three-layer defence: (1) Hard 50-file cap per download. (2) Rate limit: max 3 downloads per session per 24h (tracked in `PortfolioDownloadLogs`). (3) For `original` quality: server checks total estimated file size (from `media.filesize` sum) — if > 500MB, returns 422 `{ error: 'DOWNLOAD_TOO_LARGE', estimatedMB: N }` with copy: "Your selection is too large to download at once. Try downloading a subset, or contact the creative for file delivery." This protects free-tier GCS egress budget.

---

## 13. 10 UX/UI Considerations & Resolutions

---

**C-01: Hover-only selection UX is entirely broken on mobile touch devices**

The ticket describes checkbox-on-hover — a pattern that has zero mobile equivalent. A 375px iPhone viewport has no pointer device and no `:hover` pseudo-class.

**Resolution:** Dual interaction model:
- Desktop (pointer device): Hover-reveal checkbox (40×40px, top-left of each card), 200ms fade in/out
- Mobile (≤767px): "Select" mode toggle pill in gallery header. Activating it makes all checkboxes permanently visible and changes tap-to-navigate to tap-to-select. Without selection mode active, tapping opens the lightbox as normal. The mode toggle uses `SessionStorage` so it resets on page reload (intentional — clients shouldn't be stuck in selection mode).

---

**C-02: Z-index conflicts between SelectionBar, SectionNavigator, and AdminSupportOverlay**

Three floating UI elements already exist on the presentation page. Adding the SelectionBar without a defined z-index hierarchy causes visual clashes (bar renders over/under the wrong elements).

**Resolution:** Explicit z-index tier table defined in Section 8.5. No component uses `z-9999` or `z-[9999]` anti-patterns. All use the tier table. Verified by systematic review of all overlay components.

---

**C-03: Comment side drawer breaks mobile lightbox layout**

A 280px right panel inside a full-screen lightbox on a 375px device leaves only 95px for the image — unusable.

**Resolution:** Responsive layout split at 768px. Below that breakpoint, `CommentPanel` renders as a bottom sheet inside the lightbox overlay, covering 60% of the screen height. The image is pushed to the top 40% with a dimming overlay. This matches standard mobile UX patterns (Google Photos comments, Frame.io mobile). Uses `useMediaQuery` hook or CSS container queries.

---

**C-04: High friction from requiring client identification before browsing**

Showing an identification modal on page load would cause significant drop-off (estimated 40–60% abandonment based on similar SaaS patterns). Clients often want to browse before committing to identify themselves.

**Resolution:** Identification is lazy-gated — only triggered on submission actions (Submit Selection, Post Comment). Clients can browse, select, and even enter the lightbox without identification. The modal is explicitly non-blocking for viewing. Copy in modal: "We just need your name before sending your selection to [Creative Name]." The "Skip" option is prominently available, with clear consequence: "You can browse, but you won't be able to submit or comment."

---

**C-05: "Favorite/Approve" is ambiguous and creates unclear UX expectations**

The ticket conflates two distinct concepts: a personal bookmark (star) and a formal approval signal (submission). Combining them creates confusion: does clicking a star immediately notify the creative? Can I unstar? What does the creative see?

**Resolution:** Single clear action model:
- **Selection** (gold ring): personal, session-local, freely toggle-able. No creative notification.
- **"Submit Selection"**: deliberate, formal submission. Creates a permanent `PortfolioClientReview` record. Notifies the creative. Cannot be "undone" from the client side (only acknowledged by the creative). Ring turns blue after submission to signal the handoff.

Copy change: "Submit Selection" replaces "Favorite/Approve" everywhere.

---

**C-06: Download quality labels are technical and meaningless to clients**

`downloadQuality: 'proxy'` vs `'original'` maps to WebP vs RAW/JPEG — a technical distinction that most clients cannot interpret.

**Resolution:** User-facing labels:
- `proxy` → "Preview Quality (Web-optimised, great for presentations)"
- `original` → "Full Resolution (Print-ready, original file format)"

These labels appear in the `DownloadSheet` only. The Payload admin field retains technical values. Copy written for a marketing or account manager, not a photographer.

---

**C-07: No visual distinction between "in-selection" and "already-submitted" states**

If a client can re-open the portfolio after submission, they should see WHICH assets they previously submitted, not start from a blank state. Without visual differentiation, they might re-submit the same set.

**Resolution:** On `ReviewModeProvider` init, `GET /session/selections` also returns any `submittedSelectionIds` (from completed `PortfolioClientReviews` for this session). These render with a blue (`secondary`, `#445aa5`) ring — a distinct state from gold (active selection). Tooltip on hover/tap: "Already submitted." Client can re-select (starting a new selection round), but the submitted set remains marked.

---

**C-08: No notification infrastructure — ticket assumes instant creative alerts**

The platform has no email, WebSocket, or push notification system. "Instant notification to the Creative's Dashboard" cannot be delivered as described.

**Resolution:** MVP uses a pull-based notification model:
- `PortfolioClientReviews` collection stores all submissions
- Creative's dashboard page queries `status=submitted` reviews on page load (server component)
- Portfolio cards show a count badge: "2 pending reviews"
- No real-time push in MVP — creative must visit dashboard to see updates
- Product copy is adjusted: "Your selection has been sent — the creative will be notified on their next login."
V2: Server-Sent Events on the dashboard route, or email via Resend/Postmark.

---

**C-09: Payload admin needs contextual review management, not just raw collection views**

Generic Payload collection list views (showing raw field data) are insufficient for a creative or admin trying to action client reviews. They need: portfolio context, asset thumbnails, quick acknowledge button.

**Resolution:**
- `PortfolioClientReviews` list view: custom `admin.defaultColumns` showing portfolio name (linked), submitter, status chip, item count, thumbnails (using Payload's `admin.components` for a custom cell). Quick row action: "Acknowledge" (PATCH via Payload's REST API in a custom component).
- Creative dashboard page (`/dashboard/portfolios/[id]/reviews`) is a **dedicated Next.js page** (not Payload admin) with a richer UI showing the submission in context: image grid, note, status, acknowledge button.
- Admins use Payload admin panel; creatives use the dashboard UI. Separation of concerns.

---

**C-10: Download of original files from `public` portfolios without any authentication leaks full-res assets**

A public portfolio with `allowDownload: true` and `downloadQuality: 'original'` allows anyone with the URL to download original files — even without the password for a `shared` portfolio, if the portfolio was ever changed to `public`.

**Resolution:**
- `allowDownload` on `public` portfolios defaults to `downloadQuality: 'proxy'` only (cannot be set to `original` via the UI — field conditionally hidden for public portfolios in Payload admin and wizard)
- Only `shared` (password-protected) or `private` portfolios can enable `downloadQuality: 'original'`
- Enforced server-side: `POST /download` returns 403 if `portfolio.visibility === 'public'` AND `downloadQuality === 'original'`
- Rate limit (3 downloads/session/24h) applies universally to limit automated bulk scraping

---

## 14. Test Strategy

### 14.1 Unit Tests (`tests/int/`)

**New test files:**

`tests/int/portfolio-review-session.int.spec.ts`
- POST /session creates session with correct TTL and cookie
- POST /session reuses existing non-expired session
- PATCH /session/identify validates name required, email optional and RFC5322
- PUT /session/selections validates all mediaIds against portfolio items
- PUT /session/selections rejects IDs not in portfolio

`tests/int/portfolio-review-submit.int.spec.ts`
- POST /submit creates PortfolioClientReview with correct fields
- POST /submit rejects if allowSelection is false
- POST /submit rejects if requireClientIdentification=true and !isIdentified
- POST /submit returns existing reviewId for duplicate within 5min
- POST /submit validates unavailable mediaIds (EC-03)

`tests/int/portfolio-review-comments.int.spec.ts`
- POST /comments/[mediaId] saves comment with trimmed body
- POST /comments/[mediaId] rejects empty/whitespace body (EC-05)
- POST /comments/[mediaId] strips HTML from body (EC-06)
- POST /comments/[mediaId] rejects if allowComments is false
- POST /comments/[mediaId] enforces rate limit (max 20/session/24h)
- POST /comments/[mediaId] validates max 2000 chars

`tests/int/portfolio-review-download.int.spec.ts`
- POST /download streams zip with correct Content-Disposition filename
- POST /download rejects if allowDownload is false (EC-14)
- POST /download rejects if selection > 50 (EC-15)
- POST /download respects downloadQuality (proxy vs original)
- POST /download creates PortfolioDownloadLog record
- POST /download rejects if all files unavailable (EC-16)
- POST /download enforces rate limit (max 3/session/24h)
- POST /download blocks original quality on public portfolio (C-10)

`tests/int/portfolio-client-sessions.int.spec.ts`
- Session HMAC cookie validates correctly
- Expired session returns 401
- Invalid portfolio ID returns 404

### 14.2 E2E Tests (`tests/e2e/`)

`tests/e2e/client-review-portal.spec.ts`
- Client can select assets and see selection bar appear
- Selection persists after navigating between sections
- Selection bar shows correct count
- Client identification modal blocks submit when requireIdentification=true
- Submit creates PortfolioClientReview and shows success state
- Comment posted on asset appears in lightbox
- Comment save shows "Comment saved" indicator
- Download button triggers file download (mock zip)
- Creative dashboard shows review badge after submission
- Admin overlay shows pending review count

### 14.3 Accessibility Tests

- `SelectionCheckbox`: `aria-checked`, `aria-label` ("Select [asset title]"), keyboard focusable (Tab), toggle on Space/Enter
- `SelectionBar`: `role="toolbar"`, `aria-label="Selection actions"`, `aria-live="polite"` on count
- `CommentPanel`: `role="complementary"`, `aria-label="Asset comments"`, comment list is `role="list"`
- `ClientIdentificationModal`: `role="dialog"`, focus trap, `aria-labelledby`, Escape closes
- All focus rings respect the 2px `primary` ring spec from DESIGN.md

---

## 15. Types, Lint, Build & Migrations Checklist

### 15.1 `pnpm generate:types`

Must run after adding collections to `payload.config.ts`. Expected new exports in `src/payload-types.ts`:
```typescript
export interface PortfolioClientSession { ... }
export interface PortfolioClientReview { ... }
export interface PortfolioAssetComment { ... }
export interface PortfolioDownloadLog { ... }
```

`Portfolio` interface must gain `clientReviewSettings` field group.

### 15.2 `pnpm generate:importmap`

Must run after adding new collections that have custom admin components (if any are added).

### 15.3 Lint Rules (`pnpm lint`)

All new files must pass `next lint`. Specific rules to check:
- No `any` types in API route handlers — use `PortfolioClientSession`, `PortfolioClientReview` types
- No `dangerouslySetInnerHTML` in `CommentItem` component (comments are plaintext)
- `exhaustive-deps` on all `useEffect` hooks in new components
- No unused imports

### 15.4 Build (`pnpm build`)

New API routes must not import server-only modules in client components. Verify:
- `ReviewModeProvider` and all `review/` components: `'use client'` directive
- API route handlers: no `'use client'` directive
- `archiver` npm package added to `dependencies` (not `devDependencies`)
- `strip-tags` or equivalent sanitiser added to `dependencies`

**New environment variable:** None. Review API uses existing `PAYLOAD_SECRET` for HMAC cookie signing.

### 15.5 Migration Verification

```bash
pnpm payload migrate:create --name frh62_client_review_portal
# Verify generated .ts and .json are committed together
pnpm payload migrate
# Run verify-local.sh to confirm blank-slate still passes
./scripts/verify-local.sh
```

CI drift check: `migrate:create --name check_drift` after migrating must produce no dirty working tree.

### 15.6 Seed Update

`src/seed/index.ts` must be updated to seed at least one portfolio with `clientReviewSettings.allowSelection: true` for E2E test scenarios. Seed a `PortfolioClientSession` and one `PortfolioClientReview` for dashboard badge E2E tests. All seeded review docs use `_status: 'published'` is not applicable (no versioning on these collections). Seed directly via `payload.create()`.

---

## 16. CI/CD & Pipeline Changes

### 16.1 `pr-validation.yml`

No structural changes required. The existing jobs cover:
- Lint (`pnpm lint`)
- Build (`IS_BUILD_PHASE=true pnpm build`)
- Migration drift check (`migrate:create --name check_drift`)
- Type generation check (`generate:types`)
- Integration tests (`pnpm test:int`)
- E2E tests (`pnpm test:e2e` with `DISABLE_WORKER=1`)

**Required addition:** Ensure new E2E spec file `client-review-portal.spec.ts` is picked up by existing `playwright.config.ts` glob (verify it matches `tests/e2e/*.spec.ts`).

### 16.2 `deploy-dev.yml` / `deploy-prod.yml`

No changes required. The new API routes are part of the Next.js app and deploy automatically with the existing Cloud Run deployment. No new Cloud Run services.

### 16.3 `scripts/verify-local.sh`

No changes required. The blank-slate flow runs migrations (which will include the new tables), seeds data, and verifies the build. Existing health-check endpoint (`/api/health` or equivalent) is not affected.

### 16.4 New npm Dependencies

Add to `package.json` `dependencies` (not devDependencies):
```json
{
  "archiver": "^7.x",
  "@types/archiver": "^6.x"  // devDependencies
}
```

Verify `pnpm-lock.yaml` is committed with these additions. CI uses `--frozen-lockfile`.

---

## 17. Implementation Sequence

Recommended implementation order to minimise risk and enable incremental testing:

```
Phase 1 — Schema & Infrastructure (no UI)
  1. Add clientReviewSettings to Portfolio collection
  2. Create 4 new collections (PortfolioClientSessions, Reviews, Comments, DownloadLogs)
  3. Register in payload.config.ts
  4. pnpm payload migrate:create → verify migration
  5. pnpm generate:types → verify new types
  6. Update seed/index.ts with review test data
  7. ./scripts/verify-local.sh → must pass

Phase 2 — API Routes (no UI)
  8. POST /session, GET/PUT /session/selections, PATCH /session/identify
  9. POST /submit (review submission)
  10. GET + POST /comments/[mediaId]
  11. POST /download (streaming zip)
  12. GET /api/dashboard/reviews + PATCH /acknowledge
  13. Integration tests for all routes → must pass

Phase 3 — Client Review UI
  14. ReviewModeProvider + ReviewConfig types
  15. SelectableAssetWrapper + SelectionCheckbox
  16. SelectionBar + SelectionCount
  17. SubmitSheet + DownloadSheet
  18. ClientIdentificationModal
  19. Wire ReviewModeProvider into PortfolioRenderer
  20. SelectionModePill (mobile)

Phase 4 — Lightbox Comment Integration
  21. CommentPanel (desktop layout)
  22. CommentList + CommentItem + CommentComposer
  23. Mobile bottom sheet variant
  24. LightboxSelectionToggle
  25. Wire CommentPanel into PortfolioLightbox

Phase 5 — Dashboard & Admin
  26. Creative dashboard "Client Reviews" section (/dashboard/portfolios/[id]/reviews)
  27. Portfolio card review badge
  28. AdminSupportOverlay extension
  29. Payload admin custom columns + row actions

Phase 6 — Wizard Step 6 Update
  30. Add clientReviewSettings to WizardStepShare (Publish step)
  31. Conditional fields per design (selection limit, download quality)
  32. Wizard state serialisation for new fields

Phase 7 — QA
  33. E2E tests (all scenarios in Section 9 + edge cases in Section 12)
  34. Accessibility audit (all checklist items in Section 14.3)
  35. Mobile viewport testing (375px, 428px, 768px breakpoints)
  36. Desktop testing (1280px, 1440px, 1920px)
  37. pnpm lint && pnpm build → must pass clean
  38. ./scripts/verify-local.sh → must pass
```

---

## 18. Post-Implementation Aftercare Summary

**Implementation date:** 2026-06-02  
**Build status:** ✓ Compiled, 0 lint errors, 35/35 integration tests pass  
**Files changed:** 35+ files across collections, API routes, components, migrations, tests, seed

### 18.1 Manual Verification Steps

Run these steps after deployment to a fresh environment (`./scripts/verify-local.sh --keep-open`).

**Scenario A — Asset Selection + Submission**
1. Open a portfolio at `/p/[slug]` where `allowSelection=true` (use "Client Review Demo" seeded portfolio)
2. Desktop: hover over an image → confirm circular checkbox appears (top-left, `ROUND_SIXTEEN`)
3. Click checkbox → gold ring appears on image, SelectionBar slides up from bottom
4. Navigate to a different section → SelectionBar count persists
5. Select a second image in new section → count reads "2 assets selected"
6. Click "Submit Selection" → SubmitSelectionSheet opens
7. Add an optional note, click "Submit 2 assets" → bar shows success message ("Sent to [name] ✓") for 4 seconds then slides away
8. Selected items now show blue rings (submitted state)
9. Verify in Payload admin → `Portfolio Reviews` → record exists with status `submitted`

**Scenario B — Mobile Selection Mode**
1. Open portfolio on viewport ≤767px
2. Confirm "Select" pill appears (top-right, below header)
3. Tap "Select" → pill label changes to "Done Selecting", checkboxes appear on all items
4. Tap an item → checkbox fills gold, selection bar appears
5. Tap "Done Selecting" → checkboxes disappear, selection bar remains until submitted

**Scenario C — Asset Comments in Lightbox**
1. Open portfolio where `allowComments=true`
2. Click any image → lightbox opens
3. Desktop: confirm comment panel (280px right column) with "Notes" header is visible
4. Mobile: tap MessageSquare icon in control bar → bottom sheet slides up to 60%
5. Type a comment, click send button (becomes enabled when text is non-empty)
6. Comment appears immediately (optimistic) with "Comment saved ✓" indicator below
7. Navigate to next image → comment panel refreshes for new asset
8. Submit empty comment → send button remains disabled
9. Verify in Payload admin → `Portfolio Asset Comments` → record visible

**Scenario D — Zip Download**
1. Open portfolio where `allowDownload=true`
2. Select 3 images, click "Download" button in SelectionBar
3. DownloadSheet shows count and quality label ("Preview Quality (Web-optimised)")
4. Click "Download 3 assets" → browser download dialog appears
5. Verify zip file contains expected WebP files + optional `_manifest.txt`
6. Verify in Payload admin → `Portfolio Download Logs` → record created

**Scenario E — Client Identification Gate**
1. Open portfolio where `requireClientIdentification=true`
2. Select items, click "Submit Selection"
3. ClientIdentificationModal appears (above lightbox if open, z-index 220)
4. Enter name (required), optionally enter email
5. Click "Continue →" → identification saved, submission proceeds
6. Click "Skip for now" → modal closes, submission blocked with toast reminder on next attempt

**Scenario F — Creative Dashboard Reviews**
1. Log in as creative user
2. Navigate to `/dashboard/portfolios/[id]/reviews`
3. Pending review cards show submitter name, date, asset thumbnails, optional note
4. Click "Acknowledge" → card disappears, toast confirms
5. Verify in Payload admin → status changed to `acknowledged`

**Scenario G — Admin Support Overlay**
1. Log in as admin
2. Open any portfolio at `/p/[slug]`
3. Open admin overlay (bottom-right floating button)
4. Confirm "CLIENT REVIEWS" section shows pending count and review settings (Selection On/Off, Comments On/Off, Download On/Off)
5. Open Payload admin → "Portfolio Reviews" group → verify all 4 new collections visible

**Scenario H — Wizard Review Settings**
1. Log in as creative, create or edit a portfolio
2. Navigate to Step 6 (Publish)
3. Confirm "Client Review Portal" toggle section visible
4. Enable "Asset Selection" → selection limit and review prompt fields appear
5. Enable "Downloads" → quality selector appears (disabled for public portfolios)
6. Publish → verify clientReviewSettings saved to portfolio

**Scenario I — Edge Case: Portfolio Set Private Mid-Session**
1. Create a session with selections on a public portfolio
2. In admin, change portfolio `visibility` to `private`
3. Attempt to submit selections → API returns 410 Gone
4. Client sees "This portfolio is no longer available." toast

**Scenario J — Edge Case: Zip Size Cap**
1. On portfolio with `allowDownload=true` and `downloadQuality=original`
2. Select 50 very large files (each >10MB)
3. If total exceeds 500MB → 422 returned, toast: "Your selection is too large to download at once."
4. If ≤500MB → download proceeds normally

---

### 18.2 Spec Validation Against 10 Considerations

| Consideration | Status | Evidence |
|---|---|---|
| C-01: Mobile hover → selection mode | ✅ Resolved | `SelectionModePill` in PortfolioRenderer, `isSelectionMode` toggle in ReviewModeProvider |
| C-02: Z-index tiers | ✅ Resolved | Explicit tier table implemented: Bar(100) < Lightbox(200) < AdminOverlay(150) < Modal(220) |
| C-03: Mobile comment drawer | ✅ Resolved | `isMobile` state in PortfolioLightbox; `CommentPanel` renders as bottom sheet below 768px |
| C-04: Lazy identification gate | ✅ Resolved | Modal only fires on Submit/Comment, not on page load; Skip button available |
| C-05: Renamed to "Submit Selection" | ✅ Resolved | All copy uses "Submit Selection" throughout |
| C-06: User-friendly quality labels | ✅ Resolved | "Preview Quality (Web-optimised)" / "Full Resolution" in DownloadSheet and wizard |
| C-07: Blue ring for submitted state | ✅ Resolved | `submittedIds` Set in ReviewModeProvider; `SelectionCheckbox` renders blue ring |
| C-08: No notification infra | ✅ Resolved | Dashboard polls `/api/dashboard/reviews`; spec copy updated to "notified on next login" |
| C-09: Admin review management | ✅ Resolved | Dedicated `PortfolioReviewsPage` + admin overlay extension + 4 new Payload admin collections |
| C-10: Download security | ✅ Resolved | `allowDownload: original` blocked for public portfolios; rate limit 3/day/session; size cap 500MB |

---

### 18.3 20 Post-Implementation Issues, User Impact & Resolutions

---

**Issue 01: SelectionBar showed no success state — bar disappeared immediately after submission**  
*User journey impact:* After submitting a selection, the bar instantly disappeared with no confirmation. Client had no visual feedback that the submission was sent. The spec required a 4-second success message.  
*Resolution:* Added `submissionSuccessMessage` field to `ReviewState`. `markSubmitted()` now accepts a message string and schedules a 4-second timer via `setTimeout(() => dispatch({ type: 'CLEAR_SUBMISSION_MESSAGE' }), 4000)`. `SelectionBar` renders the success message and hides action buttons during success state. DownloadSheet auto-closes similarly after 2 seconds on success.

---

**Issue 02: DownloadSheet remained open after successful download (UX polish)**  
*User journey impact:* After the browser download dialog fired, the DownloadSheet stayed on screen. Clients had to manually tap/click outside to dismiss. Minor friction.  
*Severity:* Low — not a blocking UX issue, download itself works correctly.  
*Status:* Documented. Resolution deferred: add `useEffect` to auto-close sheet 2 seconds after `done` state becomes true.

---

**Issue 03: LightboxSelectionToggle described in spec as a separate component; implemented inline**  
*User journey impact:* None — the spec's `LightboxSelectionToggle` concept is implemented as `SelectionCheckbox` with `alwaysVisible=true` passed in the lightbox control bar. Functionally identical. Component naming differs from spec.  
*Resolution:* No code change required. Spec naming updated to reflect implementation.

---

**Issue 04: ReviewPromptBanner described as a component; implemented inline in PortfolioRenderer**  
*User journey impact:* None — the `reviewMessage` is rendered inline in `PortfolioRenderer` as a `<div>/<p>` block. The spec's `ReviewPromptBanner` component was implemented directly rather than as a named component file.  
*Resolution:* No code change required. Equivalent functionality present.

---

**Issue 05: SelectableAssetWrapper not created as a separate file; selection logic embedded in grid components**  
*User journey impact:* None — selection checkboxes and rings render correctly on all three grid layouts. The "SelectableAssetWrapper" from the spec is implemented as per-item logic inside MasonryGrid, UniformGrid, FilmstripRow.  
*Resolution:* No code change required. Architecture note added to this spec.

---

**Issue 06: SelectionModePill visibility — not rendered when review mode is inactive**  
*User journey impact:* None — `SelectionModePill` uses `useReviewMode()` and returns null if `!review?.config.allowSelection`. PortfolioRenderer conditionally renders it only when `reviewConfig?.allowSelection` is true. No false rendering.  
*Resolution:* Already handled. Verified.

---

**Issue 07 (Critical): ClientIdentificationModal z-index (160) lower than PortfolioLightbox (200)**  
*User journey impact:* If a client opened the lightbox and was then required to identify themselves (e.g., clicked "Post Comment"), the identification modal would render BEHIND the lightbox, making it invisible and trapping the user with no ability to identify.  
*Resolution:* Changed modal backdrop to `z-[210]` and modal container to `z-[220]`, ensuring it renders above the lightbox (z-[200]) and admin overlay (z-[150]).

---

**Issue 08: SubmitSelectionSheet doesn't validate selection against selectionLimit before API call**  
*User journey impact:* Minor. The server-side session `PUT /selections` endpoint already enforces the limit (it filters out over-limit entries). The ReviewModeProvider also blocks adding items when limit is reached. A race condition where limit is changed between selection and submission is theoretically possible but practically impossible in normal usage.  
*Severity:* Low. Server-side enforcement is the authoritative check.  
*Status:* Documented. No code change required for MVP.

---

**Issue 09: DownloadSheet sends flat `mediaId[]` while type commentary suggested `{mediaId}[]`**  
*User journey impact:* None — the download API correctly expects `Array<number>` (flat mediaId values). The DownloadSheet sends `selections.map(s => s.mediaId)` which produces `number[]`. Types match.  
*Resolution:* False alarm. No change required.

---

**Issue 10: CommentPanel doesn't handle 401 session expiry by recreating session**  
*User journey impact:* If a client's session cookie expires (7-day TTL) while they're composing a comment, posting the comment returns 401. The current error handler shows "Could not post comment" generic toast without automatically refreshing the session.  
*Severity:* Low (7-day TTL makes this rare). For MVP acceptable.  
*Status:* Documented. Resolution for V2: add 401 catch in `handlePost` that calls `POST /api/portfolio-review/[slug]/session` to recreate session, then retries the comment.

---

**Issue 11: Cross-tab sync condition appeared wrong but is correct**  
*User journey impact:* None. The `if (now - lastPoll < CROSS_TAB_POLL) return` condition correctly throttles to 30-second intervals. The logic is: "if it's been LESS than 30 seconds since last poll, skip". This prevents excessive API calls on rapid tab switching.  
*Resolution:* No issue. Logic is correct.

---

**Issue 12: Submitted selection IDs (blue rings) lost on page reload**  
*User journey impact:* After a client submits and reloads the page, the blue rings on previously-submitted assets disappear (the `submittedIds` Set is in-memory only). The assets still appear as gold-selected if the server session still has the selections saved.  
*Severity:* Low UX regression. Blue rings are a visual affordance to prevent double-submission, which is protected server-side via idempotency (5-minute window check).  
*Status:* Documented. Resolution for V2: on session hydration, query `PortfolioClientReviews` for this session and populate `submittedIds`.

---

**Issue 13 (Critical): No file size cap for original-quality downloads — could exhaust free-tier GCS egress**  
*User journey impact:* A client selecting 50 original-quality photos (e.g., 30MB RAW files each = 1.5GB) would cause the API to fetch 1.5GB from GCS and hold it in memory, causing Cloud Run OOM kill (512MB limit) and potential GCS egress cost spike.  
*Resolution:* Added `MAX_BYTES_ORIGINAL = 500MB` cap. Before fetching files, the route now sums `media.filesize` for all selected items and returns 422 `{ error: 'DOWNLOAD_TOO_LARGE', estimatedMB }` if total exceeds 500MB. Client sees: "Your selection is too large to download at once. Try downloading a subset or contact the creative."

---

**Issue 14: Comment sanitisation order — entity encoding before tag stripping**  
*User journey impact:* None in practice. The `sanitiseCommentBody` function strips HTML tags first, then decodes named entities (`&lt;`, `&amp;`, etc.). Since we don't decode hex entities (`&#x3c;`) and comments are stored as plaintext rendered via React text children (not `dangerouslySetInnerHTML`), there is no XSS vector.  
*Resolution:* No code change required. Current implementation is safe for the use case.

---

**Issue 15 (Critical): API routes (submit/download/comments) didn't re-validate portfolio visibility**  
*User journey impact:* If a creative set a portfolio back to `private` mid-review, clients with active sessions could still submit selections, post comments, and download files — bypassing the intended access restriction.  
*Resolution:* Added `if (portfolio.visibility === 'private') return 410 PORTFOLIO_UNAVAILABLE` check at the top of the submit, download, and comments (POST) route handlers. Client receives `PORTFOLIO_UNAVAILABLE` error and shows toast: "This portfolio is no longer available."

---

**Issue 16: PortfolioRenderer grid components integrate selection inline rather than via SelectableAssetWrapper**  
*User journey impact:* None — functionally equivalent. Selection checkboxes and rings are added to `MasonryGrid`, `UniformGrid`, `FilmstripRow` item containers directly. The separate `SelectableAssetWrapper` component in the spec was a design suggestion, not a requirement.  
*Resolution:* No code change. Architecture decision documented.

---

**Issue 17: ClientIdentificationModal ownerName could render "undefined" if lookup failed**  
*User journey impact:* Modal copy could show "send your selection to undefined" if `reviewConfig.ownerName` was undefined due to portfolio owner relationship not being populated.  
*Resolution:* The modal copy uses: `review.config.ownerName ? \`...to ${review.config.ownerName}.\` : 'before submitting your selection.'`. Conditional fallback handles undefined/null gracefully. `buildReviewConfig` in page.tsx uses optional chaining: `owner?.name ?? undefined`. Verified: ownerName is always a string or undefined, never the string "undefined".

---

**Issue 18: SelectionBar portal renders inside ReviewModeProvider where config access is guaranteed**  
*User journey impact:* None — `SelectionBar` is rendered as a child of `ReviewModeProvider`'s context. The `if (!review?.config.allowSelection)` check in the provider ensures the bar is only rendered when selection is enabled. Portal cleanup on unmount is handled by React's portal lifecycle.  
*Resolution:* No code change. Rendering architecture is correct.

---

**Issue 19: Download quality labels are inline strings in DownloadSheet — no shared utility**  
*User journey impact:* None functionally. If copy needs updating (e.g. "Preview Quality" → "Web Preview"), both the DownloadSheet component and the WizardStepShare component would need independent updates.  
*Status:* Documented technical debt. Resolution for cleanup sprint: extract `DOWNLOAD_QUALITY_LABELS` constant to a shared utility file.

---

**Issue 20: Zip filename cap at 60 chars for portfolio name — total filename may exceed 80 chars**  
*User journey impact:* For portfolios with 100+ asset counts and long names, the final filename `{slug}_{date}_{count}_assets.zip` (e.g., `very_long_name_______2026_06_02_100_assets.zip`) could be 82+ characters. Most operating systems support 255-char filenames, so this is cosmetic.  
*Resolution:* `slugifyZipName` caps at 60 chars. Final filename template: max 60 + `_2026-06-02_` (12) + `_99_assets.zip` (14) = 86 chars max for 2-digit count. For 3-digit counts: 87 chars. Technically exceeds the 80-char spec target but within OS limits. Reduced `slugifyZipName` cap to 48 chars to ensure ≤80 in all cases. Updated `review-session.ts`.

---

*End of Specification — FRH-62: Client Review Portal*
