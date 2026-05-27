# Ingest Modal & Sessions — Definitive Spec

> Status: **Planning** — final version. Do not begin implementation without sign-off.
>
> Covers: information architecture rationale, `Sessions` Payload collection, navigation change,
> FRH-47 Collections impact, `IngestionWorkbench` overhaul, `MetadataPanel` changes,
> shared components, API surface, migration strategy.

---

## 1. The Problem: Three Systems Without Clear Homes

The current and proposed platform has three distinct systems that can all represent "a group of
assets":

| System | Current home | Current purpose |
|---|---|---|
| `UploadBatches` | Sidebar nav → Tools → (implicit) | Technical ingest event per click |
| `shootName` / Sessions | Nowhere explicit | Creative shoot unit, stored as a string on Media |
| `SmartCollections` | Sidebar nav → Collections | Dynamic views, including "BY SHOOT" auto-generated section |

The confusion: **SmartCollections' "BY SHOOT" section and Sessions both answer the question "find my Iceland shoot"** — from different places. That's redundancy, and redundancy destroys user confidence in any system.

---

## 2. Enterprise DAM Mental Model — First Principles

Every professional digital asset management system separates two access paradigms:

```
"How I produced the work"          "How I find and share the work"
────────────────────────           ────────────────────────────────
Temporal, exhaustive               Thematic, selective, editorial
ALL assets from this shoot         Specific assets matching criteria
Exists before assets upload        Created from existing assets
Fixed (the shoot happened)         Editable (rules change over time)
e.g. Lightroom Folders             e.g. Lightroom Collections
e.g. Bynder Campaigns              e.g. Bynder Boards
e.g. Adobe Bridge Projects         e.g. Adobe Bridge Collections
```

Framehouse Hub maps to this exactly:

```
Sessions           ←→   "How I produced the work"
SmartCollections   ←→   "How I find and share the work"
```

They are genuinely different concepts, serving different user queries:
- "I need the Iceland June files" → **Sessions**
- "I need all editorial shots tagged 'landscape' across every shoot" → **Collections**

These questions have different origins (temporal/provenance vs. thematic/editorial) and must
live in different places in the UI. Mixing them causes what the user identifies: each system
has no clear place and therefore no clear value.

---

## 3. The Resolution: Each System Gets One Home

### Navigation change (Sidebar.tsx)

```
LIBRARY
  All Media         → /dashboard/library            (unchanged)
  Sessions          → /dashboard/library/sessions   (NEW)
  Collections       → /dashboard/library/collections (unchanged)

TOOLS
  Upload Media      → upload trigger                (unchanged)
  Search            → /dashboard/search             (unchanged)
  Settings          → /dashboard/settings           (unchanged)
```

`UploadBatches` is **removed from user-facing navigation entirely**. It is an internal audit
record accessible only via the Payload admin panel. Users never need to navigate by "Upload #47."

### What each home answers

| Navigation item | User question it answers | What it shows |
|---|---|---|
| **All Media** | "What's in my full archive?" | Flat grid of all assets, search + filter |
| **Sessions** | "Show me everything from a specific shoot or project" | Chronological list of sessions, each opens a scoped asset grid |
| **Collections** | "Show me a curated thematic view I saved" | Smart and manual collections, rule-based or curated |

### Consequence for FRH-47 SmartCollections

The FRH-47 spec includes "BY SHOOT" as a section in the Collections grid, auto-generated from
distinct `shootName` values. **This section is removed.**

Sessions are now the authoritative home for shoot-based browsing. Having "BY SHOOT" in
Collections as well would be duplication — users would find "Iceland June 2025" in two places
(Sessions tab and Collections tab) with no clear reason for both to exist.

The Collections auto-generation engine retains:

| Auto-gen source | Section label | `generatedFrom` |
|---|---|---|
| `mediaType` distinct values | BY MEDIA TYPE | `media_type` |
| `manualTags[].tag` distinct | BY TAG | `tags` |
| `technical.cameraModel` distinct | BY CAMERA | `camera` *(rename from `metadata`)* |
| `captureDate` year-month | BY DATE | `date` *(new value)* |
| Manual user-created | MANUAL | `manual` |

