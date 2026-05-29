# Manual Collections & Sessions — UX/UI Spec

> **North Star:** Two complementary mental models, each with a single clear home. Sessions answer *"how I produced this work"* — temporal, exhaustive, fixed. Manual Collections answer *"how I present and share this work"* — editorial, selective, intentional. The platform must make this distinction feel immediately obvious, not learned. Every screen, action, and word choice must reinforce it without needing a tooltip to explain it.

---

## 0. Mental Model Map

Before any detail: the single most important thing this spec must protect.

```
SESSION                          MANUAL COLLECTION
────────────────────────         ─────────────────────────────
"Iceland June 2025"              "Best Eagle Shots"
Temporal. Provenance.            Editorial. Intentional.
ALL assets from that shoot       CHOSEN assets, any source
Created before or during work    Created from existing work
Fixed — the shoot happened       Evolving — curated over time
I need everything from this job  I want to show these specific ones
```

**System consequence:** A creator should never be confused about which tab to visit for which question. Navigation, empty states, headings, and every piece of microcopy must reinforce this distinction passively.

---

## 1. Core UX Principles (Shared)

### 1.1 One Question, One Home

Every user query has exactly one correct home:

| Question | Home |
|---|---|
| "Show me everything from the Tokyo shoot" | Sessions |
| "Show me my best portrait work" | Collections |
| "Find the Iceland file I'm thinking of" | All Media (search) |

No overlap. No duplicate answer surfaces. Cross-system navigation supports the workflow; it does not blur the model.

### 1.2 Three-Interaction Maximum

Every core action — create a session, create a collection, add an asset — must complete in **three interactions or fewer**. No form pages for creation. No required metadata before the object exists. All enrichment is post-creation.

### 1.3 Optimistic First

UI reflects the action immediately. Network confirms or rolls back silently. Creators should never wait for a spinner before they see their work reflected.

### 1.4 Undo Over Confirm

Reversible actions use a 5-second undo toast, not a confirmation dialog. Irreversible actions (permanent delete) use a single confirmation modal with explicit copy about what is and is not deleted. Nothing else.

### 1.5 Language is the System

Microcopy is not decoration — it is the mental model made explicit. The following language tables are mandatory across all UI surfaces.

**Sessions language:**

| ❌ Avoid | ✅ Use instead |
|---|---|
| "Archive" / "Archival" | "Session" / "Upload" |
| "Ingest" (user-facing) | "Upload" |
| "Commit to source-of-truth" | (remove entirely) |
| "Shoot identity" | "Session" |
| "N / M Committed" | "N of M ready" |
| "Classification Engine" | (remove entirely) |
| "Go Worker Active" | (remove entirely) |
| "Archival Complete" | "Done" |
| "Pipeline Progress" | "Progress" |

**Collections language:**

| ❌ Avoid | ✅ Use instead |
|---|---|
| "Matches your rules" | "Curated by you" |
| "Filtered by" | "Pinned assets" |
| "Include in view" | "Add to this collection" |
| "Hide from view" | "Remove from collection" |
| "Auto-maintained" | (not used for manual collections) |
| "Move to collection" | "Add to collection" |
| "Store in" | "Add to" |

---

## Part I — Sessions

---

## 2. Sessions: Problem Statement

Sessions currently exist as a data model without a full UX surface. Creators produce work in shoots. Every professional DAM (Lightroom, Bynder, Adobe Bridge) gives shoots a first-class home. Without this, creators either over-rely on collections (wrong mental model) or can't find their own work by production context.

Additionally, the ingest flow currently uses archival jargon that creates distance from the action. A photographer uploading today's shoot should feel like they're filing work, not running a compliance process.

---

## 3. Sessions Page — `/dashboard/library/sessions`

### 3.1 Page Layout

