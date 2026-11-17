# Specification: FRH-80 Multi-File Transfer Recipient View

> **IMPLEMENTATION STATUS:** IMPLEMENTED (All Phases Complete)

**Spec Version:** 1.0
**Branch Convention:** `FRH-80-Multi-File-Recipient-View`
**Base Branch:** `dev`
**Date:** 2026-11-15

---

## 1. Core Objective & Scope

- **Objective:** Upgrade the public transfer recipient page (`/transfer/[shareHash]`) to render all constituent files in a multi-file transfer as a responsive visual grid with batch metadata, per-file inline previews via a lightbox, individual signed-URL downloads, and a prominent "Download All" action. The view must remain fully backward-compatible with legacy single-file transfers (FRH-67) and password-protected transfers (FRH-70).
- **Ticket Reference:** FRH-80: Multi-File Transfer Recipient View
- **In-Scope Files/Modules:**
  - `src/app/(app)/transfer/[shareHash]/page.tsx` (RSC metadata enrichment for multi-file)
  - `src/components/Transfers/TransferDownloadView.tsx` (primary recipient UI — multi-file grid, lightbox, batch header)
  - `src/components/Transfers/Preview/TransferMediaPreview.tsx` (extend for per-file dispatch in lightbox)
  - `src/components/Transfers/Preview/types.ts` (extend `TransferPreviewResponse` for multi-file array variant)
  - `src/collections/Transfers/endpoints.ts` (new `/:shareHash/download/:fileIndex` per-file download endpoint; update `/:shareHash/preview` for per-file index param)
- **Explicit Non-Goals:**
  - **Server-side ZIP bundling:** No dynamic zip archive generation on Cloud Run (violates 512Mi memory cap). "Download All" triggers sequential browser-side downloads or a client-side zip library in a follow-up ticket if validated.
  - **Client-side ZIP streaming (JSZip/fflate):** Deferred to FRH-80.1 follow-up — keeps this ticket's blast radius narrow and avoids bundling a new dependency.
  - **Thumbnail generation via Go worker:** Transfer assets intentionally bypass the Go worker pipeline (FRH-67 §3.1). Thumbnails use existing signed GCS URLs for web-previewable formats; non-visual assets render `TransferFallbackCard`.
  - **Schema/migration changes:** Zero database changes. The `files` array field and root backward-compatible fields already exist from FRH-79.
  - **Upload-side changes:** No modifications to `TransferWorkbench.tsx` or `transfer-upload.ts`.

---

## 2. Platform & Free-Tier Impact Check

| Area | Impact | Details |
|------|--------|---------|
| **Payload Schema** | No | Zero schema changes. Reads existing `files` array and root fields. |
| **Route Groups** | No | Remains under existing `(app)` route group. |
| **Migrations** | No | No new migrations required. |
| **Worker / GCP** | No | No Go worker involvement. Cloud Run serves signed URL redirects only (zero memory for file bytes). `us-central1`, `--memory=512Mi` unchanged. |
| **Access Control** | No | Reuses existing `transfersAccess` (public read for active/unexpired). Endpoint auth reuses `extractBearerToken` + `verifyTransferToken` for password-protected transfers. |
| **Storage Paths** | No | Reads existing `files[].storagePath` values. No new path segments. |
| **Free-Tier Risk** | Low | Additional signed URL generation calls (one per file for preview/download). GCS v4 signing is free; no additional storage, compute, or egress beyond what single-file already incurs. Each preview request generates one signed URL per file (max 5 per transfer), well within free-tier IAM signing quotas. |

---

## 3. User Flows & Acceptance Criteria

