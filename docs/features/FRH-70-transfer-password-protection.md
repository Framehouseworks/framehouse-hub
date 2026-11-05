# Specification: FRH-70 — Transfer Password Protection

> **IMPLEMENTATION STATUS:** SPECCED — NOT STARTED

**Spec Version:** 1.0
**Branch Convention:** `FRH-70-transfer-password-protection`
**Base Branch:** `dev`
**Date:** 2026-11-03

---

## 1. Core Objective & Scope

- **Objective:** Add an optional password-authentication layer to transfer links. Senders toggle a password in the upload card; recipients must authenticate before metadata or download URLs are exposed. Designed for zero-cost-at-rest: no DB reads, no signed URLs, no preview API calls occur until the password check passes.
- **Ticket Reference:** FRH-70
- **In-Scope Files/Modules:**

| Layer | Files |
|-------|-------|
| Schema | `src/collections/Transfers/index.ts` |
| Schema (audit) | `src/collections/AdminActivityLogs/index.ts` |
| Constants | `src/collections/Transfers/constants.ts` |
| Hooks | `src/collections/Transfers/hooks/hashTransferPassword.ts` *(new)* |
| Endpoints | `src/collections/Transfers/endpoints.ts` |
| Migration | `src/migrations/YYYYMMDD_add_transfer_password_fields.ts` *(generated)* |
| Upload lib | `src/lib/transfer-upload.ts` |
| Recipient page (SSR) | `src/app/(app)/transfer/[shareHash]/page.tsx` |
| Recipient UI | `src/components/Transfers/TransferDownloadView.tsx` |
| Sender UI | `src/components/Transfers/TransferWorkbench.tsx` |
| Dashboard page | `src/app/(dashboard)/dashboard/transfers/page.tsx` |

- **Explicit Non-Goals:**
  - Multi-file / zip bundle transfers (separate ticket).
  - Email-based OTP or 2FA — password only.
  - Recipient accounts or login — this is a stateless password gate.
  - Password-protecting portfolios (different collection, different feature).
  - Changes to TransferWallpapers, GoWorker, or GCS lifecycle rules.

---

## 2. Platform & Free-Tier Impact Check

| Area | Impact | Details |
|------|--------|---------|
| **Payload Schema** | Yes | Add `passwordHash`, `passwordSalt`, `passwordEnabled`, `passwordVersion` fields to `Transfers` collection. Add `transfer_password_set` / `transfer_password_cleared` action types to `AdminActivityLogs` |
| **Route Groups** | No | No new route groups; `(app)/transfer/[shareHash]` already exists |
| **Migrations** | Yes | New migration for 4 columns. No index additions (queried by `shareHash` which is already indexed+unique) |
| **Worker / GCP** | No | No changes to Go worker, Eventarc, Cloud Run, or GCS lifecycle |
| **Access Control** | No | Existing `transfersAccess` is sufficient — password gate runs inside custom endpoints, not Payload access layer |
| **Storage Paths** | No | No new storage paths; `buildStoragePath` not involved |
| **Free-Tier Risk** | Low | `scrypt` is ~10ms/call on 1-CPU Cloud Run. Rate limiting (5 attempts) caps worst-case to 50ms burst. No new GCS operations. No new DB indexes |

---

## 3. User Flows & Acceptance Criteria

### Sender Flow (Dashboard)
- [ ] **AC-1:** GIVEN a sender has staged a file in TransferWorkbench, WHEN they toggle the "Password protect" switch, THEN a password input field appears beneath the toggle. The password must be ≥6 characters. The toggle and password are optional — default is OFF (unprotected).
- [ ] **AC-2:** GIVEN a sender has an active transfer in the "Recent Transfers" ledger, WHEN they click "Edit password" on that row, THEN they can set, change, or remove the password via a PATCH to the Payload REST API. Changing the password increments `passwordVersion`, which invalidates all prior auth tokens.

### Recipient Flow (Public Page)
- [ ] **AC-3:** GIVEN a sender has password-protected a transfer, WHEN a recipient navigates to `/transfer/{shareHash}`, THEN they see a generic branded password gate screen. The screen MUST NOT reveal: filename, filesize, sender name, message, expiration, mime type, or any metadata. The wallpaper canvas and Framehouse branding are shown.
- [ ] **AC-4:** GIVEN a recipient submits the correct password, WHEN the `/:shareHash/verify-password` endpoint validates it, THEN the API returns a short-lived HMAC token (15-min TTL). The client stores this token in component state (not localStorage) and uses it to fetch metadata, preview, and download endpoints.
- [ ] **AC-5:** GIVEN 5 consecutive incorrect password attempts from a single client (tracked via IP-scoped in-memory counter), WHEN a 6th attempt arrives, THEN the API returns HTTP 429 with a `Retry-After: 300` header (5-minute cooldown).
- [ ] **AC-6:** GIVEN a recipient has a valid auth token for a password-protected transfer, WHEN the sender changes or removes the password (incrementing `passwordVersion`), THEN the download/preview endpoints reject the old token (version mismatch), forcing re-authentication.

