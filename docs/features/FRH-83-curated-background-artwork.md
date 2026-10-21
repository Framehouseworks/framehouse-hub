# Specification: FRH-83 — Curated Full-Screen Background Artwork on Transfer Download Pages

> **IMPLEMENTATION STATUS:** PARTIALLY IMPLEMENTED (Phase 1 Complete)

**Spec Version:** 2.0  
**Branch Convention:** `FRH-83-Transfer-Background-Canvas`  
**Base Branch:** `dev`  
**Date:** 2026-10-21  

---

## 1. Core Objective & Scope

### 1.1 Objective
Implement an immersive, full-bleed curated background artwork canvas exclusively on transfer recipient download views (`/transfer/[shareHash]` and `/t/[slug]`). The feature showcases high-resolution visual artwork behind the active download card during recipient wait and download states, laying the product and schema foundation for future sponsored brand takeovers and ad-supported monetization. 

To protect platform consistency and aesthetic integrity, this feature strictly targets public download surfaces; transfer creation and upload workflows (which reside inside the sender dashboard at `/dashboard/transfers`) remain strictly untouched. All schema, component, and query namespaces are strictly isolated to the transfer domain (`TransferWallpapers`) to support future domain-specific wallpaper contexts without collision.

### 1.2 Ticket Reference
`FRH-83` — Curated Full-Screen Background Artwork on Transfer Pages (Follow-on to `FRH-67: Link Transfer Generation` and `FRH-68: File Download Expiry & Purge`).

### 1.3 In-Scope Files/Modules
- **Payload Schema & Collections (Isolated Transfer Domain):**
  - `src/collections/TransferWallpapers/index.ts` (collection config: title, asset URLs, artist credit, click-through URL, scheduling, display duration, sponsorship tier, focal point)
  - `src/collections/TransferWallpapers/access.ts` (admin-only mutations, public read filtered by active status and date window)
  - `src/collections/TransferWallpapers/hooks/validateDateRange.ts` (ensure `startDate <= endDate`)
  - `src/payload.config.ts` (register `TransferWallpapers` collection under Content/Transfers group)
  - `src/migrations/YYYYMMDD_HHMMSS_add_transfer_wallpapers_collection.ts` (Postgres schema migration & indexes)
- **Shared Libraries & Queries:**
  - `src/lib/transfer-wallpapers.ts` (Payload Local API helper to query active, validly scheduled transfer wallpapers with deterministic fallback)
- **Frontend Components & Design Tokens:**
  - `src/components/Transfers/TransferWallpaperCanvas/TransferWallpaperCanvas.tsx` (responsive, full-bleed canvas orchestrator, low-priority preloading, per-item custom rotation timer, reduced-motion bypass)
  - `src/components/Transfers/TransferWallpaperCanvas/TransferWallpaperCreditBadge.tsx` (unobtrusive credit badge in screen corner displaying artist/campaign attribution, duration indicators, and external link navigation)
  - `src/components/Transfers/TransferWallpaperCanvas/types.ts` (client and schema interfaces)
  - `src/components/Transfers/TransferDownloadView.tsx` (mount canvas behind recipient card; reinforce dual-layer contrast scrim with existing `DESIGN.md` gallery tokens)
- **Recipient Route Pages:**
  - `src/app/(app)/transfer/[shareHash]/page.tsx` (RSC hydration of active transfer wallpapers, passed to `TransferDownloadView`)
  - `src/app/(app)/t/[slug]/page.tsx` (first-class short-link route resolving either vanity slug or `shareHash` to the recipient view with transfer wallpaper canvas)