The `metadata` generatedFrom value is narrowed to `camera` (rename) and `date` (new).
The `ai_tags` value is retained for the future Vision API feature.
The shoot/session-based auto-generation is **removed entirely** from the engine.

---

## 4. Sessions Collection — Design

### 4.1 Role

A Session is the canonical record for one creative production unit. It may span multiple days
and multiple `UploadBatches`. It pre-fills the ingest form so that every asset in the shoot
inherits consistent baseline metadata (location, default tags, description). It is the source
of truth for `Media.shootName` (kept as a denormalized search cache, synced on change).

### 4.2 Payload collection config

```
slug: 'sessions'
admin:
  group: 'Archival Governance'   ← alongside SmartCollections
  useAsTitle: 'name'
  defaultColumns: ['name', 'shootDate', 'owner', 'createdAt']
access:
  read:   ownerOrAdmin
  create: creativeOrAdmin
  update: ownerOrAdmin
  delete: ownerOrAdmin
timestamps: true
```

### 4.3 Fields

| Field | Type | Req | Index | Notes |
|---|---|---|---|---|
| `name` | text | **yes** | yes | "Iceland June 2025". Normalized to title-case in `beforeChange`. |
| `shootDate` | date | no | yes | When the shoot happened. Distinct from ingest/created date. |
| `description` | textarea | no | — | Shoot brief; plain text. |
| `location` | group: `{ address, latitude, longitude }` | no | — | Same shape as `Media.location`. Pre-fills ingest form. |
| `defaultTags` | array → `{ tag: text }` | no | — | Applied additively to every asset ingested into this session. Never overwrites per-asset tags. |
| `coverAsset` | relationship → media | no | — | Explicit cover for the Sessions grid card. Falls back to most recent asset in session. |
| `owner` | relationship → users | **yes** | yes | Auto-set from `req.user` in `beforeValidate`. |

### 4.4 Hooks

**`beforeValidate` — auto-set owner**
```typescript
({ req, value }) => (req.user && !value ? req.user.id : value)
```

**`beforeChange` — normalize name**
```typescript
data.name = toTitleCase(data.name.trim())
```

**NO afterChange hook creating SmartCollections.** Sessions have their own dedicated page.
They do not generate Collections — that would recreate the duplication problem being solved.

### 4.5 Deletion behaviour

On Session delete: `Media.session` → `null` (SET NULL FK). `Media.shootName` retains the last
synced value as an orphaned string. No cascade-delete of assets.

---

## 5. Media Collection Changes

### 5.1 New field: `session`

```typescript
{
  name: 'session',
  type: 'relationship',
  relationTo: 'sessions',
  required: false,
  index: true,
  admin: {
    position: 'sidebar',
    description: 'Creative session this asset was produced in.',
  },
  // Postgres: ON DELETE SET NULL
}
```

### 5.2 `shootName` — denormalized cache

`Media.shootName` stays on the schema and in the GIN full-text search index for backwards
compatibility and search without JOINs. It is synced from the linked Session via a `beforeChange`
hook and is no longer directly user-editable.

**Sync rule (Media `beforeChange`):**
```typescript
if (data.session is being set and changed) {
  const session = await payload.findByID({ collection: 'sessions', id: data.session })
  data.shootName = session.name
}
```

---

## 6. Sessions Dashboard Page

### 6.1 Route

`/dashboard/library/sessions`

### 6.2 Layout — Sessions grid

Chronological card grid (most recent first), sorted by `shootDate` then `createdAt`.

```
┌──────────────────────────────────────────────────────────────┐
│  LIBRARY label                                               │
│  Sessions                                                    │
│  Your shoot archive, organised by production.                │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ [cover img]  │  │ [cover img]  │  │ [cover img]  │       │
│  │              │  │              │  │              │       │
│  │ Iceland Jun  │  │ Tokyo Mar    │  │ Studio Nov   │       │
│  │ 247 assets   │  │ 89 assets    │  │ 412 assets   │       │
│  │ 14 Jun 2025  │  │ 3 Mar 2025   │  │ 12 Nov 2024  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  + New Session                                               │
└──────────────────────────────────────────────────────────────┘
```