```
Sessions                                        [+ New Session]
Your shoot and project archive.
──────────────────────────────────────────────────────────────

[🔍 Search sessions…]              [Sort: Most Recent ▾]

2026
  [Card]  [Card]  [Card]  [Card]

2025
  [Card]  [Card]  [Card]
  [Card]  [Card]

2024 (collapsed by default if >12 months ago)
  [Show 4 sessions ▸]
```

**Rules:**
- Grouped by year of `shootDate` (falls back to `createdAt`). Year headers are `text-xs Inter uppercase on_surface/40` — no divider lines.
- Years older than 12 months collapse by default with a "Show N sessions" disclosure row. Active year and most recent prior year always expanded.
- Sort options: Most Recent (default), Oldest First, Most Assets, Alphabetical.
- Search is live, debounced 300ms, matches session name and location address.
- On mobile: single-column layout; sort and search in a collapsible filter bar (chevron toggle).

### 3.2 Session Card

```
┌──────────────────────────────────────┐
│  [Cover image — full bleed, 16:9]    │
│                              [⋯ menu]│
├──────────────────────────────────────┤
│  Iceland June 2025                   │  ← Inter 600
│  📍 Reykjavik, Iceland               │  ← on_surface/50, text-xs
│  247 assets · 14 Jun 2026            │  ← Rubik Mono, text-[10px], gold count
└──────────────────────────────────────┘
```

**Cover image logic (in priority order):**
1. `session.coverAsset` if set
2. Most recently processed asset in session with `thumbnailUrl`
3. `surface_container` placeholder with clapperboard icon

**Card states:**

| State | Treatment |
|---|---|
| Empty (0 assets) | Placeholder cover + "No assets yet" in body |
| Loading count | Rubik Mono skeleton shimmer (no flash of "0") |
| Hover (desktop) | Ambient shadow lift + ⋯ button reveals |
| Active / focused | Gold `outline_variant` ghost border, 2px |

**⋯ Context menu actions:**
- Edit session details
- Set cover image
- Add assets
- Rename *(inline on card)*
- Duplicate
- Delete *(confirmation modal)*

### 3.3 New Session Card (Inline)

Clicking "+ New Session" inserts a new card at the top of the current year group — inline, not a modal.

```
┌──────────────────────────────────────┐
│  [Placeholder cover — dashed]        │
├──────────────────────────────────────┤
│  [Name your session…          ]      │  ← autofocused input
│                   [Cancel] [Create]  │
└──────────────────────────────────────┘
```

- `Enter` or "Create" commits with name only — date, location, tags are optional post-creation.
- `Escape` or "Cancel" discards silently, card animates out.
- After creation: card settles into the grid with an empty state. Toast: "Session created · Add assets →"
- Clicking "Add assets" in the toast opens the Asset Picker modal scoped to "Add to [Session name]".

### 3.4 Empty State (No Sessions)

```
         [Clapperboard illustration — line art, muted]

         No sessions yet

         Sessions track your shoots, projects, and productions.
         Every time you upload, you'll assign a session.

         [Upload your first files →]
```

One action only. No secondary CTAs that distract.

---

## 4. Session Detail View — `/dashboard/library/sessions/[id]`

### 4.1 Header

```
← Sessions                                              [Edit] [⋯]
────────────────────────────────────────────────────────────────
🎬  Iceland June 2025
    📍 Reykjavik, Iceland  ·  14 Jun 2026  ·  247 assets

    [#landscape] [#drone] [#golden-hour]    ← default tags as chips
────────────────────────────────────────────────────────────────
                                       [+ Add assets]  [⊡ Select]
```

- **Clapperboard icon**: non-interactive type indicator, always visible
- **[Edit]** button: opens the Session Edit Panel (see §4.2)
- **[+ Add assets]**: opens the Asset Picker modal scoped to this session
- **[⊡ Select]**: activates multi-select mode on the asset grid
- Tag chips: display-only, non-interactive in view mode (they are defaults applied at ingest, not a live filter)
- On mobile: header collapses on scroll to single bar with session name + back arrow + action icons