### 1.4 Explicit Non-Goals
- **Sender Dashboard & Transfer Workbench (`/dashboard/transfers`):** Strictly out of scope. Authenticated senders managing and uploading deliverables must retain the clean, high-efficiency editorial workspace defined in `DESIGN.md`. No background artwork or canvas injected into the dashboard workbench.
- **Marketing Landing Page (`/`):** Strictly out of scope. The landing page hero and promotional sections must remain untouched.
- **Other Platform Surfaces:** Core DAM library (`/dashboard/library`), Smart Collections, Asset Viewer, Portfolio Builder, and Client Review Portal do not receive transfer wallpapers.
- **Generic Collection Naming:** Generic naming (such as a bare `wallpapers` slug) is forbidden. All models, database tables, and helpers must be explicitly namespaced to transfers (`transfer-wallpapers` / `transfer_wallpapers`) to prevent naming collisions when other platform modules introduce wallpapers in the future.
- **Server-Side Image Transcoding / Compute Overhead:** Zero WebP conversions via Node.js Sharp or Go worker for wallpapers. Media assets stream directly from external CDN/public storage endpoints; media bytes must **never** route through Next.js compute routes (`/_next/image`).
- **Heavy Video Streaming Canvas:** MVP is strictly high-resolution photography and visual artwork (JPEG, PNG, WebP, AVIF). Video loops (MP4/WebM) are deferred to a future phase to prevent mobile data drain and memory saturation.
- **Ad-Network SDK / Complex Programmatic Tracking:** Zero client-side ad-tech SDKs (Google AdSense, Prebid, tracking pixels). Sponsorship metadata is managed natively in Payload CMS.

---

## 2. Platform & Free-Tier Impact Check

| Area | Impact | Details |
|------|:------:|---------|
| **Payload Schema** | **Yes** | Dedicated collection `TransferWallpapers` (`slug: 'transfer-wallpapers'`) under the Content admin group with fields: `title`, `assetUrl`, `mobileAssetUrl`, `artistCredit`, `clickThroughUrl`, `startDate`, `endDate`, `status`, `sponsorshipStatus`, `displayDurationSeconds`, `weight`, and `focalPoint`. |
| **Route Groups** | **Yes** | Scoped strictly to `(app)` download routes: `/transfer/[shareHash]` and `/t/[slug]`. Zero changes to `(dashboard)`, `(portfolio)`, or `(payload)`. |
| **Migrations** | **Yes** | New migration creating table `transfer_wallpapers` with B-tree indexes on `status`, `start_date`, `end_date`, and `weight` to ensure sub-millisecond Neon serverless query latency. |
| **Worker / GCP** | **No** | Zero worker changes. Transfer wallpapers do not generate derivatives or dispatch Eventarc events. Cloud Run remains pinned to `us-central1` with `--memory=512Mi`, `--cpu=1`, `--min-instances=0`, `--max-instances=4`. |
| **Access Control** | **Yes** | `src/collections/TransferWallpapers/access.ts`: Mutations (`create`, `update`, `delete`) restricted to `adminOnly`. `read` is public for active wallpapers (`status = 'active'` and within scheduled date window); full read for admins. |
| **Storage Paths** | **No** | Transfer wallpapers use direct CDN URLs or a dedicated unauthenticated public bucket prefix (`public/wallpapers/*`). Bypasses private tenant storage paths and `signCloudUrls` 1-hour expiration logic. |
| **Free-Tier Risk** | **Zero** | Direct CDN/external storage delivery bypasses Next.js compute and egress. Using `unoptimized: true` on image renders prevents Sharp memory spikes in Node, staying strictly inside Cloud Run 512Mi boundary. |

---

## 3. User Flows & Acceptance Criteria

### 3.1 Architectural Clarification: Recipient URL Normalization
In Framehouse Hub (per FRH-67 and FRH-68), transfer download recipient URLs (`/transfer/[shareHash]` and `/t/[slug]`) are **unified and public**. Whether the person opening the link is an unauthenticated external client, an active creative, or an administrator, the recipient download view is identical. There is no divergent URL or separate view mode for authenticated vs unauthenticated recipients.

