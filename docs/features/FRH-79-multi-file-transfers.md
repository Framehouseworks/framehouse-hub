# Specification: FRH-79 Multi-File Link Transfers

> **IMPLEMENTATION STATUS:** PARTIALLY IMPLEMENTED (Phases 1 & 2 Complete)
>
> **Spec Version:** 1.1 (Updated with Android & iOS Mobile Architecture)  
> **Branch Convention:** `FRH-79-Multi-File-Transfers`  
> **Base Branch:** `dev`  
> **Date:** 2026-11-10  

---

## 1. Core Objective & Scope

- **Objective:** Enable visual creatives to stage, validate, and upload up to 5 files (aggregate ≤ 250MB) within a single transfer session across desktop and mobile devices (iOS Safari, Android Chrome). Direct-to-cloud signed URLs stream all files directly from the browser to Google Cloud Storage (or the local filesystem enclave in dev mode) without proxying media bytes through the Next.js process, tracking per-file and aggregate batch progress under "The Curated Gallery" design aesthetic.
- **Ticket Reference:** FRH-79: Multi-File Link Transfer Upload Pipeline
- **In-Scope Files/Modules:**
  - `src/collections/Transfers/index.ts` (Payload schema updates for `files` array field & validation)
  - `src/collections/Transfers/endpoints.ts` (Batch signed-URL generation & local mode handler)
  - `src/collections/Transfers/hooks/cleanupTransferFile.ts` (Multi-file storage purge on record delete)
  - `src/collections/Transfers/hooks/setTransferDefaults.ts` (Derive primary metadata from `files` array for backward compatibility)
  - `src/lib/transfer-upload.ts` (Client batch upload orchestration, XHR progress tracking, Wake Lock management)
  - `src/components/Transfers/TransferWorkbench.tsx` (Multi-file dropzone, responsive itemized list, aggregate progress bar, mobile touch targets)
  - `src/migrations/*` (Payload schema migration for `transfers_files` relation/table)
- **Explicit Non-Goals:**
  - **Server-Side ZIP Bundling:** Do not create or stream dynamic zip files on Cloud Run (strict adherence to 512Mi memory ceiling & zero-compute egress).
  - **Multipart Chunked Resumable Uploads (Tus/XML):** Standard direct PUT signed URLs suffice for the 250MB ceiling.
  - **Recipient Multi-File Overhaul (FRH-80):** Full recipient multi-file selective download UI and inline carousel gallery are isolated to downstream recipient ticket FRH-80. FRH-79 guarantees recipient backward-compatibility (download primary/first file or list without crashing).

---

## 2. Platform & Free-Tier Impact Check

| Area | Impact | Details |
|------|--------|---------|
| **Payload Schema** | Yes | Added `files` array field (`filename`, `filesize`, `mimeType`, `storagePath`) with min 1, max 5 rows. Preserves legacy root fields populated via hook. |
| **Route Groups** | No | Existing routes under `(app)` and `(dashboard)` remain unchanged. |
| **Migrations** | Yes | New Postgres migration generated via `pnpm payload migrate:create` to create `transfers_files` child table. Zero manual SQL. |
| **Worker / GCP** | No | Client streams directly to GCS via v4 signed PUT URLs. Cloud Run memory stays well below 512Mi (`--min-instances=0`, `us-central1`). |
| **Access Control** | No | Reuses existing `transfersAccess` and `checkRole(['creative', 'admin'])`. Viewers cannot initiate uploads. |
| **Storage Paths** | Yes | Multi-file paths follow canonical convention: `transfers/{userId}/{shareHash}/original/{index}-{slugifiedFilename}` to eliminate duplicate filename collisions. |
| **Free-Tier Risk** | No | Enforces hard aggregate cap of 250MB across all staged files; adheres to 3-day GCS lifecycle purge. |
| **Mobile Memory / OS Limits** | No | Binary streams stream native `File` objects directly over XHR without buffer caching in DOM memory (prevents mobile tab crashes). |

---

## 3. User Flows & Acceptance Criteria

