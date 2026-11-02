# Specification: FRH-82 — Inline Browser Media Previews for Transfer Deliverables

> **IMPLEMENTATION STATUS:** IMPLEMENTED

**Spec Version:** 1.0  
**Branch Convention:** `FRH-82-inline-media-preview`  
**Base Branch:** `dev`  
**Date:** 2026-11-02  

---

## 1. Core Objective & Scope

### 1.1 Objective
Establish a lightweight, browser-native inline media preview engine for the public transfer recipient view (`/transfer/[shareHash]`). Recipients can preview supported, lightweight web formats (JPEG, PNG, WebP, PDF, MP4, MP3) directly within an expandable presentation card before downloading, verifying deliverable contents without unnecessary file transfers or egress overhead. Unsupported formats (e.g. RAW camera negatives, ZIP archives, design files) and assets exceeding strict free-tier preview size thresholds automatically downgrade to a file detail fallback card. The primary "Download File" action remains persistently visible, accessible, and unobstructed at all times across desktop and mobile devices.

### 1.2 Ticket Reference
`FRH-82` — Transfer Recipient Inline Media Preview (Follow-on to `FRH-67: Link Transfer Generation`, `FRH-68: File Download Expiry & Purge`, and `FRH-83: Curated Background Artwork`).

### 1.3 In-Scope Files/Modules
- **Transfer Endpoints (Backend API):**
  - `src/collections/Transfers/endpoints.ts`: Add `GET /:shareHash/preview` endpoint returning a signed read URL configured specifically with `responseDisposition: inline` and `contentType: transfer.mimeType` (1-hour TTL in cloud mode; local file stream with `inline` disposition in local dev mode). Enforces active status, non-expiration, and preview size threshold verification.
- **Frontend Presentation & Components:**
  - `src/components/Transfers/TransferDownloadView.tsx`: Integrate expandable card state machine (Idle, Preview Loading, Active Preview, Fallback Downgrade), mobile-optimized sticky dual-action header (Download CTA + Preview Toggle), and layout transition.
  - `src/components/Transfers/Preview/TransferMediaPreview.tsx` (new): Component encapsulating media type dispatching:
    - `TransferImagePreview.tsx`: Responsive `<img>` with smooth blur-up/skeleton and error fallback.
    - `TransferVideoPreview.tsx`: HTML5 `<video controls playsInline preload="metadata">`.
    - `TransferAudioPreview.tsx`: Styled HTML5 `<audio controls preload="metadata">` with waveform-inspired ambient card.
    - `TransferDocumentPreview.tsx`: Desktop `<iframe>` / `<object>` sandboxed document viewer with mobile-optimized new-tab fallback.
    - `TransferFallbackCard.tsx`: Structured metadata state for unsupported/oversized formats with descriptive rationale and download CTA.
  - `src/components/Transfers/Preview/types.ts` (new): Type definitions and preview threshold constants.

### 1.4 Explicit Non-Goals
- **Go Processing Worker Modifications:** Strictly out of scope. Ephemeral 3-day transfers do not pass through the archival DAM ingestion worker (`scripts/worker/main.go`), avoiding Cloud Run CPU/memory churn and preserving zero-cost free-tier boundaries.
- **Transcoding / Derivative Generation:** Zero server-side image scaling or video transcoding via Node Sharp or FFmpeg. Only native browser formats within threshold limits are previewed inline.
- **Auto-Loading Media Stream on Mount:** Transfer page load must never auto-fetch media bytes or signed preview URLs. Preview streams are strictly fetched on-demand upon user interaction.
- **Database Schema Changes:** Zero modifications to `src/collections/Transfers/index.ts` or Postgres schema. The existing fields (`mimeType`, `filename`, `filesize`, `storagePath`, `status`, `expiresAt`) provide complete metadata.
- **Multi-File Gallery / Folder Structures:** This MVP is strictly scoped to single-file transfers (matching FRH-67). Multi-file gallery pagination is deferred to future milestones.

---

## 2. Platform & Free-Tier Impact Check