### 3.2 User Flows
1. **Recipient Download View Flow:**
   - Any recipient navigates to a transfer link (`/transfer/[shareHash]` or `/t/[slug]`).
   - The Server Component queries Payload Local API for active transfer wallpapers matching `status = 'active'`, `startDate <= NOW()`, and `(endDate IS NULL OR endDate >= NOW())`.
   - Primary wallpaper metadata is embedded directly in the initial HTML payload (zero client network waterfall).
   - The browser streams the high-resolution image directly from the external CDN with `fetchpriority="low"` to preserve bandwidth for chunked file downloads.
   - The recipient view renders the full-bleed artwork behind the frosted glass transfer download card.
   - An unobtrusive credit badge in the bottom-left corner displays artist/campaign attribution with an external click-through link.

2. **Admin-Customisable Timed Rotation Flow:**
   - Administrators configure `displayDurationSeconds` (e.g., 15s to 120s, default: 45s) per wallpaper doc in Payload CMS. High-tier sponsored campaigns can be configured for longer exposure (e.g. 60s), while standard editorial curations rotate faster (30s).
   - If multiple active wallpapers are scheduled, the client canvas orchestrator preloads secondary artwork in rotation during browser idle periods (`requestIdleCallback`) using low-priority `fetch`.
   - When the current wallpaper's `displayDurationSeconds` timer elapses, the canvas executes a gentle 1.2s crossfade transition to the next visual in the rotation sequence.
   - If an active file download is in flight, rotation transitions continue visually using cached images without triggering new network bursts.

3. **Reduced-Motion Preference Flow:**
   - Recipient has `prefers-reduced-motion: reduce` enabled in system settings.
   - The canvas detects the media query, immediately disables rotation timers and crossfade animations, and displays either a static single wallpaper or a solid tonal neutral overlay (`bg-gallery-surface`).

4. **Admin Curation & Campaign Scheduling Flow:**
   - Admin logs into `/admin` and navigates to **Transfer Wallpapers**.
   - Admin creates a new curation, inputs the title, direct CDN image URL, artist attribution, sponsor landing link, schedule window (`startDate` to `endDate`), custom display duration (`displayDurationSeconds`), and flags as `sponsored` or `editorial`.
   - Changes take effect instantly upon publication without requiring frontend deployments or service restarts.

### 3.3 Acceptance Criteria
- [ ] **AC-1:** Given any recipient visiting a transfer download link (`/transfer/[shareHash]` or `/t/[slug]`), regardless of authentication status, When the page loads, Then an active curated wallpaper is fetched via RSC (zero extra client network waterfall) and displayed as a full-bleed responsive background canvas behind the transfer download card without visual flash or layout shift.
- [ ] **AC-2:** Given a high-contrast or light-toned background artwork, When displayed behind the transfer card, Then the frosted glass card (`backdrop-blur-2xl bg-white/90 dark:bg-zinc-950/85` with ghost borders) guarantees WCAG AA contrast (≥ 4.5:1 for body copy, ≥ 3:1 for display headers) across both light and dark themes.
- [ ] **AC-3:** Given an active wallpaper, When rendered on the download view, Then an unobtrusive credit badge is positioned in the bottom screen corner displaying artist/campaign title and attribution, linking out to `clickThroughUrl` with `target="_blank"` and `rel="noopener noreferrer"`.
- [ ] **AC-4:** Given a session with multiple active transfer wallpapers, When the recipient remains on the download page, Then the canvas rotates visuals according to each wallpaper's administrator-configured `displayDurationSeconds`, preloading secondary artwork with low network priority (`fetchpriority="low"`) without blocking direct-to-GCS download chunk streams.
- [ ] **AC-5:** Given an operating system with `prefers-reduced-motion: reduce`, When visiting transfer download pages, Then all crossfade transitions and rotation timers are disabled, presenting a static image or solid tonal neutral background (`bg-gallery-surface`).
- [ ] **AC-6:** Given an administrator in the Payload Admin panel (`/admin`), When navigating to the `Transfer Wallpapers` collection, Then the admin can create, edit, schedule (date ranges), set custom rotation duration, weight, and deactivate curated or sponsored wallpaper campaigns.
- [ ] **AC-7:** Given recipient download traffic, When wallpaper visuals stream to browsers, Then zero wallpaper image bytes route through Next.js serverless compute (`/_next/image`), and Cloud Run memory consumption remains strictly under 512Mi.
- [ ] **AC-8:** Given the sender transfer workbench at `/dashboard/transfers` or the marketing landing page at `/`, When navigated to, Then zero wallpaper canvas markup is rendered, leaving dashboard and platform aesthetics completely unaffected.