### Non-Password Transfers (No Regression)
- [ ] **AC-7:** GIVEN a transfer has `passwordEnabled: false` (or null), WHEN a recipient visits the link, THEN the existing flow is unchanged — full metadata exposed, immediate download available, no auth gate.

### Admin Platform (Payload Admin Panel)
- [ ] **AC-8:** GIVEN an admin views the Transfers list in the Payload admin panel (`/admin/collections/transfers`), WHEN scanning the list, THEN a `passwordEnabled` column is visible in the default columns showing a checkbox indicator, enabling admins to identify password-protected transfers at a glance.
- [ ] **AC-9:** GIVEN an admin opens a specific Transfer document in the Payload admin panel, WHEN viewing the sidebar, THEN they see `passwordEnabled` (checkbox, editable), `passwordVersion` (read-only number), and the `status` field. The `passwordHash` and `passwordSalt` fields are completely hidden from the admin UI (security-sensitive). Admins can toggle `passwordEnabled` off to remove protection, or set a new password via the `_password` virtual field.
- [ ] **AC-10:** GIVEN an admin modifies a transfer's password settings in the Payload admin panel (set, change, or clear), WHEN the change is saved, THEN the system logs the action to `AdminActivityLogs` with action type `transfer_password_set` or `transfer_password_cleared`, recording the admin user, target transfer ID, and timestamp.
- [ ] **AC-11:** GIVEN a sender views the "Recent Transfers" ledger in the dashboard, WHEN a transfer has `passwordEnabled: true`, THEN a `Lock` icon badge is displayed inline on that transfer row next to the status pill, providing visual confirmation that the link is password-protected.

---

## 4. Adversarial Review & Self-Correction Log

| # | Category | Issue Found | Remediation |
|---|----------|-------------|-------------|
| 1 | **Free-Tier / CPU** | `bcrypt` is intentionally slow (~250ms/hash on 1-CPU Cloud Run) — five concurrent brute-force requests could saturate the CPU budget | Use Node.js built-in `crypto.scrypt` instead (tunable `cost` param, ~10ms at `N=16384`). Combined with the 5-attempt rate limit, worst-case CPU per IP is ~50ms per 5-minute window |
| 2 | **Metadata Leak in SSR** | Current `page.tsx` fetches transfer metadata in `generateMetadata()` — even with a client-side gate, SSR would bake filenames into `<title>` and OG tags for password-protected transfers | Add early `passwordEnabled` check in `generateMetadata()` and the page component. If `passwordEnabled === true`, return generic metadata and render only the password gate component. Zero metadata fields sent to client until token is present |
| 3 | **Token Replay / Hotlink** | If the HMAC auth token were stored in localStorage or a cookie, a recipient could share the token URL to bypass the password | Token lives only in React component state (memory). Page refresh = re-auth required. Token is HMAC(`shareHash:passwordVersion:expiry`, `PAYLOAD_SECRET`) — bound to the specific transfer and password version. 15-min TTL prevents long-lived replay |
| 4 | **Rate-Limit Memory Leak** | In-memory rate-limit map keyed by IP could grow unbounded if the server never restarts | Use a `Map<string, { count, resetAt }>` with lazy eviction: on each request, skip and delete entries where `Date.now() > resetAt`. Cloud Run instances restart frequently (min-instances=0), which also clears the map naturally. No external state store needed |
| 5 | **Migration Rollback Risk** | Adding non-nullable columns would break existing rows | All 4 new fields are nullable with sensible defaults: `passwordEnabled` defaults to `false`, `passwordHash`/`passwordSalt`/`passwordVersion` default to `null`/`null`/`0`. Migration is additive-only (no data backfill needed), making rollback a simple column drop |

---

## 5. Phased Implementation Plan

### Phase 1: Database / Schema Layer