### 4.2 Session Edit Panel

Triggered by the [Edit] button. Opens as a side panel on desktop (right-side drawer, 380px), bottom sheet on mobile.

```
Edit Session                                           [× Close]
──────────────────────────────────────────────────────────────
NAME
[Iceland June 2025                                          ]

SHOOT DATE
[14 Jun 2026                                              📅 ]

DESCRIPTION
[Production notes, client briefs, retrospective…           ]
[                                                           ]
[                                                           ]

LOCATION
[🔍 Reykjavik, Iceland                                      ]
[Map preview if geocoded]

DEFAULT TAGS  (applied to future uploads in this session)
[#landscape  ×]  [#drone  ×]  [+ Add tag]

COVER ASSET   (optional — defaults to most recent)
[Current cover thumbnail]  [Change →]
──────────────────────────────────────────────────────────────
[    Save Changes    ]        [Cancel]
```

**Rules:**
- Name field is required and pre-filled. Cannot save empty.
- All other fields optional.
- "Default Tags" label explicitly states these apply to *future* uploads, not retroactively — this is a creator anxiety point.
- "Change cover" opens the asset picker filtered to this session's assets only.
- Save triggers inline success animation on the header (name updates in place). No page reload.
- Panel width is 380px on desktop. Does not push the asset grid — overlays at 90% opacity background dim.

### 4.3 Asset Grid (within Session)

Reuses the existing `MediaGrid` component with the session FK as the where clause. Full feature parity with the main library grid:
- Sort, filter, search within the session
- Multi-select + bulk toolbar
- Asset context menu

**Additional context menu item (within a session):**
- "Move to different session" — opens session picker (combobox, existing sessions only)
- "Add to collection" — opens collection picker (same component as main library)

**Bulk toolbar additions (within a session):**
- "Move to session" — reassign selected assets to a different session
- "Add to collection" — add selection to a manual collection

### 4.4 Empty State (Session with 0 Assets)

```
         [Clapperboard illustration]

         No assets in this session yet

         [Browse library to add assets]    [Upload files to this session]
```

Two distinct CTAs because both paths are valid: adding existing library assets and uploading new ones. "Upload files to this session" pre-fills the session field in the ingest workbench.

---

## 5. Ingest Workbench — UX Overhaul

The workbench is the highest-frequency creator interaction. Every word and layout choice compounds.