---

## 4. Adversarial Review & Self-Correction Log
*(5 critical issues identified during codebase cross-examination and resolved in this specification)*

| # | Category | Issue Found | Remediation |
|---|----------|-------------|-------------|
| **1** | **Free-Tier / Memory** | **Cloud Run 512Mi Memory Crash via `/_next/image`:** Using standard Next.js `<Image />` without `unoptimized` routes 4K/8K wallpaper requests through `/_next/image`. Sharp decodes multi-megabyte images in Node memory, quickly exceeding Cloud Run's 512Mi ceiling under concurrent traffic and triggering SIGKILL container restarts. | **Direct CDN Streaming Contract:** Enforce `unoptimized: true` on all wallpaper image components or use native responsive `<picture>`/`<img>` elements with direct external CDN/GCS URLs. Zero wallpaper bytes route through Next.js compute. |
| **2** | **Network / Contention** | **Bandwidth Contention with Direct-to-GCS 250MB Transfers:** If high-resolution wallpaper preloading competes on default browser priority with 250MB download streams, download TTFB and chunk throughput degrade significantly. | **Deprioritized Asset Pipeline:** Set `fetchpriority="low"` and `loading="lazy"` on all wallpaper image tags and prefetch links. Defer rotation preloading to `requestIdleCallback` and pause prefetching while active XHR download streams are in flight. |
| **3** | **Namespace & Domain Drift** | **Generic Collection Naming Collision:** Naming the collection `Wallpapers` risks schema conflicts when future platform features (portfolios, client review rooms, public profiles) require distinct wallpaper schemas or configurations. | **Specific Domain Namespacing:** Collection explicitly named `TransferWallpapers` (`slug: 'transfer-wallpapers'`, table `transfer_wallpapers`). All helper functions (`getActiveTransferWallpapers`) and components (`TransferWallpaperCanvas`) are scoped to the transfer domain. |
| **4** | **Storage Path / Auth** | **Private GCS Signed URL Expiration (1-hour TTL):** If wallpapers are linked to private `Media` collection documents, `signCloudUrls` signs URLs with a 60-minute expiration. Users leaving download tabs open overnight encounter broken image `403 Forbidden` errors. | **Public CDN Asset Isolation:** Transfer wallpapers store direct public CDN/HTTPS URLs (`assetUrl`). Read access on `TransferWallpapers` is open to unauthenticated users (`publicAccess` filtered by active status and date window), bypassing private storage hooks and token signing. |
| **5** | **UI / Accessibility** | **WCAG Contrast Failure Against Uncontrolled Visuals:** Curated or sponsored artwork can feature extreme highlights, pure white backgrounds, or busy patterns. Transparent UI containers without sufficient scrim will fail WCAG AA contrast (4.5:1). | **Dual-Layer Contrast Shield:** Implement an ambient background vignette scrim (`bg-black/25 dark:bg-black/45`) coupled with high-diffusion frosted glass panels (`backdrop-blur-2xl bg-white/90 dark:bg-zinc-950/85` with `DESIGN.md` ghost borders), guaranteeing legibility regardless of artwork luminance. |

---

## 5. Architecture & Component Blueprint