- **Target Files:** `src/collections/Transfers/index.ts`, `src/collections/Transfers/constants.ts`, `src/collections/Transfers/hooks/hashTransferPassword.ts` *(new)*, `src/collections/AdminActivityLogs/index.ts`, `src/migrations/...`
- **Agent Tasks:**
  1. Add 4 fields to `Transfers` collection:
     - `passwordEnabled` — `checkbox`, default `false`, sidebar
     - `passwordHash` — `text`, hidden from admin (`admin.hidden: true`), field-level `access.read: adminOnly`
     - `passwordSalt` — `text`, hidden from admin (`admin.hidden: true`), field-level `access.read: adminOnly`
     - `passwordVersion` — `number`, default `0`, admin readOnly, sidebar
  2. Add `passwordEnabled` to Transfers `defaultColumns` array (after `status`):
     ```
     defaultColumns: ['filename', 'shareHash', 'sender', 'filesize', 'downloadCount', 'status', 'passwordEnabled', 'expiresAt']
     ```
  3. Create `hashTransferPassword` `beforeChange` hook:
     - If `passwordEnabled` toggled OFF → clear `passwordHash`, `passwordSalt`, increment `passwordVersion`
     - If a plaintext `_password` virtual field is present → generate random 16-byte salt, hash with `crypto.scrypt` (N=16384, r=8, p=1, keyLen=64), store hex-encoded `passwordHash` and `passwordSalt`, increment `passwordVersion`, delete `_password` from data
     - Reuse `crypto` (Node built-in) — no new dependencies
  3. Add `_password` virtual/transient field (type `text`, `admin.hidden: true`, not persisted — used only as input carrier for the hook)
  4. Add `PASSWORD_MIN_LENGTH = 6` and `PASSWORD_TOKEN_TTL_MS = 15 * 60 * 1000` to constants
  5. Add two new `actionType` options to `AdminActivityLogs` collection:
     - `{ label: 'Transfer Password Set', value: 'transfer_password_set' }`
     - `{ label: 'Transfer Password Cleared', value: 'transfer_password_cleared' }`
  6. Add admin audit logging to the `hashTransferPassword` hook: when the acting user is an admin (via `checkRole(['admin'], req.user)`) and the password state changes, create an `AdminActivityLog` entry with the appropriate action type, the admin user, and transfer ID in `metadata`
  7. Run `pnpm payload migrate:create` to generate migration
  8. Run `pnpm generate:types` to update `payload-types.ts`
- **Manual Infrastructure / Setup Steps:** None
- **Verification Steps:**
  1. Run `pnpm payload migrate:create` and `pnpm generate:types`.
  2. Run `scripts/verify-local.sh` to confirm zero schema drift.
  3. Confirm `IS_BUILD_PHASE=true pnpm build` passes.

### Phase 2: API & Service Layer

- **Target Files:** `src/collections/Transfers/endpoints.ts`, `src/collections/Transfers/constants.ts`
- **Agent Tasks:**
  1. Add `/:shareHash/verify-password` POST endpoint:
     - Accepts `{ password: string }`
     - Looks up transfer by `shareHash` (overrideAccess), verifies `passwordEnabled && status === 'active' && !expired`
     - Rate-limit: in-memory `Map<string, { count, resetAt }>` keyed by `req.headers.get('x-forwarded-for') || 'unknown'`. 5 attempts per 5-minute window. Return 429 + `Retry-After: 300` on exceed
     - Hash submitted password with stored `passwordSalt` using same `scrypt` params
     - On match: mint HMAC token = `crypto.createHmac('sha256', process.env.PAYLOAD_SECRET).update(shareHash + ':' + passwordVersion + ':' + expiry).digest('hex')` where `expiry = Date.now() + PASSWORD_TOKEN_TTL_MS`. Return `{ token, expiresAt }`
     - On mismatch: return 401
  2. Create `verifyTransferToken(shareHash, token, passwordVersion)` utility in endpoints file:
     - Parse token, check expiry, recompute HMAC, compare. Return boolean
  3. Guard existing `/:shareHash/download` endpoint:
     - After fetching transfer, if `transfer.passwordEnabled`: require `Authorization: Bearer <token>` header → call `verifyTransferToken`. 401 if invalid/expired/version-mismatch
     - If `!transfer.passwordEnabled`: unchanged (no auth required)
  4. Guard existing `/:shareHash/preview` endpoint with same token check
  5. Guard existing `/:shareHash/preview-stream` endpoint with same token check
- **Manual Infrastructure / Setup Steps:** None
- **Verification Steps:**
  1. Unit test: create transfer with password, verify-password returns token, download with token succeeds, download without token returns 401.
  2. Unit test: 6 wrong passwords → 429.
  3. Unit test: change password → old token rejected.
  4. Unit test: transfer without password → download works as before (regression).
  5. `IS_BUILD_PHASE=true pnpm build` passes.