| Area | Impact | Details |
|------|--------|---------|
| **Payload Schema** | **No** | Zero schema modifications. Existing `transfers` fields contain all necessary metadata. |
| **Route Groups** | **No** | Operates strictly within existing `(app)/transfer/[shareHash]` route group. |
| **Migrations** | **No** | `push: false` maintained; no migration needed. |
| **Worker / GCP** | **No** | Go worker untouched. Zero additional Cloud Run compute or Eventarc triggers. |
| **Access Control** | **No** | Reuses existing public transfer lifecycle checks (`status === 'active' && expiresAt > now()`). |
| **Storage Paths** | **No** | Reads from existing `transfers/{userId}/{shareHash}/original/{filename}` path. |
| **Free-Tier Risk** | **Zero** | Egress controlled by on-demand click-to-preview, strict file size caps (10MB image, 15MB PDF, 25MB media), and direct GCS client streaming bypassing Node server memory (512Mi limit preserved). |

---

## 3. User Flows & Acceptance Criteria

### 3.1 Preview Size & Format Threshold Matrix

| Media Type | Allowed MIME Patterns / Extensions | Max Size Threshold | Behavior When Exceeded |
|---|---|---|---|
| **Raster Image** | `image/jpeg`, `image/png`, `image/webp` (`.jpg`, `.jpeg`, `.png`, `.webp`) | **10 MB** | Downgrade to Fallback Card: *"Image exceeds 10MB preview limit. Download directly to view."* |
| **Document** | `application/pdf` (`.pdf`) | **15 MB** | Downgrade to Fallback Card: *"Document exceeds 15MB preview limit. Download directly to view."* |
| **Video** | `video/mp4`, `video/webm` (`.mp4`, `.webm`) | **25 MB** | Downgrade to Fallback Card: *"Video exceeds 25MB preview limit. Download directly to view."* |
| **Audio** | `audio/mpeg`, `audio/wav`, `audio/ogg` (`.mp3`, `.wav`, `.ogg`) | **25 MB** | Downgrade to Fallback Card: *"Audio exceeds 25MB preview limit. Download directly to view."* |
| **Unsupported** | RAW images (`.arw`, `.cr2`, `.dng`), Archives (`.zip`, `.rar`, `.tar`), Project Files (`.psd`, `.ai`, `.prproj`, `.blend`), Executables | Any Size | Render Fallback Card immediately with file details and Direct Download button. |

### 3.2 Acceptance Criteria
- [ ] **AC-1 (Initial Page Load & Egress Protection):** Given an active transfer link, when a recipient loads `/transfer/[shareHash]`, then only transfer metadata is rendered. No media bytes or signed preview URLs are fetched until explicit user action.
- [ ] **AC-2 (Persistent Download Availability):** Given any preview state (collapsed, loading, active, or fallback), the primary "Download File" button remains prominently visible, clickable, and positioned above or sticky beside the preview stage. Recipients never wait for a preview to download.
- [ ] **AC-3 (On-Demand Inline Expansion):** Given a supported file format under the size threshold, when the recipient clicks "Preview File", then the presentation card smoothly expands, fetches a short-lived signed URL via `GET /api/transfers/:shareHash/preview`, displays a brief loading skeleton, and renders the browser-native player/viewer inline.
- [ ] **AC-4 (Unsupported Format Fallback):** Given a file with an unsupported MIME type or extension (e.g., `.zip`, `.dng`, `.psd`), when the recipient views the card, then the "Preview File" action indicates fallback mode, and opening it renders the structured metadata card showing filename, extension badge, formatted byte size, and an informational notice without making storage calls.
- [ ] **AC-5 (Size Threshold Fallback):** Given a supported format that exceeds the threshold (e.g., a 18MB PDF or 45MB MP4), when the recipient attempts to preview, then the system automatically renders the Fallback Card with an explicit message explaining the file exceeds browser preview limits.
- [ ] **AC-6 (Direct Cloud Streaming & Security):** Given an active preview request in cloud mode, when the client fetches the preview, then the server returns a 1-hour signed GCS URL with `responseDisposition: inline`. The browser streams asset bytes directly from GCS without proxying through Node.js memory.
- [ ] **AC-7 (Lifecycle & Expiration Parity):** Given an expired (`expiresAt <= now()`) or revoked transfer, when `GET /api/transfers/:shareHash/preview` is requested, then the endpoint returns `410 Gone`, and the client displays the existing expired/revoked screen.
- [ ] **AC-8 (Mobile Ergonomics & Responsive Behavior):** Given a mobile or touch screen viewport (< 640px), when the card expands, the viewport maintains sticky access to the Download action, images fit `max-h-[50vh]` without layout breakage, and PDF viewing provides a touch-friendly in-tab inspection trigger.
- [ ] **AC-9 (Error Resilience & Expiry Recovery):** Given a signed URL that fails to load or expires mid-session, the component displays an inline retry action ("Reload preview") that fetches a fresh signed URL without full page reload.