```
+-----------------------------------------------------------------------------------+
| Recipient Viewport: /transfer/[shareHash] or /t/[slug]                            |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Layer 0: Full-Bleed Canvas (z-0, fixed, inset-0, unoptimized direct CDN)    |  |
|  |  [Active Transfer Wallpaper] <--(admin-set duration crossfade / freeze)    |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Layer 1: Ambient Contrast Scrim (z-[1], inset-0, bg-black/25 dark:black/45) |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Layer 2: Interactive Download Card (z-10, relative, min-h-screen)          |  |
|  |                                                                             |  |
|  |    +-------------------------------------------------------------------+    |  |
|  |    | Frosted Glass Container (backdrop-blur-2xl bg-white/90 dark:950)   |    |  |
|  |    | - Brand & Sender Attribution (Varela Round & Geist)               |    |  |
|  |    | - File Metadata Chips (Rubik Mono One)                            |    |  |
|  |    | - Direct-to-GCS Download CTA (Button variant="gallery")           |    |  |
|  |    | - Retention / Security Indicators (Clock & ShieldCheck)           |    |  |
|  |    +-------------------------------------------------------------------+    |  |
|  |                                                                             |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | Layer 3: Credit Badge (z-20, fixed, bottom-4 left-4, pointer-events-auto)|  |  |
|  |  | [SPONSORED / CURATED] Title - Artist Attribution (External Link)       |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 6. Design System & Styling Contract (`DESIGN.md`)

The transfer wallpaper presentation adheres strictly to the tokens and conventions established in `DESIGN.md` ("The Curated Gallery"):

1. **Strictly Prohibited:** 1px solid borders for visual separation.
2. **Elevation & Frosted Glass Layering:**
   - **Base Canvas:** Direct CDN visual background with `object-cover object-center`.
   - **Tonal Contrast Scrim:** Ambient dark vignette: `bg-black/25 dark:bg-black/45 backdrop-brightness-95`.
   - **Card Container:** `rounded-4xl bg-white/90 dark:bg-zinc-950/85 backdrop-blur-2xl shadow-[0px_24px_56px_rgba(0,0,0,0.18)]`.
   - **Ghost Borders:** Where boundaries are required for accessibility: `border border-white/20 dark:border-white/10`.
3. **Typography & Metadata Hierarchy:**
   - **Display & Headings:** Geist (`font-sans tracking-tight text-primary`).
   - **Brand / Curator Mark:** Varela Round (`font-varela text-xl text-primary`).
   - **Metadata Labels & Chips:** Rubik Mono One (`font-rubik text-[9.5px] uppercase tracking-[0.2em] text-gallery-gold bg-gallery-gold/10`).
   - **Body & Secondary Copy:** Soft ink neutral (`text-on-surface/70` and `text-on-surface/50`).
4. **Reusable UI Components:**
   - Primary download CTA: `<Button variant="gallery" size="lg" className="w-full h-14 gap-2.5 text-base font-semibold shadow-[0px_8px_20px_rgba(127,87,0,0.25)]">`.
   - Curator Icon: `<LogoIcon size={38} />`.

---

## 7. Phased Implementation Plan

### Phase 1: Database & Schema Layer (Payload CMS 3.x)
- **Target Files:**
  - `src/collections/TransferWallpapers/index.ts`
  - `src/collections/TransferWallpapers/access.ts`
  - `src/collections/TransferWallpapers/hooks/validateDateRange.ts`
  - `src/payload.config.ts`
  - `src/migrations/20261021_170000_add_transfer_wallpapers_collection.ts`
- **Agent Tasks:**
  1. Define `TransferWallpapers` collection config in `src/collections/TransferWallpapers/index.ts`:
     ```ts
     // Slug: 'transfer-wallpapers'
     // Group: 'Content' (or 'Transfers')
     // UseAsTitle: 'title'
     // DefaultColumns: ['title', 'sponsorshipStatus', 'status', 'displayDurationSeconds', 'startDate', 'endDate']
     // Fields:
     // - title: text (required)
     // - assetUrl: text (required, direct HTTPS CDN URL)
     // - mobileAssetUrl: text (optional, portrait aspect ratio CDN URL)
     // - artistCredit: text (required, e.g. "Artwork by Studio K")
     // - clickThroughUrl: text (optional, URL to artist portfolio or sponsor campaign)
     // - sponsorshipStatus: select ['editorial', 'sponsored'] (default: 'editorial', required)
     // - status: select ['active', 'inactive', 'archived'] (default: 'active', required, indexed)
     // - displayDurationSeconds: number (required, default: 45, min: 5, max: 300, admin.description: "Display duration in seconds before rotating")
     // - startDate: date (required, default: now, indexed)
     // - endDate: date (optional, indexed)
     // - weight: number (default: 100, higher = higher rotation priority)
     // - focalPoint: select ['center', 'top', 'bottom', 'left', 'right'] (default: 'center')
     ```
  2. Implement access control in `src/collections/TransferWallpapers/access.ts`:
     - `create`, `update`, `delete`: `adminOnly`.
     - `read`: Return `true` for admins; for unauthenticated/public recipients, return compound query `{ status: { equals: 'active' }, startDate: { less_than_equal: now } }`.
  3. Implement `validateDateRange` hook in `src/collections/TransferWallpapers/hooks/validateDateRange.ts` ensuring `endDate >= startDate` when `endDate` is provided.
  4. Register `TransferWallpapers` in `src/payload.config.ts` under `collections`.
  5. Generate migration `add_transfer_wallpapers_collection` creating table `transfer_wallpapers` with indexes on `status`, `start_date`, `end_date`, and `weight`.
- **Manual Infrastructure / Setup Steps:** None.
- **Verification Steps:**
  1. Run `pnpm payload migrate:create` and `pnpm generate:types`.
  2. Run `scripts/verify-local.sh` to confirm clean migration run against blank database.
  3. Run `IS_BUILD_PHASE=true pnpm build` to verify type safety and zero schema drift.

---

### Phase 2: Service & Component Infrastructure Layer
- **Target Files:**
  - `src/lib/transfer-wallpapers.ts`
  - `src/components/Transfers/TransferWallpaperCanvas/types.ts`
  - `src/components/Transfers/TransferWallpaperCanvas/TransferWallpaperCanvas.tsx`
  - `src/components/Transfers/TransferWallpaperCanvas/TransferWallpaperCreditBadge.tsx`
- **Agent Tasks:**
  1. Author `src/lib/transfer-wallpapers.ts`:
     - Export `getActiveTransferWallpapers(payload)` executing a cached Local API query:
       ```ts
       const now = new Date().toISOString()
       const { docs } = await payload.find({
         collection: 'transfer-wallpapers',
         where: {
           and: [
             { status: { equals: 'active' } },
             { startDate: { less_than_equal: now } },
             { or: [{ endDate: { exists: false } }, { endDate: { greater_than_equal: now } }] },
           ],
         },
         sort: '-weight',
         limit: 20,
         overrideAccess: true,
       })
       ```
     - Provide deterministic editorial fallback artwork if zero active records are returned from the database.
  2. Create `src/components/Transfers/TransferWallpaperCanvas/TransferWallpaperCreditBadge.tsx`:
     - Adhere strictly to `DESIGN.md` "The Curated Gallery":
     - Background: `bg-black/50 dark:bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5`.
     - Typography: Category tag in **Rubik Mono One** (`font-rubik text-[9px] uppercase tracking-wider text-gallery-gold mr-2`), artist attribution in **Geist** (`font-sans text-xs text-white/90`).
     - External link: `target="_blank"`, `rel="noopener noreferrer"` with `ExternalLink` icon from `lucide-react`.
  3. Create `src/components/Transfers/TransferWallpaperCanvas/TransferWallpaperCanvas.tsx`:
     - Client Component with `'use client'`.
     - Full-bleed fixed canvas (`fixed inset-0 pointer-events-none -z-10 overflow-hidden`).
     - Stream images directly via native `<img>` or Next `<Image unoptimized ... />` using `fetchpriority="low"`.
     - Implement `prefers-reduced-motion` listener (`window.matchMedia('(prefers-reduced-motion: reduce)')`): freezes rotation timer and eliminates transition opacity shifts.
     - Custom rotation timing: Read `currentWallpaper.displayDurationSeconds || 45` and set active timer accordingly.
     - Low-priority preloading: secondary artwork preloaded via `new window.Image()` inside `requestIdleCallback` to avoid competing with file transfer streams.
     - Add ambient dark scrim layer (`absolute inset-0 bg-black/25 dark:bg-black/45 backdrop-brightness-95`).
- **Manual Infrastructure / Setup Steps:** None.
- **Verification Steps:**
  1. Add unit test suite in `tests/unit/transfer-wallpapers.spec.ts` testing active date range query filters, custom rotation duration handling, fallback selection, and sorting.
  2. Verify component renders properly in test harness without console errors or hydration mismatches.

---

### Phase 3: UI & Download Route Integration Layer
- **Target Files:**
  - `src/app/(app)/transfer/[shareHash]/page.tsx`
  - `src/app/(app)/t/[slug]/page.tsx`
  - `src/components/Transfers/TransferDownloadView.tsx`
- **Agent Tasks:**
  1. Update `src/app/(app)/transfer/[shareHash]/page.tsx`:
     - Hydrate active transfer wallpapers via `getActiveTransferWallpapers(payload)` in RSC.
     - Pass wallpapers into `<TransferDownloadView transfer={transfer} status={status} wallpapers={wallpapers} />`.
  2. Implement `src/app/(app)/t/[slug]/page.tsx`:
     - Provide short-link vanity resolver for `/t/:slug`.
     - Queries `transfers` by `shareHash: slug` (or slug alias), hydrating active wallpapers and rendering `TransferDownloadView`.
  3. Update `src/components/Transfers/TransferDownloadView.tsx`:
     - Mount `<TransferWallpaperCanvas wallpapers={wallpapers} />` at root of the view.
     - Ensure the frosted card container maintains `backdrop-blur-2xl bg-white/90 dark:bg-zinc-950/85` and `shadow-[0px_24px_56px_rgba(0,0,0,0.18)]` to protect WCAG AA text contrast against bright or textured wallpapers.
     - Mount `<TransferWallpaperCreditBadge />` in corner of viewport (clickable, pointer-events-auto).
  4. Ensure zero modifications are made to:
     - `src/app/(dashboard)/dashboard/transfers/page.tsx`
     - `src/components/Transfers/TransferWorkbench.tsx`
     - `src/app/(app)/page.tsx`
- **Manual Infrastructure / Setup Steps:** None.
- **Verification Steps:**
  1. Run `pnpm build` with `IS_BUILD_PHASE=true` to ensure full build success.
  2. Run Playwright end-to-end test verifying:
     - Full-bleed canvas renders on `/transfer/[shareHash]` and `/t/[slug]`.
     - Sender workbench at `/dashboard/transfers` remains clean, unaffected, with zero wallpaper canvas elements.
     - Credit badge links correctly to `clickThroughUrl`.
     - WCAG contrast on all text elements passes ≥ 4.5:1.
     - Zero requests are sent to `/_next/image` in network tab.
     - `prefers-reduced-motion` disables rotation crossfade.
     - Rotation occurs on the administrator-configured `displayDurationSeconds` interval.

---

## 8. Rollback Plan

### 8.1 Database Rollback
If the schema migration causes issues in production:
1. Run down migration:
   ```bash
   pnpm payload migrate:down
   ```
2. The down migration drops the `transfer_wallpapers` table and associated indexes safely without impacting `transfers`, `media`, or `users` tables.

### 8.2 Application Layer Rollback
1. Revert Git commits associated with `FRH-83-Transfer-Background-Canvas`.
2. The UI falls back instantly to the baseline CSS background (`bg-gallery-surface`), preserving 100% of transfer upload and download functionality.
3. Deploy reverted image via Cloud Run CI/CD pipeline (`gcloud run deploy framehouse-hub`).