- [ ] **AC-1 (Multi-File Grid Rendering):** Given a multi-file transfer with 2–5 files, When a recipient navigates to `/transfer/[shareHash]`, Then all files render in a responsive grid within the existing presentation card — visual assets (image, video) show thumbnail previews via signed URLs; non-visual assets display `TransferFallbackCard` with file icon, name, size, and format badge.
- [ ] **AC-2 (Batch Summary Header):** Given any transfer (single or multi-file), When the page loads, Then the header displays the total file count (e.g., "3 files"), combined uncompressed size (e.g., "142.8 MB"), and the expiration countdown. For single-file transfers, the existing single-file metadata card renders unchanged (backward-compatible).
- [ ] **AC-3 (Per-File Individual Download):** Given a multi-file transfer, When the recipient clicks a per-file download button, Then a short-lived signed GCS GET URL is generated at request time for that specific file's `storagePath`, and the browser initiates a direct download without navigating away.
- [ ] **AC-4 (Download All Action):** Given a multi-file transfer, When the recipient clicks "Download All", Then all files are downloaded sequentially via individual signed URL redirects (one per file) triggered with staggered `setTimeout` delays to avoid browser popup blocking. No server-side zip is generated.
- [ ] **AC-5 (Lightbox / Modal Preview):** Given a multi-file transfer containing visual assets, When the recipient clicks a file thumbnail or "Preview" action on a specific file, Then a modal/lightbox overlay opens showing the high-resolution preview via the existing `TransferMediaPreview` component pipeline (signed URL for eligible formats, fallback card for ineligible). Navigation arrows allow cycling through files within the lightbox.
- [ ] **AC-6 (Single-File Backward Compatibility):** Given a legacy single-file transfer (or a transfer with `files.length === 1`), When the recipient navigates to the page, Then the existing single-file presentation card renders identically to the current FRH-67/82 experience with no visual regression.
- [ ] **AC-7 (Password-Protected Multi-File):** Given a password-protected multi-file transfer, When the recipient unlocks via password, Then the multi-file grid, per-file downloads, and lightbox all function correctly using the short-lived HMAC `authToken` passed in `Authorization: Bearer` headers.
- [ ] **AC-8 (OG Metadata):** Given a multi-file transfer, When the page is loaded, Then the `<meta>` tags reflect multi-file context: title shows transfer title or "N files", description shows combined size.

---

## 4. Adversarial Review & Self-Correction Log

| # | Category | Issue Found | Remediation |
|---|----------|-------------|-------------|
| 1 | **Free-Tier / Compute** | "Download All (.zip)" implies server-side zip generation which would OOM Cloud Run at 512Mi with up to 250MB of files. Even client-side JSZip/fflate would require buffering all file bytes in browser memory (up to 250MB), crashing mobile tabs. | "Download All" triggers **sequential individual downloads** via staggered signed URL redirects (one `<a download>` click per file with 500ms delay). Server never touches file bytes. Client-side zip deferred to FRH-80.1 with streaming fflate evaluation. |
| 2 | **Signed URL Fan-out** | Generating 5 signed URLs simultaneously on every page load would add latency and unnecessary GCS IAM calls even for recipients who never preview. Current single-file preview is lazy-loaded on click. | **Lazy signing**: Grid thumbnails for images use the existing `/:shareHash/preview` endpoint with a new `?fileIndex=N` query param, fetched only when the grid item enters viewport (Intersection Observer) or on lightbox open. Download URLs generated only on click. No bulk pre-signing at page load. |
| 3 | **Backward Compatibility** | The current `TransferDownloadView` renders a single-file metadata card using root `transfer.filename`, `transfer.filesize`, `transfer.mimeType`. Replacing this with a grid for all transfers would break the polished single-file UX for existing links. | Branch rendering on `transfer.files?.length > 1`: multi-file transfers get the grid + batch header; single-file transfers (or `files.length === 1`) retain the existing single-file presentation card **unchanged**. |
| 4 | **Download Endpoint Per-File** | The existing `/:shareHash/download` endpoint uses root `transfer.storagePath` and `transfer.filename` — it has no concept of individual files within the `files` array. Adding a per-file variant is required without breaking the existing endpoint. | Add a **new** endpoint `/:shareHash/download/:fileIndex` that looks up `transfer.files[fileIndex]` and generates a signed URL for that specific file's `storagePath`. The existing `/:shareHash/download` endpoint remains untouched and continues to serve the primary/first file for backward compatibility. |
| 5 | **Preview Endpoint Multi-File** | The existing `/:shareHash/preview` endpoint evaluates eligibility and signs a URL for the root `transfer.filename`/`transfer.storagePath`. It cannot serve previews for individual files within the `files` array. | Extend the existing preview endpoint to accept an optional `?fileIndex=N` query parameter. When present, it reads `transfer.files[N]` instead of root fields. When absent, it falls back to root fields (backward-compatible). Validate `fileIndex` is within `0..files.length-1` bounds. |
| 6 | **Mobile UX / Sequential Downloads** | Some mobile browsers (iOS Safari) block programmatic download triggers that aren't initiated by direct user gestures. Firing 5 `<a>.click()` calls in a staggered loop may be blocked after the first. | "Download All" on mobile falls back to a **toast notification** listing individual download buttons if the browser blocks sequential triggers. Feature-detect via `navigator.userAgent` heuristic or catch blocked download errors and degrade gracefully. |
| 7 | **Password Token Scope** | The existing HMAC `authToken` is scoped to `shareHash` + `passwordVersion` — it does not encode file-level scope. Per-file download and preview endpoints must accept the same token. | Both new per-file endpoints (`/:shareHash/download/:fileIndex`, `/:shareHash/preview?fileIndex=N`) reuse the existing `extractBearerToken` + `verifyTransferToken` pattern keyed on `shareHash`. Token scope is already transfer-level, so per-file access is implicitly authorized when the transfer is unlocked. No token changes needed. |