- [ ] **AC-1 (Multi-File Selection & Drag-and-Drop / Mobile Sheet):** Given an authenticated creative/admin on `/transfers`, When the user selects or drops 1 to 5 files (or invokes iOS Files/Photos / Android Storage Access Framework multi-select), Then the UI stages all valid files, calculates individual and aggregate sizes, and rejects the batch if file count > 5 or total size > 250MB.
- [ ] **AC-2 (Responsive Itemized Staging Ledger):** Given staged files in the workbench, When viewing the stage card on desktop or mobile (<640px), Then each file displays its name, format chip, human-readable size, and an accessible individual removal action (`X`, min 44px tap target).
- [ ] **AC-3 (Direct-to-Cloud Parallel Pre-Signed Streaming & Zero-Memory Buffer):** Given a staged batch, When the user clicks "Get a link", Then client requests signed URLs for each file from `/api/transfers/signed-url` and streams raw file binaries directly to GCS via parallel/concurrency-controlled XHR PUT requests with zero server proxying and zero DOM memory buffer bloat.
- [ ] **AC-4 (Real-Time Aggregate & Itemized Progress with Wake Lock):** Given an ongoing upload, When bytes are transmitted, Then each itemized file displays its dynamic status (`Pending`, `Uploading {pct}%`, `Complete`, `Failed`) with aggregate bytes vs total batch size. On supported mobile browsers, a screen wake lock prevents device sleep during transmission.
- [ ] **AC-5 (Tab Visibility & Backgrounding Backstop):** Given an active transfer on iOS or Android, If the user locks the screen or switches applications causing connection drop, Then the upload fails gracefully with itemized error states and a clean "Retry" action rather than locking or corrupting the session.
- [ ] **AC-6 (Persistence & Resilient Mobile Clipboard Auto-Copy):** Given all files in the batch complete uploading to storage, When the client finalizes the session, Then a single Payload transfer record is created with the full `files` metadata array, transitioning to `READY`. If Safari blocks async clipboard access due to gesture expiration, the UI provides an immediate, prominent manual "Copy Link" fallback without crashing.
- [ ] **AC-7 (Storage Purge Hygiene):** Given an existing multi-file transfer, When the transfer document is deleted, Then `cleanupTransferFile` deletes all constituent storage objects in GCS and purges the directory placeholders.

---

## 4. Adversarial Review & Self-Correction Log

| # | Category | Issue Found | Remediation |
|---|----------|-------------|-------------|
| 1 | Free-Tier / Compute | Proxying multi-file uploads or dynamically generating zip archives in Next.js route handlers causes container OOM on Cloud Run (`--memory=512Mi`). | All files stream directly from the browser to GCS via XHR PUT pre-signed URLs. Next.js never reads file buffers. No server-side zipping. |
| 2 | Storage Paths | Staging multiple files with identical names (e.g. two files named `cover.jpg` from different folders) would overwrite each other in `transfers/{userId}/{shareHash}/original/`. | Suffix storage path with sequential index: `transfers/{userId}/{shareHash}/original/${index}-${slugifiedFilename}` ensuring deterministic uniqueness. |
| 3 | Mobile / OS Interruption | iOS and Android aggressively throttle or terminate background browser sockets if the screen sleeps or tabs are switched mid-upload. | 1. Implement Screen Wake Lock API (`navigator.wakeLock`) during active uploads. 2. Handle socket terminations via `visibilitychange` and XHR error listeners gracefully to present clean per-file retry states. |
| 4 | Mobile / Memory | Reading multiple large files (up to 250MB) into JavaScript memory (`FileReader.readAsArrayBuffer`) causes iOS Safari and mobile Chrome tab crashes. | Stream raw `File` instances directly into `xhr.send(file)`. Browser streams from device disk directly into the network buffer with near-zero JS heap consumption. |
| 5 | UX / Safari Clipboard | Multi-file uploads take longer, which causes `navigator.clipboard.writeText` to fail due to expired user-gesture token in iOS Safari. | Wrap clipboard call in resilient try/catch; if auto-copy fails, gracefully render the `READY` state with a prominent manual "Copy Link" touch target (≥44px) and toast guidance. |
| 6 | Migration / Backward Compatibility | Converting top-level `filename`, `filesize`, `storagePath` to an array without maintaining top-level fields would crash existing recipient views and admin lists. | Retain top-level `filename`, `filesize`, `storagePath`, `mimeType` in schema, auto-populated by `setTransferDefaults` hook from `files[0]` (with aggregate size and file count label). |