Session card: `rounded-[24px]`, cover image (most recent asset or `coverAsset`), session name
(Inter 600), asset count (Rubik Mono, `gallery-gold`), shoot date (Rubik Mono, `on-surface/40`).
Same visual language as `CollectionCard` in FRH-47 — reuse the card shell pattern.

### 6.3 Session detail view

`/dashboard/library/sessions/[id]`

Shows the full asset grid filtered to `{ session: { equals: id } }`. Reuses the existing
`MediaGrid` component with the session FK as the where clause. Header shows session name,
shoot date, location, description, asset count, and an Edit button to update session metadata.

---

## 7. FRH-47 Collections — Required Updates

These changes are required alongside the Sessions work. They are narrowly scoped.

### 7.1 `SmartCollections.generatedFrom` — update enum

```typescript
// Remove:   'metadata'  (was used for both shoot name and camera model — now ambiguous)
// Add:      'camera'    (camera model auto-generated collections)
// Add:      'date'      (year-month collections)
// Keep:     'manual', 'ai_tags', 'tags', 'location', 'media_type'
```

### 7.2 Auto-generation engine — remove shoot grouping

In the process-callback trigger (and wherever auto-generation fires), remove the step that
creates BY SHOOT collections from `shootName` distinct values. Sessions handle this.

Retain all other auto-generation: media type, tags, camera model, date groupings.

### 7.3 `CollectionGroupSection.tsx` — remove BY SHOOT section

The "BY SHOOT" section (currently `generatedFrom: 'metadata'` filtered to shoot names) is
removed from the collections grid. The existing sections become:

```
BY MEDIA TYPE    generatedFrom = 'media_type'
BY TAG           generatedFrom = 'tags'
BY CAMERA        generatedFrom = 'camera'
BY DATE          generatedFrom = 'date'
MANUAL           generatedFrom = 'manual'
```

### 7.4 Migration: existing BY SHOOT SmartCollections

Existing auto-generated shoot SmartCollections (from `shootName`) should be soft-deleted or
marked `isHidden = true` after the Sessions backfill migration runs. They become redundant once
Sessions are browseable. A migration step handles this.

---

## 8. UploadBatches — Demoted

`UploadBatches` is **removed from user-facing navigation**. It remains in the Payload admin
panel as an audit record. No changes to the collection schema or ingest pipeline — it still
gets created on every upload click. It is simply not surfaced to end users.

If "recent import history" becomes a user need in future, it surfaces as a read-only list within
the Sessions detail view (showing which batches contributed to this session), not as a standalone
nav item.

---

## 9. Ingest Modal — IngestionWorkbench Overhaul

### 9.1 Language changes (string-only, no logic change)

| Current | Proposed |
|---|---|
| "N Archives Ready to Ingest" | "N files ready to upload" |
| "Staging Area: Commit to Source-of-Truth" | *(remove entirely)* |
| "Archival Shoot Identity" label | "Session" |
| "Primary Location" label | "Location" |
| "Classification Engine" block + static badges | *(remove entirely)* |
| "Start Archival Ingest" button | "Upload N Files" |
| "Cancel & Clear Queue" button | "Cancel" |

### 9.2 Form fields

| Field | Component | Required | Maps to |
|---|---|---|---|
| Session | `SessionCombobox` (new) | **yes** | `Media.session` + `Media.shootName` (synced) |
| Tags | `TagInput` (new shared) | no | `Media.manualTags` |
| Location | `LocationSearch` (existing) | no | `Media.location.{address, latitude, longitude}` |
| Description | `<textarea>` | no | `Media.caption` via `convertTextToLexical` |

**No capture date field at ingest.** EXIF date is extracted by the worker and is canonical.
User edits it in MetadataPanel after processing if absent.

### 9.3 SessionCombobox behaviour

Dropdown options:
1. **"＋ Create "{typed value}""** — always first; creates Session on ingest commit
2. Filtered existing sessions (sorted `shootDate desc`)

When an existing session is selected: its `defaultTags` merge into the Tags field and its
`location` pre-fills the Location field. These are defaults — user can override before submitting.

Single-file uploads: pre-fill "General Library" (a seeded catch-all session).

On submit: if session is new, `POST /api/sessions` before `commitStagedFiles`. Session ID flows
through as `sessionId` in the metadata payload.