---

## 5. Phased Implementation Plan

### Phase 1: API Layer — Per-File Download & Preview Endpoints
- **Target Files:**
  - `src/collections/Transfers/endpoints.ts`
  - `src/components/Transfers/Preview/types.ts`
- **Agent Tasks:**
  1. Add endpoint `GET /:shareHash/download/:fileIndex`:
     - Validate `fileIndex` is a non-negative integer within `transfer.files` bounds.
     - Look up `transfer.files[fileIndex]` for `storagePath`, `filename`, `mimeType`.
     - Reuse existing password enforcement pattern (`extractBearerToken` + `verifyTransferToken`).
     - Reuse existing RFC 5987 content-disposition encoding.
     - Generate v4 signed GCS GET URL (15-min TTL) and return `302 Found` redirect. Local mode: stream from filesystem.
     - Fire-and-forget atomic `downloadCount` increment (reuse existing SQL pattern).
  2. Extend `GET /:shareHash/preview` to accept optional `?fileIndex=N` query parameter:
     - When `fileIndex` is present and valid, evaluate eligibility and sign URL for `transfer.files[fileIndex]` instead of root fields.
     - When absent, current behavior is preserved (root field lookup).
     - Validate `fileIndex` bounds, return 400 for out-of-range.
  3. Extend `TransferPreviewResponse` type with optional `fileIndex` field for client-side tracking.
- **Manual Infrastructure / Setup Steps:** None
- **Verification Steps:**
  1. `curl -I http://localhost:3000/api/transfers/{shareHash}/download/0` — confirm 302 redirect or 200 local stream for the first file.
  2. `curl -I http://localhost:3000/api/transfers/{shareHash}/download/1` — confirm second file downloads correctly.
  3. `curl http://localhost:3000/api/transfers/{shareHash}/download/99` — confirm 400 out-of-bounds error.
  4. `curl http://localhost:3000/api/transfers/{shareHash}/preview?fileIndex=1` — confirm preview response for second file.
  5. `curl http://localhost:3000/api/transfers/{shareHash}/preview` — confirm existing single-file preview behavior unchanged.
  6. Confirm password-protected transfer requires `Authorization: Bearer` for per-file endpoints.

### Phase 2: UI — Multi-File Grid, Batch Header & Per-File Downloads
- **Target Files:**
  - `src/components/Transfers/TransferDownloadView.tsx`
  - `src/app/(app)/transfer/[shareHash]/page.tsx`
- **Agent Tasks:**
  1. **Batch detection**: Branch on `transfer.files?.length > 1` to conditionally render multi-file grid vs single-file card.
  2. **Batch summary header**: Replace the single-file metadata stage with a batch header showing:
     - File count badge: `{N} files` in Rubik Mono One.
     - Combined size: Sum of `transfer.files[].filesize` via `formatBytes`.
     - Expiration countdown (reuse existing `formatCountdown`).
  3. **File grid**: Responsive CSS grid (`grid-cols-1 sm:grid-cols-2` for 2–3 files, `sm:grid-cols-2 lg:grid-cols-3` for 4–5 files). Each cell renders:
     - For visual-previewable mimeTypes (`image/jpeg`, `image/png`, `image/webp`): Lazy-load a thumbnail via `/:shareHash/preview?fileIndex=N` when grid cell enters viewport (Intersection Observer or scroll-triggered fetch).
     - For non-visual assets: `TransferFallbackCard` (reuse existing component) with filename, size, format badge.
     - Per-file download icon button (lucide `Download`) that calls `/:shareHash/download/:fileIndex`.
  4. **"Download All" button**: Primary gallery CTA. On click:
     - Iterate `transfer.files`, triggering download for each via a hidden `<a download>` element with staggered 500ms delays.
     - Show progress toast ("Downloading 2 of 5…").
     - On mobile failure detection, degrade to listing individual download links in a toast.
  5. **Per-file download handler** (`handlePerFileDownload(fileIndex)`):
     - Unprotected: create `<a href="/api/transfers/{shareHash}/download/{fileIndex}" download>` and click.
     - Password-protected: fetch via `Authorization: Bearer {authToken}`, consume blob, trigger download via `createObjectURL`.
  6. **RSC metadata update** in `page.tsx`:
     - When `transfer.files?.length > 1`: set OG title to `{transfer.title || 'N files'} | Framehouse Hub Transfer`, description to `Download {N} files ({totalSize}) securely via Framehouse Hub.`