### Phase 3: UI & Frontend Integration Layer

- **Target Files:** `src/components/Transfers/TransferWorkbench.tsx`, `src/components/Transfers/TransferDownloadView.tsx`, `src/app/(app)/transfer/[shareHash]/page.tsx`, `src/app/(dashboard)/dashboard/transfers/page.tsx`, `src/lib/transfer-upload.ts`
- **Agent Tasks:**

  **3a. Sender — TransferWorkbench (STAGED state)**
  1. Add password toggle + input below the "Note for Recipient" field:
     - Switch component with `Lock` icon from lucide-react
     - Conditional password `Input` field (type=password) with ≥6 char validation
     - Rubik Mono One label: "PASSWORD PROTECT"
  2. Update `uploadTransfer()` in `transfer-upload.ts`:
     - Accept optional `password?: string` in `TransferUploadOptions`
     - Pass `_password` field in the Payload REST POST body (step 4 of upload flow)
     - Pass `passwordEnabled: true` when password is provided
  3. Add "Edit Password" action button in the Recent Transfers ledger rows:
     - Opens inline password edit UI (toggle + input)
     - PATCH to `/api/transfers/{id}` with `{ passwordEnabled, _password }` or `{ passwordEnabled: false }` to remove
     - Uses existing `credentials: 'include'` pattern
  4. Add `Lock` icon badge on transfer rows where `passwordEnabled === true`:
     - Inline next to the status pill in the metadata line
     - Rubik Mono One `text-[9px]` chip: `🔒 LOCKED` in gallery-gold tonal style (matching existing countdown pill pattern)
     - When transfer is inactive (expired/revoked), the badge is still visible but at reduced opacity

  **3b. Recipient — page.tsx SSR**
  1. In `generateMetadata()`: if `transfer.passwordEnabled`, return generic title "Secure Transfer | Framehouse Hub" with no filename/size in description or OG tags
  2. In page component: if `transfer.passwordEnabled`, pass `passwordProtected: true` prop to `TransferDownloadView` — do NOT pass `transfer` object (prevents metadata leak in SSR HTML)

  **3c. Recipient — TransferDownloadView**
  1. Add `passwordProtected?: boolean` and `shareHash?: string` props
  2. New `'password_gate'` state: renders branded password entry screen:
     - Wallpaper canvas background (same as expired/revoked states)
     - Framehouse Logo + "Hub Archive" branding
     - `Lock` icon in gallery-gold circle
     - Rubik Mono One badge: "PASSWORD PROTECTED"
     - Masked password `Input` (type=password) with Geist font
     - "Unlock Transfer" `Button` (variant=gallery)
     - Error message area for wrong password / rate limited
     - Footer: "Protected by Framehouse Hub Transfer"
  3. On successful `/verify-password` call: store `{ token, expiresAt }` in React state, fetch transfer metadata via Payload REST API with `?where[shareHash][equals]=...` and `Authorization: Bearer <token>`, transition to existing `'active'` view
  4. Attach `Authorization: Bearer <token>` header to download link click (requires switching from `<a href>` to `fetch` + blob download for password-protected transfers), preview fetch, and preview-stream fetch
  5. If token expires (15 min) during an active session, show re-auth prompt

- **Manual Infrastructure / Setup Steps:** None
- **Verification Steps:**
  1. Manual test: upload with password → recipient sees password gate → correct password → download works.
  2. Manual test: upload without password → recipient sees existing flow (regression).
  3. Manual test: wrong password 5× → 429 → wait 5 min → works again.
  4. Manual test: sender changes password → recipient's existing session invalidated.
  5. Manual test: view-source on password gate page → no metadata in SSR HTML.
  6. Manual test: Payload admin panel → Transfers list shows `passwordEnabled` column → admin can toggle password off → `AdminActivityLogs` entry created.
  7. Manual test: sender dashboard → lock badge visible on password-protected rows → not visible on unprotected rows.
  8. `scripts/verify-local.sh` passes.
  9. `IS_BUILD_PHASE=true pnpm build` passes.

---

## 6. Rollback Plan

- **Schema rollback:** Migration is additive (4 nullable columns). Rollback migration drops `password_hash`, `password_salt`, `password_enabled`, `password_version` columns. No data loss — existing transfers unaffected.
- **Code rollback:** Revert branch. All endpoint guards check `transfer.passwordEnabled` — if the field doesn't exist (column dropped), the guard evaluates as falsy and the unprotected flow runs. Zero regression risk.
- **No infrastructure rollback needed** — no GCS rules, no Cloud Run config, no new services.

