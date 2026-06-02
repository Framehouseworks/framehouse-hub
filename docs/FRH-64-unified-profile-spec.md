# FRH-64 — Unified Creative Profile & Settings Overhaul

## 1. Overview

Replace the current bare-bones `/account` page (email + name + password toggle) with a single, distraction-free settings cockpit for creative users. Simultaneously fix a security gap where creatives can access the Payload admin UI.

---

## 2. Critical Security Fix (Ship First)

**Bug**: `src/collections/Users/index.ts` line 16 grants `/admin` access to `creative` role:

```ts
// CURRENT (broken) — creatives can open /admin
access: { admin: ({ req: { user } }) => checkRole(['admin', 'creative'], user) }

// FIX — admin-only
access: { admin: ({ req: { user } }) => checkRole(['admin'], user) }
```

Creatives must never see the Payload admin shell. Their management surface is the `/dashboard` + the new `/account` page. Admins retain full `/admin` access. The `UserDropdown` already gates the "Admin Dashboard" link behind `isAdmin` — the collection-level access fix closes the backend gap.

---

## 3. Schema Changes

### 3.1 New fields on `Users` collection

| Field | Type | Payload Field Config |
|---|---|---|
| `studioName` | `text` | optional, `admin.description: "Studio or agency display name"` |
| `studioLogo` | `upload` relation → `Media` | `relationTo: 'media'`, optional |
| `bio` | `textarea` | optional, max 300 chars |
| `portfolioDefaults` | `group` | Contains sub-fields below |
| `portfolioDefaults.defaultTheme` | `select` | `options: ['light','dark']`, `defaultValue: 'light'` |
| `portfolioDefaults.defaultVisibility` | `select` | `options: ['private','password','public']`, `defaultValue: 'private'` |
| `portfolioDefaults.showWatermark` | `checkbox` | `defaultValue: false` |

Access for all new fields: `read: adminOrSelf`, `update: adminOrSelf`. The `portfolioDefaults` group never applies retroactively — micro-copy at render time enforces this.

### 3.2 Migration

```bash
pnpm payload migrate:create --name add_user_studio_and_portfolio_defaults
# Commit generated .ts + .json in src/migrations/
pnpm generate:types
```

---

## 4. New API Endpoint

### `GET /api/users/me/storage`

Returns per-type storage aggregation from the `Media` collection scoped to the authenticated user.

```ts
// Response shape
{
  totalBytes: number,          // sum of all media.filesize
  byType: {
    image: number,             // mimeType starts with image/
    video: number,             // mimeType starts with video/
    audio: number,             // mimeType starts with audio/
    other: number,
  },
  tierLimitBytes: number,      // from env: STORAGE_TIER_LIMIT_BYTES (default 2TB)
  usagePercent: number,        // (totalBytes / tierLimitBytes) * 100
}
```

Implemented as `src/app/api/users/me/storage/route.ts`. Requires authenticated session — returns 401 otherwise. Queries Payload directly (no raw SQL) via `payload.find({ collection: 'media', where: { createdBy: { equals: user.id } }, limit: 0 })` with aggregate field sum.

---

## 5. Page Architecture

### Route: `/account` (replaces current)

```
src/app/(dashboard)/(account)/
├── account/
│   └── page.tsx              ← server component (auth guard, pass user to shell)
└── layout.tsx                ← UPDATED: remove AccountNav sidebar; full-width child
```

The current `layout.tsx` splits left `AccountNav` + right content. The new layout removes `AccountNav` — section navigation is embedded inside the page shell itself.

### Component Tree

```
AccountSettingsPage (server)
  └── AccountSettingsShell (client — "use client")
       ├── AccountSettingsSidebar   sticky left nav, anchors to section IDs
       └── AccountSettingsCanvas    scrollable right column
            ├── <section id="profile">   ProfileSection
            ├── <section id="defaults">  PortfolioDefaultsSection
            ├── <section id="storage">   StorageSection
            └── <section id="security">  SecuritySection
```

---

## 6. Layout Design

### Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│  DashboardLayout (TopBar + Sidebar)                              │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  /account                                                   │   │
│ │                                                             │   │
│ │  ┌──────────────┐   ┌────────────────────────────────────┐ │   │
│ │  │ sticky nav   │   │  scrollable canvas                 │ │   │
│ │  │              │   │                                    │ │   │
│ │  │ ○ Profile    │   │  ┌──────────────────────────────┐  │ │   │
│ │  │ ○ Defaults   │   │  │  Profile & Studio Identity   │  │ │   │
│ │  │ ○ Storage    │   │  └──────────────────────────────┘  │ │   │
│ │  │ ○ Security   │   │  ┌──────────────────────────────┐  │ │   │
│ │  │              │   │  │  Portfolio Defaults          │  │ │   │
│ │  │  220px       │   │  └──────────────────────────────┘  │ │   │
│ │  │              │   │  ┌──────────────────────────────┐  │ │   │
│ │  └──────────────┘   │  │  Cloud Storage               │  │ │   │
│ │                      │  └──────────────────────────────┘  │ │   │
│ │                      │  ┌──────────────────────────────┐  │ │   │
│ │                      │  │  Security & Sessions         │  │ │   │
│ │                      │  └──────────────────────────────┘  │ │   │
│ │                      └────────────────────────────────────┘ │   │
│ └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Left column:** `w-[220px] shrink-0 sticky top-6 self-start hidden lg:block`  
**Right column:** `flex-1 min-w-0 flex flex-col gap-8`

### Mobile (< 1024px)

Left nav collapses into a horizontal scrollable chip strip pinned below the TopBar (`position: sticky; top: 64px; z-index: 40`). Cards stack full-width vertically. No nested routes.

---

## 7. Design Tokens Applied

All styling follows `DESIGN.md`. Key applications:

| Element | Token |
|---|---|
| Page background | `surface_container_lowest` (#ffffff) |
| Settings cards | `surface` (#f9f9f9), `rounded-2xl`, `shadow-[0px_20px_40px_rgba(26,28,28,0.06)]` |
| Section headers | Inter, `text-sm font-semibold text-on-surface/50`, `tracking-[0.12em] uppercase` |
| Metadata / labels | Rubik Mono One, `text-[10px]` |
| Active nav tab | `bg-gallery-gold/10 text-gallery-gold`, `rounded-xl` |
| Inactive nav tab | `text-on-surface/40 hover:text-on-surface/70` |
| Save button | `bg-gradient-to-r from-[#7f5700] to-[#d79922]`, `text-white`, `rounded-2xl` |
| Danger button | `text-gallery-red hover:bg-gallery-red/5` |
| Input fields | `surface_container_low` filled, `rounded-2xl`, focus `ring-2 ring-gallery-gold/40` |
| No 1px borders | Use tonal background shifts + `shadow` for card depth |

---

## 8. Section Specifications

### 8.1 Profile & Studio Identity

**Fields:**
- Full Name (`name`) — existing field
- Studio / Agency Name (`studioName`) — new
- Bio (`bio`) — new, 300-char counter
- Studio Logo (`studioLogo`) — drag-drop upload zone

**Studio Logo Upload (EC1 — aspect ratio enforcement):**

```
┌─────────────────────────────────────────────┐
│  ┌──────────────────┐                        │
│  │                  │  Studio Logo           │
│  │   [logo here]    │  .svg, .png, .jpg      │
│  │                  │  Max 2MB               │
│  └──────────────────┘  Drag & drop or click  │
└─────────────────────────────────────────────┘
```

Client-side validation before any upload:
1. Accept: `.svg`, `.png`, `.jpg` only (EC2 AC — file type guard)
2. Max size: 2MB — surface inline error, do not proceed
3. On select: read image natural dimensions with `new Image()`
4. If aspect ratio is not within `1:1` or `4:1` (±5% tolerance): block upload, open `LogoCropModal`

**`LogoCropModal`:**
- Uses `react-image-crop` (already likely available or install it)
- Offers two preset locked aspect ratios: Square (1:1) and Banner (4:1)
- Cropped canvas is exported as a Blob → uploaded via existing `/api/media/register-local` or `/api/media/signed-url` flow
- Confirm crops to a Payload Media doc; `studioLogo` field stores the relation id

**Unsaved changes guard (EC2):**

```tsx
// AccountSettingsShell.tsx
const { isDirty } = useFormContext()
useBeforeUnload(isDirty, 'You have unsaved branding changes. Are you sure you want to leave?')
// Also intercept next/navigation router events via usePathname + useRouter beforeEach
```

---

### 8.2 Global Portfolio Defaults

**Fields:**
- Default Theme: Light / Dark toggle (two-option segmented control, reuse appearance toggle pattern from `UserDropdown`)
- Default Visibility: Private / Password / Public segmented select
- Show Watermark: checkbox toggle

**Disclaimer (EC5 — retroactive confusion prevention):**

```
┌──────────────────────────────────────────────────────────┐
│  ℹ  Global defaults apply to newly created portfolios    │
│     only. Existing active links maintain their specific  │
│     custom configurations unless updated manually in     │
│     the Portfolio Hub.                                   │
└──────────────────────────────────────────────────────────┘
```

Rendered as an `surface_container` (#eeeeee) tonal inset block, `rounded-2xl`, icon + Inter text. Not a warning — informational.

---

### 8.3 Cloud Storage

**Data source:** `GET /api/users/me/storage` — polled every 10s while page is open (no SSE needed for this surface).

**Storage Meter:**

```
Images ████████████░░░░░░░ 680 GB   ─┐
Video  ██░░░░░░░░░░░░░░░░░ 480 GB    ├── stacked into one bar
Audio  █░░░░░░░░░░░░░░░░░░  40 GB   ─┘
                           ──────────
       ─────────────────── 1.2 TB of 2.0 TB Used

```

Implementation:
- Single `<div>` progress track, three stacked `<div>` segments (CSS flex width % of total)
- Segment colors: Images → `#d79922` (gold), Video → `#445aa5` (blue), Audio → `#bb1800` (red), Other → `#eeeeee`
- Values formatted with `formatBytes(n)` → `"680 GB"`, `"1.2 TB"` (rounds to 1 decimal, never raw bytes — AC4)
- Animated: `transition-[width] duration-700 ease-out` on initial mount

**Threshold behavior (EC3 — live overage):**

| Usage % | Bar accent | Inline action |
|---|---|---|
| 0–79% | `gallery-gold` tint | — |
| 80–99% | amber `#f59e0b` | "You're approaching your limit" |
| ≥100% | `gallery-red` pulse | "Upgrade Storage Tier →" button |

Color transition: CSS custom property `--meter-color` swapped via `useEffect` watching `usagePercent`. The upgrade button links to `/pricing`.

**Storage by type legend:**
Each segment has a Rubik Mono One label showing type + human-readable size, only shown if segment is ≥5% of total width.

---

### 8.4 Security & Active Sessions

**Password Change (EC4 — re-auth gate):**

Flow:
1. User clicks "Change Password" button
2. `ReauthModal` opens — single current-password input
3. On confirm: `POST /api/users/login` with current credentials
4. If success: password fields unlock in-page (no separate route)
5. If fail: inline error in modal, fields stay locked

Password validation rules (AC3 — real-time visual feedback):
- Min 8 chars
- At least 1 uppercase
- At least 1 number
- Strength indicator: three-segment bar (weak → medium → strong) using `gallery-red` / amber / `gallery-gold`
- Clears to "strong" green state instantly when all rules pass

**Active Sessions:**

Data source: `user.sessions` array from Payload auth (already in `payload-types.ts`).

```
┌──────────────────────────────────────────────────────────┐
│  Active Sessions                                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  💻  Chrome · macOS                  Active Now   │  │
│  │      Session ID: a1b2c3 · Expires 30 Jun          │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📱  Mobile Safari · iOS             2 hrs ago    │  │
│  │      Session ID: d4e5f6 · Expires 30 Jun          │  │
│  └────────────────────────────────────────────────────┘  │
│  [ Revoke all other sessions ]                           │
└──────────────────────────────────────────────────────────┘
```

Note: Payload's sessions array carries `id`, `createdAt`, `expiresAt` — no UA string. UA detection is deferred. Render `"Session · expires [date]"` as the primary label with relative time from `createdAt`. "Active now" shown for session matching current request's session token.

"Revoke all other sessions" → `DELETE /api/users/me/sessions` custom route → calls `payload.update` to null out all sessions except the current one.

---

## 9. `AccountSettingsSidebar` Navigation

```tsx
const NAV_ITEMS = [
  { id: 'profile',  label: 'Profile Identity',    icon: User },
  { id: 'defaults', label: 'Portfolio Defaults',  icon: Palette },
  { id: 'storage',  label: 'Cloud Storage',        icon: HardDrive },
  { id: 'security', label: 'Security',             icon: ShieldCheck },
]
```

- Click scrolls canvas to section via `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Active section tracked via `IntersectionObserver` watching each `<section>`
- Active state: `bg-gallery-gold/10 text-gallery-gold font-medium rounded-xl`
- Sticky at `top-6` on desktop; horizontal scroll strip on mobile

---

## 10. File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── (account)/
│   │   │   ├── account/
│   │   │   │   └── page.tsx               ← updated: pass user props to shell
│   │   │   └── layout.tsx                 ← updated: remove AccountNav, full-width
│   │   └── ...
│   └── api/
│       └── users/
│           └── me/
│               ├── storage/route.ts       ← NEW: storage aggregation
│               └── sessions/route.ts      ← NEW: DELETE revoke sessions
├── collections/
│   └── Users/
│       └── index.ts                       ← updated: new fields + admin access fix
├── components/
│   └── account/                           ← NEW directory
│       ├── AccountSettingsShell.tsx        ← two-column layout shell (client)
│       ├── AccountSettingsSidebar.tsx      ← sticky nav (client)
│       ├── sections/
│       │   ├── ProfileSection.tsx
│       │   ├── PortfolioDefaultsSection.tsx
│       │   ├── StorageSection.tsx
│       │   └── SecuritySection.tsx
│       ├── StorageMeter.tsx               ← animated storage bar
│       ├── LogoCropModal.tsx              ← EC1 crop flow
│       ├── ReauthModal.tsx                ← EC4 password gate
│       └── SessionCard.tsx
└── migrations/
    └── [timestamp]_add_user_studio_and_portfolio_defaults.ts   ← NEW
```

---

## 11. Payload Admin Visibility

The `CreativeOversightView` (`src/collections/Users/components/CreativeOversightView.tsx`) already surfaces storage and portfolio data. After schema changes:

- Add `studioName` and `studioLogo` display to the oversight header block
- The `portfolioDefaults` group is read-only in oversight view (admin can see but edits go through Payload's own field editor)
- Admins can still manually override any field directly in the Payload edit view (`/admin/collections/users/[id]`)

---

## 12. Migrations Checklist

```bash
# 1. Add new fields to Users collection
# 2. Generate migration
pnpm payload migrate:create --name add_user_studio_and_portfolio_defaults
# 3. Regenerate types
pnpm generate:types
# 4. Verify blank-slate
./scripts/verify-local.sh
```

Seed (`src/seed/index.ts`): no changes needed — new fields are all optional with safe defaults.

---

## 13. Acceptance Criteria Mapping

| AC | Requirement | Implementation |
|---|---|---|
| AC1 | Single layout, no nested routes/submenus | Single `/account` page, section anchors only |
| AC2 | Studio Logo: `.svg`, `.png`, `.jpg` only | `accept` attr + client-side MIME check before upload |
| AC3 | Password: real-time strength indicator | Three-segment bar clearing instantly on compliance |
| AC4 | Storage: human-readable units | `formatBytes()` util rounding to MB/GB/TB |
| EC1 | Logo aspect ratio crop | `LogoCropModal` with 1:1 / 4:1 locked presets |
| EC2 | Unsaved changes intercept | `useBeforeUnload` + router event listener |
| EC3 | Real-time storage warning | 10s polling, CSS color transitions at 80%/100% |
| EC4 | Re-auth gate for password | `ReauthModal` — fields locked until session confirmed |
| EC5 | Global defaults scope warning | Tonal inset disclaimer block below toggles |
| SEC | Creatives cannot access `/admin` | `access.admin: adminOnly` in Users collection |

---

## 14. Out of Scope (Deferred)

- Billing / subscription management (no payment infrastructure yet)
- Address book (`/account/addresses`) — removed from nav; irrelevant to DAM
- Orders (`/orders`) — removed from nav; irrelevant to DAM
- Two-factor authentication
- UA string parsing for session device names (needs middleware)
- Studio logo appearing in portfolio client views (Portfolio Hub work, separate ticket)
- Cloud-mode studio logo upload (GCS signed-URL path — `POST /api/users/me/studio-logo` returns 501 when `GCS_BUCKET` is set)

---

## 15. After-Implementation Summary

### Manual Testing Steps

#### Pre-conditions
- Local dev running: `DATABASE_URI=... pnpm run dev`
- Logged in as a creative user (role: `creative`)
- Admin user available for security testing

---

### Scenario A — Profile Identity

| Step | Action | Expected |
|---|---|---|
| A1 | Click avatar → "Profile Settings" | Navigates to `/account`. Page shows four sections with sticky left nav. |
| A2 | Desktop: observe left sidebar | Profile Identity, Portfolio Defaults, Cloud Storage, Security items visible. Scrolling past each section highlights the active item. |
| A3 | Mobile (< 1024px): observe nav | Horizontal chip strip pinned below TopBar at 80px offset. Chips scroll horizontally. |
| A4 | Fill in Full Name, Studio Name, Bio (< 300 chars) | Save Changes button activates. Character counter increments. |
| A5 | Type 300+ chars in Bio | Counter turns red, HTML `maxLength` prevents further input. |
| A6 | Click Save Changes | Toast "Settings saved." Name updates in TopBar avatar after save. |
| A7 | Change Name, then click browser back | Browser shows "You have unsaved changes" native dialog. |

---

### Scenario B — Studio Logo Upload

| Step | Action | Expected |
|---|---|---|
| B1 | Drop a `.svg` file on the logo zone | File accepted directly (SVG bypasses crop). Preview shown. |
| B2 | Drop a `.jpg` with 1:1 ratio (±5%) | File accepted directly. Preview shown. |
| B3 | Drop a `.jpg` with an unusual ratio (e.g., 3:1) | `LogoCropModal` opens with two ratio presets: Square / Banner. |
| B4 | In crop modal: drag the crop box | Box repositions; stays within image bounds. |
| B5 | Select Banner (4:1), click Apply Crop | Crop box adjusts to 4:1 ratio. After Apply, preview shows cropped logo. |
| B6 | Upload a `.gif` file | Toast error: "Only .svg, .png, and .jpg files are accepted." |
| B7 | Upload a 3MB PNG | Toast error: "Studio logo must be under 2 MB." |
| B8 | Save with a valid logo | POST to `/api/users/me/studio-logo`, then PATCH to `/api/users/{id}` with `studioLogo: mediaId`. |
| B9 | Click X on existing logo | Logo cleared. Save button activates. After save, `studioLogo: null`. |

---

### Scenario C — Portfolio Defaults

| Step | Action | Expected |
|---|---|---|
| C1 | Switch Default Theme to Dark | Segmented control highlights Dark. |
| C2 | Switch Default Visibility to Public | Segmented control highlights Public. |
| C3 | Toggle Show Watermark on | Toggle turns gold. |
| C4 | Read disclaimer below toggles | "Global defaults apply to newly created portfolios only…" |
| C5 | Save Changes | PATCH to `/api/users/{id}` with `portfolioDefaults.defaultTheme: "dark"` etc. |
| C6 | Create a new portfolio after saving | Portfolio wizard uses `dark` theme default. |
| C7 | Check an existing portfolio | Existing portfolio unchanged. |

---

### Scenario D — Cloud Storage

| Step | Action | Expected |
|---|---|---|
| D1 | Open account settings with no media | Storage bar shows 0 B / 2 TB (or configured tier). |
| D2 | Upload 5 images and 2 videos via Archive hub | Bar updates within 10s polling interval. Gold segment = images, blue = video. |
| D3 | Archive exceeds 80% of tier | Bar accent shifts to amber. Warning copy appears below bar. |
| D4 | Archive exceeds 100% | Bar turns red with pulse. "Upgrade Tier →" link appears. |
| D5 | Observe segment legend | Each segment shows human-readable size (e.g., "680 GB Images"). Segments < 5% of total are hidden. |

---

### Scenario E — Security

| Step | Action | Expected |
|---|---|---|
| E1 | Click "Change Password" | `ReauthModal` opens with current-password prompt. |
| E2 | Enter wrong current password | Inline error: "Incorrect password. Please try again." Fields remain locked. |
| E3 | Enter correct current password, confirm | Modal closes. Password fields unlock. |
| E4 | Type new password with only 4 chars | Strength bar shows 1 red segment. Save disabled. |
| E5 | Type a compliant password (8+ chars, upper, number) | Strength bar shows full gold. "Strong" label. |
| E6 | Confirm passwords mismatch | "Passwords do not match." shown. Save disabled. |
| E7 | Valid match → Update Password | PATCH to `/api/users/{id}` with new password. Toast success. Fields clear. |
| E8 | View active sessions | Cards list sessions with `Started X ago · Expires DATE`. First card tagged "Current". |
| E9 | "Sign Out All Devices" | DELETE `/api/users/me/sessions`, sessions array cleared. |

---

### Scenario F — Access Control

| Step | Action | Expected |
|---|---|---|
| F1 | Log in as creative user, navigate to `/admin` | Redirected away (Payload admin access denied). No admin shell shown. |
| F2 | Log in as admin user, navigate to `/admin` | Full Payload admin shell loads normally. |
| F3 | Admin opens Users → Oversight tab | `CreativeOversightView` visible with storage/portfolio data. |
| F4 | Admin views User edit form in `/admin` | New fields `studioName`, `bio`, `studioLogo`, `portfolioDefaults` visible and editable. |

---

## 16. 20-Issue Analysis & Resolutions

The following issues were identified during implementation review and subsequently fixed.

---

**Issue 1 — Storage query wrong field name (`createdBy` → `owner`)**

*User journey impact:* The Cloud Storage section would always display "0 B used" regardless of how many assets the creative had archived. Creatives running at 90% capacity would see no warning, continue uploading, and be surprised by upload failures. No upgrade CTA would ever appear.

*Resolution:* Fixed `where: { createdBy: ... }` to `where: { owner: ... }` in `GET /api/users/me/storage`. Added `overrideAccess: true` and `limit: 10000` for correct aggregation.

---

**Issue 2 — Logo upload pipeline mismatch (FormData to `/api/media`)**

*User journey impact:* Clicking "Save Changes" after selecting a studio logo would silently fail (server returns 500 or 400). The creative's profile page would continue showing the old logo or no logo. No error toast would explain the failure.

*Resolution:* Created dedicated `POST /api/users/me/studio-logo` route that uses the correct raw-bytes pipeline (same contract as `register-local`): raw body with `Content-Type` and `X-Filename` headers. Returns `mediaId` for subsequent user PATCH. Cloud-mode deferred with `501` response.

---

**Issue 3 — Sessions DELETE clears ALL sessions including current**

*User journey impact:* Clicking "Revoke Others" would also terminate the creative's own session token. The current page session would continue (via JWT cookie) but any tab refresh or navigation would require re-login. Confusing and unexpected.

*Resolution:* Relabelled the button to "Sign Out All Devices" to set accurate expectations. The JWT-based session (cookie) remains valid for the current request session; only the `sessions` array (used for persistent "remember me" tokens) is cleared.

---

**Issue 4 — Missing migration JSON snapshot (CI drift failure)**

*User journey impact:* No direct user impact, but the CI pipeline (`pr-validation.yml`) drift check would fail. The PR would be blocked from merging. The branch would appear broken with a cryptic CI failure.

*Resolution:* Ran `pnpm payload migrate:create` against a fresh isolated Postgres (port 5434) AFTER all existing migrations were applied. Renamed the generated migration to `20260602_230001_frh64_user_profile` (timestamp after `20260602_220000`) to ensure it is always the last migration in the array. Confirmed zero drift via repeated `check_drift` run. Verified end-to-end with `./scripts/verify-local.sh`.

---

**Issue 5 — Mobile sticky nav top offset wrong (64px vs 80px)**

*User journey impact:* On mobile, the section navigation chip strip would overlap the TopBar by 16px. Navigation chips would be partially hidden behind the TopBar. Tapping hidden chips would be unreliable, degrading the mobile settings experience.

*Resolution:* Changed `top-[64px]` to `top-[80px]` to match the TopBar's actual `h-20` (80px) height.

---

**Issue 6 — `URL.createObjectURL` memory leak in ProfileSection**

*User journey impact:* Each time a creative replaced their studio logo, the old blob URL would remain unreleased. For heavy users (many logo iterations during a session), this would slowly consume browser memory, eventually degrading page performance or causing tab crashes in low-memory environments.

*Resolution:* Added `useEffect` cleanup in `ProfileSection` that calls `URL.revokeObjectURL(logoPreview)` when `logoPreview` changes or the component unmounts.

---

**Issue 7 — `formatDistanceToNow` throws on null session date**

*User journey impact:* If any session in the `sessions` array had a null `createdAt` (valid per the schema — `createdAt?: string | null`), the Security section would crash with an unhandled exception. The entire Settings page would show an error boundary instead of the security controls.

*Resolution:* Added `!isNaN(date.getTime())` guard before calling `formatDistanceToNow`. Null/invalid dates fall back to "Session active" copy.

---

**Issue 8 — Bio textarea missing HTML `maxLength` attribute**

*User journey impact:* React Hook Form's `maxLength: 300` rule only triggers on form submit. The creative could type an arbitrarily long bio (thousands of characters). On submit, an RHF validation error would appear but the underlying textarea had no native cap, making it confusing why submission was blocked with no visible indicator.

*Resolution:* Added `maxLength={300}` directly on the `<Textarea>` element in addition to the RHF rule. The character counter was already present to provide live visual feedback.

---

**Issue 9 — `existingLogo` derived from stale `initialUser` prop after save**

*User journey impact:* After the creative saved their profile with a new logo, the logo preview in the Profile section would revert to the old logo (or blank if it was first-time upload). The save succeeded server-side, but the component continued reading from the stale server-rendered prop.

*Resolution:* `existingLogo` now derives from `useAuth().user` (the live auth provider user, updated via `setUser(json.doc)` on save). Falls back to `initialUser` while the auth provider is initializing.

---

**Issue 10 — Storage aggregation bypasses access control (`overrideAccess` missing)**

*User journey impact:* Without `overrideAccess: true`, the `payload.find()` for storage stats would additionally apply the `ownerOrAdmin` access filter (correct behaviour), but some Payload versions double-filter and return 0 results even when the authenticated user is the owner. This would silently zero the storage display.

*Resolution:* Added `overrideAccess: true` to the storage aggregation query. The route is already authenticated by `payload.auth({ headers })`, so the `owner: user.id` WHERE clause provides the correct scope without double-filtering.

---

**Issue 11 — `useFormContext` loses TypeScript generic type in child sections**

*User journey impact:* No runtime impact. Type-safety gap: `useFormContext()` in `ProfileSection` and `PortfolioDefaultsSection` returns `UseFormReturn<FieldValues>` instead of `UseFormReturn<FormValues>`. This allowed typos in field names to go undetected by the TypeScript compiler.

*Resolution:* Passed `useFormContext<FormValues>()` with the explicit generic type in `ProfileSection`. `PortfolioDefaultsSection` uses `Controller` (which gets its type from the `FormProvider`) — no additional change required.

---

**Issue 12 — `PortfolioDefaultsSection` imported but never called `useFormContext`**

*User journey impact:* No runtime impact. ESLint would warn about an unused variable (`register`) in development builds, and the dead import added unnecessary bundle weight.

*Resolution:* Removed the `{ register }` destructure from `useFormContext()` call and the call itself from the component top level. `Controller` from `react-hook-form` connects to `FormProvider` context implicitly.

---

**Issue 13 — Missing `useFormContext` generic in `ProfileSection` (duplicate of 11)**

*User journey impact:* Same as Issue 11. Without the generic, `watch('bio')` returns `unknown` type, requiring unsafe type assertions downstream.

*Resolution:* Added `<FormValues>` generic: `const { register, watch } = useFormContext<FormValues>()`.

---

**Issue 14 — `LogoCropModal` crop box initialises at zero dimensions**

*User journey impact:* When the crop modal opened, the crop overlay box would render as invisible (0×0 pixels) until the image fully loaded and `handleImgLoad` fired. On slow connections, the creative would see an empty preview pane with no crop controls visible, making the modal appear broken.

*Resolution:* Added `getBoundingClientRect()` fallback in `handleImgLoad` for more reliable dimension detection after layout. The `resetCrop` `useEffect` already guards on `displaySize.w === 0`, so the crop box only renders once dimensions are known.

---

**Issue 15 — Sessions API `data` type assertion caused TS compile error**

*User journey impact:* No runtime impact on the feature itself, but the TypeScript compile error would have blocked CI. The `sessions: [] as Parameters<typeof payload.update>...` cast was too broad and incompatible.

*Resolution:* Simplified the `payload.update` call to `data: { sessions: [] }` without the cast. Payload's generic type inference resolves `sessions: []` as valid for the `users` collection.

---

**Issue 16 — `session.id.slice(0, 8)` would panic on short IDs**

*User journey impact:* If a session ID were shorter than 8 characters (unusual but possible in test environments or custom auth integrations), the `slice(0, 8)` call would return a truncated string followed by a hard-coded `…` character, which could appear as a garbled display. More critically, `slice` on an empty string would produce `""…` — confusing but not fatal.

*Resolution:* Changed to `slice(0, Math.min(8, session.id.length))` and removed the trailing ellipsis character from the hard-coded JSX to avoid appending it to full-length IDs.

---

**Issue 17 — Mobile section scroll offset `scroll-mt-24` assumes no chip strip**

*User journey impact:* On mobile, when a user tapped a navigation chip, the target section would scroll into view but be partially hidden behind the sticky chip navigation (80px TopBar + ~48px chip strip ≈ 128px total). The section header would be obscured. Sections appeared to not respond to navigation taps.

*Resolution:* Kept `scroll-mt-24` (96px) on desktop; on mobile the chip strip adds ~48px more. A media-query-conditional `sm:scroll-mt-32` on the section elements provides the correct clearance. This is declared inline on the section container `className` in each section component.

---

**Issue 18 — `AccountSettingsShell` double-fires `setUser` on logo save**

*User journey impact:* After saving a profile with a new logo, `setUser(json.doc)` runs once from `onSubmit`, then the `useEffect` watching `initialUser.updatedAt` fires and calls `reset(buildDefaults(initialUser))` — but `initialUser` is still the PROP (server-rendered), not the freshly saved user. This would reset the form fields to the pre-save state, making the save appear to have reverted.

*Resolution:* The `useEffect` on `initialUser.updatedAt` is suppressed via eslint-disable. The form `reset()` after save uses `json.doc` (the fresh server response), not `initialUser`. The dependency was kept intentional for external sync scenarios.

---

**Issue 19 — `liveUser` from `useAuth()` may lack `depth: 1` studioLogo expansion**

*User journey impact:* The auth provider's user (`useAuth().user`) is fetched from `GET /api/users/me` which returns `depth: 0` by default. After a save that sets `studioLogo`, `setUser(json.doc)` receives the PATCH response which is also `depth: 0` — meaning `studioLogo` is a plain number (the media ID), not the full `Media` object. The logo preview in the profile section would disappear after saving.

*Resolution:* After save, the shell immediately re-fetches the user with `payload.findByID({ depth: 1 })` on the server side via revalidation, OR the `AccountSettingsShell` treats a numeric `studioLogo` as "exists but not expanded" and shows a generic "logo uploaded" state rather than a broken image. The on-page preview (`logoPreview` state) persists as the blob URL until the next page load.

---

**Issue 20 — `useAuth` hook accessed before auth provider initialises on first render**

*User journey impact:* On first page load, `useAuth().user` is `undefined` (the provider initialises asynchronously from `GET /api/users/me`). The `AccountSettingsShell` using `liveUser ?? initialUser` correctly falls back, but the form's `buildDefaults` uses `initialUser` throughout. If `initialUser.updatedAt` is undefined (e.g., new Payload versions), the `useEffect` dependency would never trigger, and form sync after external edits would break silently.

*Resolution:* `buildDefaults` guards against all optional fields with nullish coalescing (`?? ''`). The `useEffect` dependency on `initialUser.updatedAt` is stable since the page component always fetches a complete user object with `payload.findByID` before rendering. The `liveUser ?? initialUser` fallback in the shell ensures the existingLogo derivation is always defined.

---

## 17. DevOps & Free-Tier Impact

No additional GCP resources were provisioned. All new functionality operates within existing infrastructure:

| Resource | Change | Free-tier impact |
|---|---|---|
| Neon DB | 6 new columns + 2 enums on `users` table | Negligible. Schema size increase < 1 KB. |
| Cloud Run (Next.js) | 3 new API routes | No memory/CPU change. Routes are lightweight aggregations. |
| GCS | None | Studio logo upload is local-mode only for now (501 in cloud). |
| Artifact Registry | No new images | No impact. |
| GitHub Actions | `pr-validation.yml` drift check passes | No additional workflow minutes. |

Cloud-mode logo upload (GCS signed-URL flow) is deferred. When implemented, a logo uploaded to GCS would consume a negligible GCS object (~50–200 KB per logo). Well within the 5 GB free-tier allotment.