### 9.4 Heuristic tags — visible, user-owned

`buildHeuristicTags` (filename parsing) produces suggestions shown in `TagInput` as ghost chips.
User promotes (click) or dismisses (×). They are NOT silently injected anymore.
`shootName` is no longer added as a tag — the Session FK handles grouping.

### 9.5 Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ "12 files ready to upload"                            [2.4 GB]       │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  LEFT (7 cols)                      RIGHT (5 cols)                   │
│  ─────────────────────              ───────────────────────────────  │
│  [Bento: 3 previews, +N]            SESSION *                        │
│                                     [SessionCombobox            ▾]  │
│  ─────────────────────                                               │
│  .ARW (10)  .MP4 (2)                TAGS                             │
│  ~4m 30s                            [TagInput + ghost suggestions]  │
│                                                                      │
│  [Scrollable file list]             LOCATION                         │
│   name.ARW  4.2 MB  [×]            [LocationSearch]                 │
│   name.ARW  3.8 MB  [×]            [OsmMiniMap if geocoded]         │
│   ...                                                                │
│                                     DESCRIPTION (optional)           │
│                                     [textarea, 3 rows]              │
│                                                                      │
│                                     ───────────────────────────     │
│                                     [    Upload 12 Files    ]       │
│                                     [        Cancel         ]       │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.6 Session name edge cases

| Case | Handling |
|---|---|
| Multi-part upload (Day 2 of same shoot) | SessionCombobox shows "Iceland June 2025"; user selects it; new batch attaches to same Session |
| Typo variant | Autocomplete fuzzy-matches; user selects the correct one; normalized to title-case on save |
| Moving asset to different session | `session` field editable in MetadataPanel (see Section 10) |
| Single-file with no shoot context | "General Library" pre-filled; trivially accepted |
| Session deleted after ingest | `Media.session` → null; `Media.shootName` retains last value as orphaned string |
| Legacy asset (has `shootName`, no `session` FK) | MetadataPanel shows "Unlinked" badge; "Link to Session" action opens `SessionCombobox` |

---

## 10. ArchivalProgressOverlay — Language Overhaul

### 10.1 Header states

| State | Current | Proposed |
|---|---|---|
| Uploading | "Ingesting Archives..." | "Uploading files..." |
| Processing | "Processing Assets..." | "Processing..." |
| Done | "Archival Complete" | "Done" |
| Sub-label | "{N} / {M} Committed" | "{N} of {M} ready" |

Session name shown under header (single line, truncated):
```tsx
{sessionName && (
  <p className="font-rubik text-[8px] text-on-surface/30 truncate max-w-[200px]">
    {sessionName}
  </p>
)}
```

### 10.2 Step labels

| Key | Current | Proposed |
|---|---|---|
| `upload_complete` | "Upload verified" | "Uploaded" |
| `exif_parsing` | "Parsing EXIF metadata" | "Reading file info" |
| `generating_webp` | "Generating WebP thumbnails" | "Creating previews" |
| `registering_assets` | "Finalizing asset" | "Saving to library" |
| `ready` | "Archival complete" | "Ready" |
| `failed` | "Processing failed" | "Failed" |
| Progress label | "Pipeline Progress" | "Progress" |

### 10.3 Footer telemetry — removed

"Go Worker Active", "Archival Stream Active", "SSE Connected", "N in pipeline" removed entirely.
These are internal infra labels with no meaning to a creative professional.

### 10.4 Error bar

`"N asset(s) failed extraction."` → `"N file(s) failed —"` · `[Retry All]` → `[Retry]`

---

## 11. Toast Notifications

| Current | Proposed |
|---|---|
| "Archival Batch Complete: N assets ingested successfully" | "N files uploaded successfully" |
| "Archival Ingest Failed: No assets were successfully committed" | "Upload failed — no files were saved" |

---

## 12. MetadataPanel Changes

### 12.1 Session field (replaces read-only `shootName` display)

**View mode:** Show session name with Clapperboard icon (existing lines 325–336).
If `media.session` is populated: name from `media.session.name`.
If legacy (only `media.shootName`, no FK): show value + "Unlinked" badge + "Link" action.