---

## 5. Phased Implementation Plan

### Phase 1: Database & Schema Layer
- **Target Files:**
  - `src/collections/Transfers/index.ts`
  - `src/collections/Transfers/hooks/setTransferDefaults.ts`
  - `src/collections/Transfers/hooks/cleanupTransferFile.ts`
  - `src/migrations/*`
- **Agent Tasks:**
  1. Add `files` array field to `Transfers` collection:
     - `filename` (text, required)
     - `filesize` (number, required)
     - `mimeType` (text, required)
     - `storagePath` (text, required)
  2. Add array validation to ensure `files.length >= 1 && files.length <= 5` and `sum(files.filesize) <= 250MB`.
  3. Update `setTransferDefaults` hook to mirror `files[0]` to root `filename`, `storagePath`, `mimeType` and calculate total `filesize`.
  4. Update `cleanupTransferFile` `afterDelete` hook to loop over `doc.files` array and delete every storage object + directory prefix.
- **Verification Steps:**
  1. Run `pnpm payload migrate:create add-transfer-files-array` and `pnpm generate:types`.
  2. Run `scripts/verify-local.sh` to confirm database migration integrity.
  3. Verify `IS_BUILD_PHASE=true pnpm build` passes.

### Phase 2: API & Service Layer
- **Target Files:**
  - `src/collections/Transfers/endpoints.ts`
  - `src/lib/transfer-upload.ts`
- **Agent Tasks:**
  1. Update `POST /api/transfers/signed-url` endpoint to accept `{ files: Array<{ filename: string; filesize: number; mimeType: string }> }`:
     - Validate total batch size ≤ 250MB and file count ≤ 5.
     - Generate a single shared `shareHash`.
     - Generate signed PUT URLs for each file with indexed storage paths.
     - Support local dev mode fallback with indexed paths.
  2. Refactor `src/lib/transfer-upload.ts`:
     - Define `BatchTransferUploadOptions` accepting `files: File[]`.
     - Request batch signed URLs.
     - Manage optional Screen Wake Lock during active batch streaming (`navigator.wakeLock`).
     - Execute zero-buffer direct XHR uploads with concurrent tracking and calculate aggregate progress: `(sum(loaded) / sum(total)) * 100`.
     - Register final Payload transfer record with `files` array.
- **Verification Steps:**
  1. Run unit/integration tests with `pnpm test:int` for transfer endpoints.
  2. Verify 413 error returned when total batch size > 250MB or file count > 5.

### Phase 3: UI & Mobile/Desktop Frontend Layer
- **Target Files:**
  - `src/components/Transfers/TransferWorkbench.tsx`
- **Agent Tasks:**
  1. Update dropzone and file input to support `multiple` file selection, natively dispatching iOS Files/Photos and Android Storage Access Framework sheets.
  2. Build Curated Gallery itemized file list in `STAGED` state:
     - Responsive stacking for screens `<640px`.
     - Minimum 44px touch targets for item removal (`X`) buttons.
     - Individual format badges and file sizes.
  3. Update `UPLOADING` state to display:
     - Aggregate progress bar with total bytes uploaded vs batch size.
     - Itemized list with status tags: `Pending`, `Uploading...`, `Complete`, `Failed`.
     - Graceful socket-drop error handling for backgrounded mobile sessions.
  4. Update `READY` state with resilient clipboard copy:
     - Auto-select share link on mobile tap.
     - Safari-compatible manual "Copy Link" fallback button.
- **Verification Steps:**
  1. Test dragging or selecting 3 files simultaneously in desktop and simulated mobile viewport.
  2. Verify mobile touch targets (≥44px) and single-column card layout.
  3. Verify per-file status changes and aggregate progress updates smoothly.
  4. Confirm generated share link resolves correctly.

---

## 6. Rollback Plan

- **Code Revert:** Revert commit containing FRH-79 changes (`git revert <commit-sha>`).
- **Database Rollback:** Down-migrate via Payload CLI or run rollback migration dropping `transfers_files` child table.
- **Storage Safety:** GCS lifecycle rules automatically purge any multi-file artifacts after 3-4 days. Root single-file properties are preserved, preventing schema corruption.