---

## 4. Adversarial Review & Self-Correction Log

| # | Category | Issue Found | Remediation |
|---|----------|-------------|-------------|
| 1 | **Storage / Endpoint** | Existing `/:shareHash/download` endpoint injects `responseDisposition: attachment; filename=...`. Reusing this endpoint for an `<iframe>` or `<img>` forces the recipient's browser into an unwanted file download loop rather than rendering inline. | Create a dedicated `GET /:shareHash/preview` collection endpoint in `src/collections/Transfers/endpoints.ts` that explicitly mints signed URLs with `responseDisposition: 'inline'` and `contentType: transfer.mimeType` (or streams with `inline` disposition in local dev mode). |
| 2 | **UI / Mobile Ergonomics** | On small mobile viewports, expanding a 400px+ video or document viewer inline would push the primary "Download File" CTA below the fold, violating the core requirement that users never have to wait or scroll past a preview to fetch their deliverable. | Design the expanded card with a dual-action layout: the "Download File" CTA remains anchored at the top of the action cluster, while the expanded media stage collapses or scrolls cleanly underneath with a sticky mobile bar. |
| 3 | **UI / Browser Compatibility** | Mobile Safari (iOS) and Android Chrome do not support interactive multi-page PDF scrolling inside embedded `<iframe>` or `<object>` tags (iOS renders only page 1 without controls; Android triggers a download dialog). | For PDFs on mobile touch viewports, render an elevated document card with page icon, filename, and a direct "Inspect PDF in New Tab" action opening the inline signed URL in a native tab viewer, while desktop preserves embedded iframe viewing. |
| 4 | **Free-Tier / Egress** | An unauthenticated recipient could reload or hotlink the `GET /:shareHash/preview` endpoint, generating signed URLs for transfers up to 250MB, causing bandwidth egress spikes and high cloud bill shock. | Enforce strict size threshold gates (Max 10MB images, 15MB PDF, 25MB video/audio) before minting signed URLs. Files exceeding limits are rejected at the endpoint level with `{ eligible: false, reason: 'exceeds_threshold' }` and handled on the client. |
| 5 | **Edge Case / Session Expiry** | A recipient opens the preview and leaves the browser tab open past the 1-hour signed URL TTL or past the 72-hour transfer expiration window. Seeking or replaying video causes silent media stalls or GCS 403 Forbidden errors. | Add an error boundary and `onError` handler to media elements: if a media load error occurs, the client queries the preview endpoint to revalidate transfer state. If transfer is still active, it obtains a refreshed signed URL; if expired, it transitions immediately to the Expired Transfer view. |

---

## 5. Phased Implementation Plan

### Phase 1: API & Service Layer (Preview Endpoint & Security)
- **Target Files:**
  - `src/collections/Transfers/endpoints.ts`
  - `src/components/Transfers/Preview/types.ts`
- **Agent Tasks:**
  1. Define preview size thresholds and MIME type validation constants in `src/components/Transfers/Preview/types.ts`.
  2. Implement `GET /:shareHash/preview` endpoint in `src/collections/Transfers/endpoints.ts`:
     - Query transfer by `shareHash` with `status === 'active'` and `expiresAt > now()`. Return `410 Gone` if not found or expired.
     - Validate `mimeType` and `filesize` against preview thresholds. If exceeded or unsupported, return `{ eligible: false, reason: 'unsupported' | 'size_exceeded' }`.
     - In cloud mode (`GCS_BUCKET` present): Mint a 1-hour v4 signed GET URL with `version: 'v4'`, `action: 'read'`, `expires: Date.now() + 3600000`, `responseDisposition: 'inline'`, and `responseType: transfer.mimeType`. Return `{ eligible: true, previewUrl, mimeType, filename, filesize }`.
     - In local dev mode: Stream or return local endpoint URL `/api/transfers/:shareHash/preview-local` with `Content-Disposition: inline`.