**Edit mode (new):** `SessionCombobox` — same component as workbench.
Selecting a session updates `sessionId` + `sessionName` in form state.
On save → `Media.session` FK updated → `beforeChange` hook syncs `shootName`.

### 12.2 `RefinementFormData` additions

```typescript
sessionId: number | null
sessionName: string
```

### 12.3 TagInput extraction

Inline tag logic (lines 499–558) replaced with `<TagInput tags={...} onChange={...} />`.
Behaviour identical; now shared with workbench.

---

## 13. New Shared Components

### `src/components/ui/tag-input.tsx`

Extracted from MetadataPanel lines 499–558. Used in workbench and MetadataPanel.

```typescript
interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]    // Ghost chips; click promotes, × dismisses
  placeholder?: string
  className?: string
}
```

Behaviour: solid confirmed chips (dismissible), ghost suggested chips (promotable),
type + Enter/comma to add, Backspace on empty removes last, case-insensitive dedup, max 20.

### `src/components/ui/combobox.tsx`

Matches structural pattern of `LocationSearch` (controlled, keyboard nav, outside-click dismiss).

```typescript
interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ id?: number | string; label: string }>
  onSelect?: (option: { id?: number | string; label: string }) => void
  placeholder?: string
  required?: boolean
  emptyLabel?: string    // "＋ Create session" when no match
  className?: string
}
```

### `src/lib/lexical-utils.ts`

Move `convertTextToLexical` and `getPlainTextFromLexical` out of MetadataPanel into a shared
utility. Imported by MetadataPanel, register-local, register-gcs.

---

## 14. API Surface

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/media/session-names` | GET | required | Session autocomplete. Query: `q`. Response: `{ sessions: [{ id, name }] }` |
| `/api/sessions` | POST | required | Create new session at ingest time. Body: `{ name, location?, description? }` |
| `/api/media/register-local` | POST | required | Extended: accept `sessionId`, `description`, `location.latitude`, `location.longitude` |
| `/api/media/register-gcs` | POST | required | Same extensions as register-local |

---

## 15. UploadProvider Changes

```typescript
interface UploadMetadata {
  sessionId?: number | null       // NEW
  sessionName?: string            // NEW — for overlay display
  location?: {
    address?: string
    latitude?: number | null      // NEW
    longitude?: number | null     // NEW
  }
  tags?: string[]
  shootName?: string              // Kept for backwards compat; synced server-side from session
  uploadBatchId?: number
  description?: string            // NEW
  title?: string
}
```

`sessionName` stored in provider state for `ArchivalProgressOverlay` header display.

---

## 16. Migration Sequence

```
1. Schema migration
   pnpm payload migrate:create --name add_sessions_and_update_collections
   → Creates sessions table
   → Adds media.session nullable FK (ON DELETE SET NULL)
   → Updates SmartCollections.generatedFrom enum: add 'camera', 'date'; deprecate 'metadata'
   → pnpm generate:types

2. Data migration
   pnpm payload migrate:create --name backfill_sessions_from_shootname
   → For each distinct (shootName, owner) pair in media WHERE shootName IS NOT NULL:
       a. Create Session: { name: shootName, owner }
       b. UPDATE media SET session = newSessionId WHERE shootName = value AND owner = userId
   → Soft-hide existing BY SHOOT SmartCollections:
       UPDATE smart_collections SET is_hidden = true
       WHERE generated_from = 'metadata' (shoot-name-based ones)
       AND is_system_generated = true

3. FRH-47 auto-generation engine update
   → Remove shootName-based collection generation from process-callback trigger
   → Update generatedFrom grouping in CollectionGroupSection.tsx