- **Manual Infrastructure / Setup Steps:** None
- **Verification Steps:**
  1. Create a multi-file transfer via the workbench (3 files). Navigate to the share link in incognito. Confirm grid renders all 3 files.
  2. Confirm visual assets show thumbnail previews (lazy-loaded on scroll/viewport entry).
  3. Confirm non-visual assets (e.g., `.zip`, `.pdf`) show fallback card with correct icon, name, size.
  4. Click per-file download on individual files. Confirm correct file downloads without page navigation.
  5. Click "Download All". Confirm all files download sequentially.
  6. Create a single-file transfer. Confirm the existing single-file card renders unchanged (no grid).
  7. Verify mobile viewport (< 640px): grid stacks to single column, touch targets ≥ 44px.
  8. `IS_BUILD_PHASE=true pnpm build` passes.

### Phase 3: UI — On-Demand Mobile-Friendly Inline Accordion Preview & Bandwidth Protection
- **Target Files:**
  - `src/components/Transfers/TransferDownloadView.tsx`
  - `src/components/Transfers/Preview/types.ts`
  - `src/components/Transfers/Preview/TransferImagePreview.tsx`
- **Agent Tasks:**
  1. **Bandwidth & GPU Memory Protection**:
     - Lower `IMAGE_MAX_BYTES` threshold from 10MB to 4MB (`4 * 1024 * 1024`) in `src/components/Transfers/Preview/types.ts`.
     - In `TransferImagePreview.tsx`, add `decoding="async"` and `fetchPriority="low"` to the `<img>` element.
     - Files exceeding 4MB cleanly display `TransferFallbackCard` advising the user to download the original asset directly.
  2. **Mobile-Friendly Inline Accordion Drawer** (in `TransferDownloadView.tsx`):
     - Replace disruptive full-screen lightbox modal with an on-demand inline expandable preview drawer inside `TransferGridCell`.
     - Maintains natural mobile document flow without viewport locking, pinch-to-zoom traps, or scroll position loss.
     - Preview options/renders only activate when the user explicitly clicks the "Preview" button on a file card (`Eye`/`EyeOff` toggle), preventing eager signed URL fetches and multi-file network buffering on page load.
     - Enforce single active preview (`expandedIndex: number | null`) to prevent simultaneous multi-asset media buffer streaming.
  3. **Lazy Preview Fetching & Cache**:
     - Maintain `previewCache` dictionary (`Record<number, TransferPreviewResponse>`) per file index.
     - Fetch preview metadata/stream lazily upon user expansion.
     - Provide quick direct download action within both the grid cell and the fallback card.
  4. **Single-file consistency**:
     - The single-file transfer card retains its standard inline toggle preview (`Eye`/`EyeOff`).
- **Manual Infrastructure / Setup Steps:** None
- **Verification Steps:**
  1. Click "Preview" on a visual file card ≤ 4MB in the grid. Confirm inline accordion expands and renders media preview.
  2. Click "Preview" on an image > 4MB. Confirm it renders `TransferFallbackCard` indicating size exceeds 4MB preview ceiling and prompts direct download.
  3. Expand a different file card. Confirm the previous card collapses so only one media preview buffers at a time.
  4. Click "Hide" (or click the toggle again). Confirm the accordion collapses.
  5. Test on mobile viewports (< 640px). Confirm seamless inline expansion with no modal popups or viewport locking.
  6. Confirm single-file transfers continue using their standard inline preview without regression.
  7. Run `pnpm eslint` and `pnpm tsc --noEmit` — zero regressions.
  8. `IS_BUILD_PHASE=true pnpm build` passes.

---

## 6. Rollback Plan

- **Code Revert:** `git revert <FRH-80-commit-sha>` — all changes are UI and endpoint-only; no schema or migration changes to roll back.
- **Endpoint Safety:** The new `/:shareHash/download/:fileIndex` endpoint is additive; removing it has no downstream impact. The `?fileIndex` query param on `/:shareHash/preview` is optional and falls back cleanly.
- **No Data Impact:** Zero database migrations, zero storage path changes, zero schema modifications. Rollback is a clean code revert with no data cleanup required.