- **Manual Infrastructure / Setup Steps:** None.
- **Verification Steps:**
  1. Make `GET /api/transfers/[activeShareHash]/preview` with a valid transfer — verify HTTP 200 and signed URL with `response-content-disposition=inline`.
  2. Make request with expired transfer — verify HTTP 410.
  3. Make request with a file exceeding threshold — verify JSON response indicating size exceeded.

### Phase 2: Preview Stage Components (Media Dispatcher & Fallback)
- **Target Files:**
  - `src/components/Transfers/Preview/TransferMediaPreview.tsx`
  - `src/components/Transfers/Preview/TransferImagePreview.tsx`
  - `src/components/Transfers/Preview/TransferVideoPreview.tsx`
  - `src/components/Transfers/Preview/TransferAudioPreview.tsx`
  - `src/components/Transfers/Preview/TransferDocumentPreview.tsx`
  - `src/components/Transfers/Preview/TransferFallbackCard.tsx`
- **Agent Tasks:**
  1. Build `TransferImagePreview` using responsive HTML `<img>` with smooth opacity transition and error boundary.
  2. Build `TransferVideoPreview` using HTML5 `<video>` with native controls, `playsInline`, and muted initial state option.
  3. Build `TransferAudioPreview` using styled audio player card with file name, duration, and native `<audio>` element.
  4. Build `TransferDocumentPreview` with responsive `<iframe>` for desktop and touch-friendly view button for mobile.
  5. Build `TransferFallbackCard` displaying high-contrast Rubik Mono One metadata chips, file extension badge, explanation for why inline preview is omitted (unsupported format or size ceiling), and direct download emphasis.
  6. Assemble `TransferMediaPreview` orchestrator switching between players with loading skeletons and retry states.
- **Manual Infrastructure / Setup Steps:** None.
- **Verification Steps:**
  1. Unit/component test rendering for each format type (Image, Video, Audio, PDF, Fallback).
  2. Confirm error fallback is triggered when signed URL intentionally invalidates.

### Phase 3: Recipient View Integration & Mobile Ergonomics
- **Target Files:**
  - `src/components/Transfers/TransferDownloadView.tsx`
- **Agent Tasks:**
  1. Update `TransferDownloadView` to include the dual-action controls:
     - Prominent "Download file" primary button.
     - Secondary "Preview file" / "Hide preview" toggle button (with eye icon and Rubik Mono One badge).
  2. Implement expandable container with CSS transition (`grid-template-rows` or smooth height transition) that expands below the file metadata block without causing layout shift.
  3. Ensure mobile sticky header retains the "Download file" CTA visible when the preview is active.
  4. Integrate preview state management: fetch on-demand upon first toggle, cache preview URL in local component state for the session, and handle network errors cleanly.
- **Manual Infrastructure / Setup Steps:** None.
- **Verification Steps:**
  1. Open `/transfer/[shareHash]` on desktop: verify card loads with metadata only; click "Preview file" — verify smooth expansion and inline player rendering.
  2. Click "Download file" — verify download initiates immediately without interrupting the preview.
  3. Open on mobile viewport (< 640px) using Chrome DevTools device mode: verify card expands cleanly without horizontal scroll or blocking the Download button.
  4. Run `pnpm build` with `IS_BUILD_PHASE=true` to confirm clean compilation.
  5. Run `scripts/verify-local.sh` to ensure zero lint or type errors.

---

## 6. Rollback Plan
- **Endpoint Rollback:** Remove `/:shareHash/preview` from `src/collections/Transfers/endpoints.ts`.
- **Frontend Rollback:** Revert `TransferDownloadView.tsx` to commit prior to FRH-82. The view reverts to the simple metadata card + download CTA with zero database migration impact.
- **Database / Schema:** Zero migrations were created, so no database rollback is needed.