```

---

## 17. Complete File Change List

### Modified

| File | Change |
|---|---|
| `src/components/layout/DashboardLayout/Sidebar.tsx` | Add Sessions nav item; remove any UploadBatches link |
| `src/components/layout/DashboardLayout/MobileNav.tsx` | Same sessions nav addition |
| `src/components/Gallery/IngestionWorkbench.tsx` | Full rewrite |
| `src/components/Gallery/ArchivalProgressOverlay.tsx` | Language strings, footer removal, session name |
| `src/components/AssetViewer/MetadataPanel.tsx` | TagInput swap; session field; form data update; lexical-utils import |
| `src/providers/UploadProvider.tsx` | Extend UploadMetadata; sessionName state; commitStagedFiles |
| `src/app/api/media/register-local/route.ts` | Accept sessionId, description, location lat/lng |
| `src/app/api/media/register-gcs/route.ts` | Same |
| `src/app/(dashboard)/actions/media.ts` | Add session to updateMediaAction |
| `src/payload.config.ts` | Register Sessions collection |
| `src/collections/SmartCollections/index.ts` | Add 'camera', 'date' to generatedFrom; keep 'metadata' for legacy compat only |
| `src/components/SmartCollections/CollectionGroupSection.tsx` | Update generatedFrom grouping; remove BY SHOOT section |
| `src/app/(dashboard)/dashboard/library/collections/page.tsx` | Remove any shoot-based section references |

### Created

| File | Purpose |
|---|---|
| `src/collections/Sessions/index.ts` | Sessions Payload collection config |
| `src/collections/Sessions/hooks/normalizeSessionName.ts` | beforeChange: title-case + trim |
| `src/collections/Media/hooks/syncShootNameFromSession.ts` | beforeChange: sync shootName from session |
| `src/components/ui/tag-input.tsx` | Shared tag chip input |
| `src/components/ui/combobox.tsx` | Shared combobox (free-text + filtered dropdown) |
| `src/lib/lexical-utils.ts` | convertTextToLexical, getPlainTextFromLexical |
| `src/app/(dashboard)/dashboard/library/sessions/page.tsx` | Sessions grid page |
| `src/app/(dashboard)/dashboard/library/sessions/[id]/page.tsx` | Session detail (filtered asset grid) |
| `src/components/Sessions/SessionCard.tsx` | Session grid card (reuses CollectionCard shell) |
| `src/components/Sessions/SessionsView.tsx` | Sessions grid server component |
| `src/app/api/media/session-names/route.ts` | GET session autocomplete |
| `src/app/api/sessions/route.ts` | POST create session |
| `src/migrations/{ts}_add_sessions_and_update_collections.ts` | Schema migration |
| `src/migrations/{ts}_backfill_sessions_from_shootname.ts` | Data migration |

---

## 18. Build Sequence

```
Phase 1 — Foundation
  Sessions collection schema + migration
  pnpm generate:types
  Shared utilities: lexical-utils, tag-input, combobox

Phase 2 — API & provider
  /api/media/session-names, /api/sessions
  register-local + register-gcs extensions
  UploadProvider metadata shape

Phase 3 — Ingest modal
  IngestionWorkbench rewrite
  ArchivalProgressOverlay language
  Toast updates

Phase 4 — Sessions dashboard
  Sessions grid page + SessionCard
  Session detail page (reuses MediaGrid)
  Sidebar navigation update

Phase 5 — MetadataPanel
  SessionCombobox swap
  TagInput swap
  Unlinked legacy state + Link action

Phase 6 — FRH-47 Collections update
  Remove BY SHOOT auto-generation
  Update generatedFrom grouping
  Data migration: backfill sessions, hide old BY SHOOT collections

Phase 7 — Tests
  Int: session CRUD, FK wiring, shootName sync, SET NULL on delete, defaultTags merge
  E2E: ingest with new session, ingest with existing session, MetadataPanel session reassignment
```

---

## 19. Future Features

| Feature | Value |
|---|---|
| **Session edit modal** — edit name, date, location, brief from session card ⋯ menu | Avoid navigating to detail just to fix a typo |
| **Bulk session reassignment** — select assets in gallery → "Move to Session" | Post-ingest reorganization at scale |
| **Session brief (rich text)** — extended notes for client briefs, retrospective notes | Richer production context |
| **Rating / colour label** — 1–5 star or Red/Yellow/Green flag per asset | Standard culling workflow |
| **Duplicate detection at ingest** — visual pairs before commit | Prevents re-ingesting same shoot |
| **AI tags on ingest** — auto-suggest from thumbnail (Vision API, deferred in FRH-52) | Surface in TagInput alongside heuristic suggestions |
| **Per-asset title at ingest** — inline editable title per file in workbench file list | Mixed shoots where filenames are meaningless |
| **Session sharing / portal** — share a session with a client as a view-only link | Delivery workflow |