### 5.1 Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  12 files ready to upload                          [2.4 GB]  [× Close]│
│ ──────────────────────────────────────────────────────────────────── │
│                                                                       │
│  LEFT (7 cols)                       RIGHT (5 cols)                   │
│  ────────────────────                ──────────────────────────────   │
│  [3-up bento preview]                SESSION  *required               │
│  file1.ARW  file2.ARW  file3.ARW +9  [🔍 Iceland June 2025      ▾ ]  │
│                                                                       │
│  ── File breakdown ──                TAGS  (optional)                 │
│  .ARW  ×10   .MP4  ×2               [#landscape  ×] [#drone  ×]      │
│  ~4 min 30 sec est.                 [ghost suggestion chips…]         │
│                                                                       │
│  ── File list (scrollable) ──        LOCATION  (optional)             │
│  file001.ARW   4.2 MB  [×]          [🔍 Search location…       ]     │
│  file002.ARW   3.8 MB  [×]          [mini map if geocoded]            │
│  file003.MP4   812 MB  ⚠ Large [×]                                   │
│  …                                   DESCRIPTION  (optional)          │
│                                      [                          ]     │
│                                      [  Shoot notes…            ]     │
│                                                                       │
│                                      ──────────────────────────────   │
│                                      [      Upload 12 Files     ]    │
│                                      [          Cancel          ]    │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Session Field Behaviour

- Autofocused on workbench open (most important decision)
- Free-text input with dropdown: existing sessions listed by `shootDate desc`
- "＋ Create [typed value]" always appears as the first option when text doesn't match exactly
- Selecting an existing session: pre-fills Tags and Location from `session.defaultTags` and `session.location` — shown with a subtle "from session" label so creator understands the source. These pre-fills are editable.
- Required validation: the Upload button is disabled until a session is named or selected. Error state on blur if empty.
- "General Library" is seeded as a catch-all for creators who don't want to assign a session — it always appears at the bottom of the dropdown, visually de-emphasised (muted text, "catch-all" label).

### 5.3 File List Feedback

- Files with size over 90% of their type's limit show a "⚠ Large" chip inline — not a blocking alert, just an awareness signal
- Files over 100% of limit are blocked with a red indicator and tooltip explaining the limit
- Removing a file (×) is instant and optimistic — no confirmation
- Total estimated processing time shown as "~N min" based on file count and types

### 5.4 Tag Suggestions

- Ghost chips sourced from: session's `defaultTags` (already populated into the confirmed chips if session pre-fills), then filename heuristics
- Ghost chips are tappable to promote; ×-dismissible
- Creator is in control — no silent tag injection
- `shootName` is no longer silently added as a tag (Session FK handles grouping now)

### 5.5 Upload Button States

| State | Button label | Behaviour |
|---|---|---|
| No session | "Upload N Files" (disabled) | Disabled with tooltip: "Choose a session to continue" |
| Session selected, ready | "Upload N Files" | Active, primary gradient |
| Uploading | "Uploading… N%" | Disabled, shows inline progress |
| Error | "Retry Upload" | Active, gold border |

### 5.6 Mobile Workbench

On viewports < 768px, the two-column layout stacks:
1. File preview strip (horizontal scroll, 80px thumbnails)
2. Session field (full width)
3. Tags (full width)
4. Location (collapsed behind "Add location ＋" toggle — saves space for the common case)
5. Description (collapsed behind "Add notes ＋" toggle)
6. Upload button (full width, sticky bottom)

The Upload button is sticky at the bottom of the mobile viewport — always accessible without scrolling.

---

## 6. Upload Progress Overlay

### 6.1 States and Copy

| Phase | Header | Sub-label |
|---|---|---|
| Uploading | "Uploading files…" | "[Session name] · N of M ready" |
| Processing | "Processing…" | "[Session name] · N of M ready" |
| Done | "Done" | "N files added to [Session name]" |
| Error | "N files failed" | "Tap to retry" |

### 6.2 Step Labels

| Step | Label |
|---|---|
| `upload_complete` | "Uploaded" |
| `exif_parsing` | "Reading file info" |
| `generating_webp` | "Creating previews" |
| `registering_assets` | "Saving to library" |
| `ready` | "Ready" |
| `failed` | "Failed" |

### 6.3 Removed

- "Go Worker Active" — removed
- "Archival Stream Active" — removed
- "SSE Connected" — removed
- "N in pipeline" — removed
- "Pipeline Progress" label — replaced with "Progress"

All of these are internal infrastructure states with no meaning to a creator. The overlay communicates work progress, not system topology.

### 6.4 Error Recovery

Failed files show inline within the overlay list (not in a separate toast):
```
  file003.ARW   ✗ Failed      [Retry]
```

"Retry All" available if > 1 failure. Retrying does not restart successful files.

---

## 7. Session Reassignment (Post-Ingest)

### 7.1 Single Asset Reassignment

From MetadataPanel (asset detail view):

```
SESSION
  [🎬  Iceland June 2025           ▾ ]   ← combobox, same component as workbench
```

- Edit mode activates the combobox
- Selecting a new session updates the FK; `shootName` syncs server-side
- If `media.session` is null and `media.shootName` is set (legacy orphan): show "Unlinked" badge + "Link to session" prompt that opens the combobox. This is the migration path for pre-Sessions assets.

### 7.2 Bulk Reassignment

From the session detail asset grid or the main library grid in multi-select mode:

```
[N] assets selected  ·  [Add to collection]  [Move to session]  [Tag]  [Delete]
```

"Move to session" opens the session picker (combobox, existing sessions only — cannot bulk-create). Confirms with: "Move N assets to [Session name]?" with an Undo toast after confirmation.

---

## 8. Cross-System Navigation

The two systems are distinct but connected. Navigation between them must be natural without blurring their purposes.

### 8.1 From a Session → Adding to a Collection

Inside a Session detail view, selecting assets and choosing "Add to collection" from the bulk toolbar uses the **Collection Picker** (see Part II §8). This is the primary cross-system flow. The mental model is: "I found these assets in my session archive. Now I want to curate them."

### 8.2 From a Collection → Seeing Session Provenance

Inside an asset's MetadataPanel (accessible from any context — library, collection, session), the Session field shows where the asset came from. Clicking the session name navigates to the Session detail. This is the secondary cross-system flow.

### 8.3 From an Asset — Collections Membership

Also in MetadataPanel, the Collections row (see Part II §6) shows which manual and smart collections the asset belongs to. These are navigable chips.

### 8.4 What Does NOT Cross

- Sessions are not browseable from the Collections tab and vice versa.
- The Collections auto-generation engine does not generate BY SHOOT collections — Sessions own that.
- Deleting a session does not affect collection membership (assets are single-source).

---

## Part II — Manual Collections

---

## 9. Collections Page — `/dashboard/library/collections`

### 9.1 Page Layout

```
Collections                                     [+ New Collection]
Curate and organise your work thematically.
──────────────────────────────────────────────────────────────

Manual Collections (4)
  [Card]  [Card]  [Card]  [Card — empty, New Collection inline]

Smart Collections (8)
  BY MEDIA TYPE        [Card]  [Card]  [Card]
  BY TAG               [Card]  [Card]
  BY CAMERA            [Card]
  BY DATE              [Card]  [Card]

Hidden (2)
  [Show hidden collections ▸]
```

**Rules:**
- Manual section always appears first — these are creator-owned and must feel primary, not secondary.
- Smart sections appear below, grouped by `generatedFrom` with their section labels.
- Hidden collections are collapsed at the bottom — soft disclosure, not buried settings.
- "+ New Collection" button in the page header creates a Manual collection (only type a user can directly create).
- On mobile: tabs replace sections — "Manual", "Smart", "Hidden" — default to Manual tab.

### 9.2 Collection Card

```
┌──────────────────────────────┐
│  [Cover mosaic — 2×2 grid]   │  ← rounded-[16px]
│                       [⋯]   │
│  🔖  12                      │  ← bookmark icon + count (Rubik Mono, gold)
├──────────────────────────────┤
│  Best Eagle Shots            │  ← Inter 600 text-sm
│  Updated 2 days ago          │  ← text-[10px] on_surface/40
└──────────────────────────────┘
```

**Type badge rules (top-left of cover region):**
- Manual: 🔖 bookmark icon (filled gold)
- Smart rule-based: funnel icon (outline, on_surface/50)
- System-generated: funnel + "AUTO" Rubik Mono chip (gold/10 bg)
- Hybrid (has rules + manual overrides): sliders icon

Type must always be distinguishable on the card without hover — never tooltip-only.

**Cover mosaic states:**

| Assets | Mosaic |
|---|---|
| 0 | Dashed placeholder, "Add assets" text centred |
| 1 | Single image, full bleed |
| 2–3 | Fills grid cells left-to-right; remainder `surface_container` |
| 4+ | 2×2 grid, most recently added assets |

---

## 10. Creating a Manual Collection

### Journey A — From Asset Context Menu (Primary Path)

```
Asset (right-click / long-press)
  └─ "Add to collection…"  🔖
       └─ Collection Picker (popover desktop / bottom sheet mobile)
            ├─ [🔍 Search collections…]  (autofocused)
            ├─ Best Eagle Shots         [+ Add]
            ├─ Portfolio Candidates     [✓ Already in]
            └─ ＋ New collection
                 └─ [Inline name field appears in place of this row]
                      └─ Enter / checkmark → created + asset added
                           └─ Toast: "[Name] created · View →"
```

### Journey B — From Page Header (Empty-First)

```
Collections page → "+ New Collection"
  └─ Inline card inserts at top of Manual section
       └─ [Name your collection…]  (autofocused)
            └─ Enter / "Create" → card settles, empty state visible
                 └─ Toast: "[Name] created · Add assets →"
```

### Journey C — Bulk Add from Library Grid

```
Library grid → multi-select → bulk toolbar
  └─ "Add to collection"  🔖
       └─ Collection Picker (same component)
            └─ All [N] assets added
                 └─ Toast: "N assets added to [Name] · View →"
```

**Friction rules:**
- Zero required fields beyond a name.
- Clicking away from the name field during inline creation (with no text entered) cancels silently.
- Empty collections are valid and persist in the grid.
- Smart and system collections must not appear in the "Add to collection" picker — manual only.

---

## 11. Collection Detail View

### 11.1 Header

```
← Collections                                     [Edit name ✏]  [⋯]
────────────────────────────────────────────────────────────────────
🔖  Best Eagle Shots
    12 assets · Last updated 2 days ago
────────────────────────────────────────────────────────────────────
                                    [+ Add assets]    [⊡ Select]
```

- Collection name is editable inline: clicking the pencil or double-clicking the name enters edit mode with an autofocused input. `Enter` commits; `Escape` cancels.
- On mobile: header collapses to single-line toolbar on scroll.

### 11.2 Asset Grid (within Collection)

Full `MediaGrid` parity with these additions:

**Additional context menu item (within a manual collection):**
- "Remove from collection" — top-level, not in a submenu. Animated out with 5s undo toast.

**"Remove from collection" must only appear in this context.** It must not appear in the main library grid where it would be meaningless.

**Bulk toolbar (within a collection):**
- "Remove from collection" — operates on selection
- "Add to session" is intentionally absent here — session is a provenance relationship set at ingest, not curated post-hoc

### 11.3 Empty State

```
         [Bookmark illustration — line art]

         This collection is empty

         Add assets from your library to get started.

         [Browse Library →]          [Add assets directly +]
```

---

## 12. Asset Picker Modal (Full Browse)

Used from "Add assets" CTA in collection detail and session detail empty states.

```
┌────────────────────────────────────────────────────┐
│  Add to "Best Eagle Shots"               [× Close] │
├────────────────────────────────────────────────────┤
│  [🔍 Search assets…                              ] │
│  [All] [Photos] [Videos] [RAW]                     │
├────────────────────────────────────────────────────┤
│  [asset] [asset] [asset] [asset]                   │
│  [asset] [asset] [asset] [asset]   ← scrollable    │
│  …                                                 │
│  ✓ Already in collection (greyed, not selectable)  │
├────────────────────────────────────────────────────┤
│  [3 selected]             [Cancel]  [Add 3 Assets] │
└────────────────────────────────────────────────────┘
```

- Already-in-collection assets: shown with checkmark badge, not selectable — avoids confusion about duplicates.
- Filter tabs persist across searches.
- "Add N Assets" disabled until ≥1 new asset selected; shows count when active.
- On mobile: full-screen sheet, bottom-anchored action bar, sticky search + filter tabs.

---

## 13. Inline Collection Picker (Popover / Bottom Sheet)

Used for "Add to collection" from asset context menus and bulk toolbar.

**Desktop popover (280px wide, max 320px tall):**

```
┌──────────────────────────────┐
│ 🔍 Search collections…       │
├──────────────────────────────┤
│ 🔖 Best Eagle Shots    [+]   │
│ 🔖 Portfolio Candidates [✓]  │  ← already in collection (toggle to remove)
│ 🔖 Favourite Portraits [+]   │
├──────────────────────────────┤
│ ＋ New collection             │
└──────────────────────────────┘
```

- ✓ items are toggle: clicking removes the asset from that collection (with undo toast).
- "＋ New collection" always pinned at bottom of list, never scrolled out of view.
- Appears with 150ms ease-in. Positioned anchored to trigger element.

**Mobile bottom sheet:**
- 50% viewport height, drag handle at top, draggable to dismiss.
- Input autofocuses (keyboard opens), sheet pushes up.
- Backdrop tap dismisses.

---

## 14. Collection Management

### 14.1 Context Menu Actions

From the ⋯ menu on any collection card:

- **Rename** → inline edit on the card name (double-click/double-tap also triggers)
- **Pin to top** / **Unpin** → adjusts `sortOrder`; pinned cards show a gold pin dot top-right
- **Duplicate** → creates "[Name] Copy" instantly; toast: "[Name] Copy created"
- **Set cover** → opens asset picker filtered to collection's assets
- **Delete collection** → confirmation modal only (irreversible action)

### 14.2 Delete Confirmation Modal

```
Delete "Best Eagle Shots"?

This collection will be deleted. Your assets will not be deleted —
they remain in your library and any other collections.

[Cancel]          [Delete Collection]  ← tertiary red
```

The "your assets will not be deleted" line is mandatory — this is the primary creator anxiety on deletion.

---

## 15. Session-Aware Asset Context Menu

The asset context menu adapts based on context. Mandatory rules:

| Context | Menu includes | Menu excludes |
|---|---|---|
| Main library grid | "Add to collection", "Move to session" | "Remove from collection", "Remove from session" |
| Session detail view | "Add to collection", "Move to different session" | "Remove from session" (sessions own all their assets — moving is the verb) |
| Collection detail view | "Remove from collection" | "Move to session" (session is provenance, not collection action) |

---

## 16. Feedback & System Communication

### 16.1 Toast Messages

| Action | Copy | Duration | Action CTA |
|---|---|---|---|
| Session created (empty) | "[Name] created" | 3s | "Add assets →" |
| Collection created (empty) | "[Name] created" | 3s | "Add assets →" |
| Asset added to collection | "Added to [Name]" | 3s | "View →" |
| N assets added (bulk) | "N assets added to [Name]" | 3s | "View →" |
| Asset removed from collection | "Removed from [Name]" | 5s | "Undo" |
| Collection deleted | "[Name] deleted" | 5s | "Undo" |
| Session deleted | "[Name] deleted · Assets kept" | 5s | "Undo" |
| N assets uploaded | "N files added to [Session]" | 4s | "View session →" |
| Upload failed | "Upload failed — no files were saved" | 8s | "Try again" |
| Assets moved to session | "N assets moved to [Session]" | 5s | "Undo" |
| Collection renamed | *(silent — inline edit commits visually)* | — | — |

### 16.2 Error States

- **Network failure on save:** Inline error below the action area; state rolled back. No silent failures.
- **Asset picker load failure:** Error state inside modal with "Try again" button. Modal stays open.
- **Session create failure at ingest:** Inline error below session field in workbench; upload blocked until resolved.
- **Upload failure (partial):** Individual files show failure state in overlay; successful files are not re-uploaded on retry.

---

## 17. Accessibility

- All context menus: `Enter`/`Space` to open, arrow keys to navigate, `Escape` to dismiss. Focus returns to trigger on close.
- Collection and session picker: `Tab` cycles items, `Enter` to select/toggle, `Escape` to close.
- Full focus trap inside modals and bottom sheets.
- Icon-only buttons carry `aria-label` naming the action and the target object: e.g., `aria-label="More options for Best Eagle Shots"`.
- Asset count chip: `aria-label="12 assets"` (not just "12").
- Type indicator icons: `aria-label="Manual collection"` / `aria-label="Smart collection"` — screen readers must distinguish types.
- Session clapperboard icon in headers: `aria-hidden="true"` (decorative; name communicates type contextually).
- Inline name edit fields: `aria-label="Rename [current name]"`.
- Colour is never the sole differentiator — icons, labels, and `aria-label` always accompany colour-coded states.
- Minimum touch targets: 44×44px for all interactive elements. Context menu rows: 48px height. Picker list items: 52px height.

---

## 18. Mobile-Specific Behaviour

| Interaction | Desktop | Mobile |
|---|---|---|
| Create session | Inline card in grid | FAB bottom-right → inline card in grid |
| Create collection | Inline card in grid | FAB bottom-right (on Manual tab) |
| Add to collection | Right-click → context menu | Long-press (500ms) → context menu |
| Multi-select | Hover checkbox | Tap-to-select mode (checkboxes persist until mode exited) |
| Bulk toolbar | Floating bottom bar | Floating pill (icon-only; labels on long-press) |
| Collection picker | 280px anchored popover | 50vh bottom sheet |
| Asset picker modal | Centred dialog, 80% viewport | Full-screen sheet |
| Workbench | 2-column layout | Stacked, sticky Upload button |
| Session edit | Right side drawer | Full-screen sheet |
| Collection/session sections | Side-by-side on page | Tabs |
| Rename | Click name / pencil | Double-tap name |
| Year disclosure (sessions) | Inline expand | Inline expand |
| Sort / filter | Header inline | Collapsible filter bar (chevron) |

**FAB rules:**
- FAB appears only when the relevant section is in view.
- On the Sessions page: "＋ New Session"
- On the Collections page, Manual tab: "＋ New Collection"
- FAB is a gold gradient pill (not a circle) — consistent with the design system's rounded-pill CTA style.
- FAB never obscures the last row of cards. It lifts above the viewport bottom with a 16px margin.

---

## 19. Edge Cases & Guardrails

### Sessions

| Scenario | Behaviour |
|---|---|
| Session name left blank | Discard silently; no session created |
| Duplicate session name (same user) | Allowed — creators often have "Day 2" sessions with the same base name |
| Session deleted, assets survive | Assets show "Unlinked" badge in MetadataPanel; `shootName` retains last value |
| Legacy asset (has `shootName`, no session FK) | MetadataPanel shows "Unlinked" + "Link to session" combobox prompt |
| Multi-day upload to same session | Session combobox pre-fills from recent; user selects same session; new batch attaches correctly |
| Upload with no session intent (single quick file) | "General Library" catch-all pre-populated at bottom of dropdown; trivially accepted |

### Collections

| Scenario | Behaviour |
|---|---|
| Collection name left blank | Discard silently |
| Duplicate collection name | Allowed — no uniqueness enforced |
| Asset added to collection it already belongs to | No-op; ✓ state in picker indicates membership |
| Collection deleted with 0 assets | Immediate delete, no confirmation |
| Collection deleted with assets | Confirmation modal with explicit "assets not deleted" copy |
| >500 assets in manual collection | Soft warning at 450; hard block at 500 with clear explanation |
| Creator has >50 manual collections | Picker shows "Recently used" (last 5) above full scrollable list |
| Offline | Optimistic state on action; error toast + rollback if confirm fails |

---

## 20. Out of Scope (This Spec)

- Converting a session into a collection or vice versa
- Sharing sessions or collections as public/client-facing links
- Collaborator or team access to sessions or collections
- Nested sessions or sub-sessions
- Nested or hierarchical collections
- In-collection asset sort order customisation
- AI-suggested collection membership
- Session rating/colour label system (culling workflow — separate spec)
- Duplicate detection at ingest
