# FRH-49 — Expanded Collection View
## Product Design Specification

**Ticket:** FRH-49  
**Branch:** FRH-49-Expanded-Collection-View  
**Status:** Design Spec — Pending Implementation Review  
**Design North Star:** "The Curated Gallery" — contextual zoom into the archive, not folder navigation.

---

## 1. Mental Model

The expanded collection view is a **contextual zoom lens**, not a new page. When a creator clicks a collection, the interface shifts focus — the archive contracts around that subset, the collection's identity surfaces prominently, and the creator feels oriented within their broader library. The back action restores full context without disorientation.

**Distinguishing principle:** A user browsing "Iceland 2024" should feel like they're *inside* that body of work, not like they navigated into a folder hierarchy. The collection header communicates curation, not file structure.

---

## 2. Entry Points & Navigation Flow

```
Dashboard
  └─ /dashboard/library/collections          (Collection Grid — existing)
       └─ [click collection card]
            └─ /dashboard/library/collections/[id]   (Expanded View — this spec)
                 ├─ [← Back] → /dashboard/library/collections
                 ├─ [filter chip applied] → same URL + ?filter= params (no page reload)
                 ├─ [asset click] → Detail Modal overlay (preserves collection context)
                 └─ [Edit Rules] → Slide-in Rule Editor panel (already exists)
```

**URL Structure:**
```
/dashboard/library/collections/[id]
  ?viewMode=masonry|grid|timeline   (persists via localStorage + URL)
  &type=raw|video|image             (filter chips — multi-select)
  &camera=Canon+R5                  (filter chip)
  &date=2024-01                     (timeline group anchor, scroll hint)
  &page=2                           (pagination state)
```

**Navigation Context Preservation:**
- Browser back always returns to the collection grid at the correct scroll position (use `sessionStorage` scroll anchor).
- The collection header is always visible — creators should always know *which collection* they're in.
- The header does not scroll away. It becomes sticky below the global top nav.

---

## 3. Page Anatomy

### 3.1 Sticky Collection Header

**Height:** 72px desktop / auto (collapsed) mobile  
**Behavior:** Sticks below the site top nav on scroll. Does not compete with top nav — it is a *sub-header* at `z-index: 40`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Collections   [Collection Icon]  Iceland 2024          [847 assets]      │
│                  [system-generated badge?]  [description truncated]          │
│                                                            [Edit Rules] [···]│
└─────────────────────────────────────────────────────────────────────────────│
```

**Left zone:**
- Back chevron + "Collections" label in `font-rubik text-[10px] tracking-[0.18em] uppercase` — matches session detail back nav style.
- Collection icon (from SmartCollection `icon` field — camera, folder, sparkles, tag, map).
- Collection name: `text-2xl font-semibold` (Inter). On mobile: `text-xl`.
- System-generated badge: small pill `font-rubik text-[9px] bg-[#445aa5]/10 text-[#445aa5]` — only shown if `isSystemGenerated`.

**Right zone:**
- Asset count: `font-rubik text-2xl font-bold text-gallery-gold` + `text-[9px] uppercase` label "assets".
- `[Edit Rules]` button (existing) — `ghost` variant, only shown if owner.
- `[···]` overflow: Rename, Duplicate, Hide, Delete.

**Background:** `surface_container_lowest` (#ffffff light / dark variant) at 95% opacity + `backdrop-blur-md`. Uses the glass rule from DESIGN.md for sticky elements.

**Divider below header:** 40px gap (no line — follows "no 1px border" rule).

---

### 3.2 Filter & Control Bar

Positioned immediately below the sticky header gap. Scrolls with the page on mobile (does not double-stack with the header).

```
┌─── Filter Chips ───────────────────────────────────┐   ┌─ View Mode ─┐
│ [× All] [RAW] [Video] [Canon R5] [Iceland] [+ Add] │   │ ▦ ▤ ≡      │
└────────────────────────────────────────────────────┘   └─────────────┘
```

**Filter Chips:**
- Pill shape, `ROUND_SIXTEEN`, `text-[11px] font-bold font-rubik uppercase tracking-wide`.
- **Inactive:** `bg-surface_container text-on-surface/50` (tonal, no border).
- **Active:** `bg-gallery-gold/15 text-gallery-gold border border-gallery-gold/30` — the gold accent signals "narrowing the lens".
- **`[× All]`** chip: always first when filters active. Clears all. On hover: `bg-tertiary/10 text-tertiary`.
- **`[+ Add]`** chip: opens a filter popover (type, camera model, date range, tags). Popover uses glassmorphism rule: `surface_variant` 70% opacity + `backdrop-blur-20px`.

**Filter Chip Categories (auto-extracted from collection assets):**
- Media type: `RAW`, `VIDEO`, `IMAGE` — always shown if relevant types exist.
- Camera model: top 3 cameras used in collection (from `technical.cameraModel`).
- Location/tags: top 3 shoot tags.
- Date range: not a chip — accessible via `[+ Add]` → date range picker.

**Chip persistence:** Applied chips survive page refresh via URL params (`?type=raw&camera=Canon+R5`). Server renders with these filters applied on first load.

**View Mode Toggle (right side):**
- Three icon buttons: Masonry (`LayoutMasonry`), Compact Grid (`LayoutGrid`), Timeline (`AlignJustify`).
- Active state: `bg-gallery-gold/10 text-gallery-gold rounded-xl`.
- Persists in `localStorage` keyed to `collectionViewMode`.

---

### 3.3 Content Area

#### View Mode: Masonry (default)

Variable-height columns, 2–4 columns depending on viewport. Uses the existing `MasonryGrid` component.

- **Desktop (≥1280px):** 4 columns, 12px gap.
- **Tablet (768–1279px):** 3 columns, 10px gap.
- **Mobile (< 768px):** 2 columns, 8px gap.

Masonry respects the image's natural aspect ratio — no forced crop. Portrait shots remain portrait.

#### View Mode: Compact Grid

Uniform square tiles. Space-efficient for large sets.

- **Desktop:** 6 columns, 6px gap.
- **Tablet:** 4 columns, 6px gap.
- **Mobile:** 3 columns, 6px gap.

Tiles use fixed aspect ratio `1:1`, `object-cover`. Image metadata overlays on hover (file type chip in `Rubik Mono One`). Uses `ROUND_SIXTEEN` corners matching `MediaCard`.

**Compact grid card anatomy:**
```
┌──────────┐
│          │
│  [IMAGE] │  ← object-cover square
│          │
│░░░░░░░░░░│  ← hover: translucent bottom strip
│ name  RAW│  ← font-inter title-sm + Rubik Mono One type badge
└──────────┘
```

#### View Mode: Timeline Grouping

Chronological grouping by capture date. Reuses the existing `TimelineStream` + `GroupHeader` components.

- Groups: Year → Month → Day (auto-collapses year if only one year present).
- Group headers are `sticky` within the scroll container (`position: sticky; top: 72px + filter-bar-height`). They use a tonal background shift (not a line) to separate temporal zones.
- Within each group: masonry layout (inherits current masonry column count).

**Group Header anatomy:**
```
┌─ AUGUST 2024 ────────────────── 143 assets ─┐
│  [select group]                              │
└──────────────────────────────────────────────┘
```

---

### 3.4 Infinite Scroll / Pagination

Handles 1000s of assets without degrading performance.

**Strategy:** Virtual infinite scroll with page-based API fetching.
- Initial load: 48 assets (existing).
- Intersection Observer fires when user reaches 80% of current batch → fetches next 48.
- A `loading` skeleton shimmer row appears at the bottom while fetching.
- Total count is always shown in the collection header — the user knows the full scale upfront.

**Filter changes:** Changing a chip filter resets to page 1 and updates URL params. No hard page reload — client-side state update + server action fetch.

**Timeline mode pagination:** Groups load progressively. If a group spans many assets, within-group pagination loads in batches of 48, showing a "Load more in [month]" trigger.

---

### 3.5 Empty States

Three distinct states, each with a clear action:

1. **Empty collection (no assets match filter query):**
   - Icon: `Sparkles` in `bg-gallery-gold/10` circle, `ROUND_SIXTEEN`.
   - Heading: "Nothing here yet" (Inter, medium).
   - Sub: "This collection's rules haven't matched any assets in your archive."
   - CTA: `[Edit Collection Rules]` — opens rule editor.

2. **Filter chips produce zero results:**
   - Icon: `FilterX` icon.
   - Heading: "No assets match these filters."
   - Sub: "Try removing a filter chip to broaden your view."
   - CTA: `[Clear Filters]` — resets chip state.

3. **Manual collection with no manual includes:**
   - Icon: `Plus` in circle.
   - Heading: "Add assets to get started."
   - CTA: `[Pick Assets]` — opens MediaPickerModal.

---

## 4. Transitions & Animation

**Collection card → expanded view (entry):**
- The clicked collection card performs a **shared element transition** (View Transitions API where supported, Framer Motion fallback).
- The card expands from its grid position, morphing into the full header zone. Duration: 350ms, ease-out.
- On browsers without View Transitions: fade-in + slide-up of header (150ms), content fades in at 200ms delay. Uses `framer-motion` `AnimatePresence` + `motion.div`.

**Filter chip toggle:**
- Chip activates with a scale `1.0 → 1.04 → 1.0` spring on tap. Background transitions `300ms ease`.
- The asset grid below cross-fades on filter change: `opacity 0 → 1` over 200ms. Grid items stagger-in at 20ms intervals (first 20 items only — avoids jank on large sets).

**View mode switch:**
- Grid → Masonry / Masonry → Grid: items animate from their current position to new position using `layout` prop in Framer Motion (FLIP technique). Duration: 250ms.
- Timeline switch: existing `TimelineStream` fade-in, 200ms.

**Back navigation:**
- Reverse of entry: header shrinks back to card dimensions (if View Transitions supported), otherwise fade out + navigate.

**Scroll:**
- Sticky header appearance: glass effect fades in (`backdrop-blur`) only after scroll > 20px. Prevents visual noise at top of page.

---

## 5. Selection & Bulk Actions

Selection mode is inherited from the existing `MediaGrid` selection pattern. No redesign needed, but the following additions are required in collection context:

**Selection toolbar additions (when `collectionContext` is set):**
- `[Remove from Collection]` — removes selected from `manualIncludes` (for manual collections) or adds to `manualExcludes` (for filter-based collections). Icon: `PinOff`.
- `[Add to Another Collection]` — opens `BulkAddToCollectionModal`.

**Selection toolbar layout (mobile):**
- Collapses into a bottom sheet that slides up from the viewport bottom.
- Shows count + primary actions. Overflow goes into a `···` sheet.

---

## 6. Asset Detail Modal Behavior

When an asset is tapped/clicked, the `AssetViewer` (already exists) opens as a full-screen modal overlay — collection context is preserved underneath. No navigation change.

**Additions for collection context:**
- The modal's navigation arrows (`←` / `→`) traverse assets in the **currently filtered collection view** order (not the global archive order).
- A breadcrumb within the modal: `[Collection Name] → [Asset Name]` — links back to the collection view on close.
- Keyboard: `Esc` closes modal, returns focus to triggering card (existing behavior).

---

## 7. Responsive Behavior

### Mobile (< 768px)

- **Header:** Collapses to 2 lines: line 1 = back nav + collection name, line 2 = asset count + action icons. Max height `96px`.
- **Filter chips:** Horizontal scroll strip. `overflow-x: auto; scrollbar-none`. The `[+ Add]` chip is always visible at the end (sticky within the scroll strip via `position: sticky; right: 0` + gradient fade).
- **View mode toggle:** Hidden by default. Accessible via `···` menu in the header.
- **Default view mode:** Compact grid (2 columns) on mobile — more efficient than masonry on narrow viewports.
- **Selection toolbar:** Bottom sheet (see §5).

### Tablet (768–1279px)

- Header single-line. Filter chips wrap to 2 rows if needed.
- View mode toggle visible.
- Masonry: 3 columns.

### Desktop (≥1280px)

- Full layout as described in §3.

---

## 8. Light & Dark Mode

All tokens use the design system semantic layer — no hardcoded hex values in components:

| Element | Light | Dark |
|---|---|---|
| Page background | `#ffffff` | `#111111` |
| Sticky header bg | `rgba(255,255,255,0.92) + blur` | `rgba(17,17,17,0.92) + blur` |
| Filter chip inactive | `#eeeeee` text `#1a1c1c/50` | `#1e1e1e` text `#e8e8e8/50` |
| Filter chip active | `#d79922/15` border `#d79922/30` | same (gold is mode-agnostic) |
| Group header bg | `#f3f3f4` | `#1a1a1a` |
| Card bg | `#f9f9f9` | `#1c1c1c` |
| Asset count number | `#d79922` | `#d79922` |

Dark mode uses the Tailwind `dark:` prefix on all classes. No separate stylesheet.

---

## 9. Filter Chip Data Source

Chips are dynamically derived from the collection's asset corpus. On collection page load (server-side):

```typescript
// Pseudo-code for server-side chip data extraction
const chipData = await extractChipSuggestions(collectionAssets)
// Returns:
{
  mediaTypes: ['RAW', 'VIDEO'],          // distinct mimeType domains
  cameras: ['Canon R5', 'Sony A7IV'],    // top 5 by frequency
  tags: ['Iceland', 'Aerial', 'Forest'], // top 5 manual tags
}
```

Chips are passed to the client as props. They don't require a separate API call on filter toggle — the URL params are applied server-side on each navigation.

**Chip filter application logic (server):**
- `?type=raw` → adds `{ mimeType: { like: 'image/x-raw%' } }` to the query `where`.
- `?type=video` → `{ mimeType: { like: 'video/%' } }`.
- `?camera=Canon+R5` → `{ 'technical.cameraModel': { equals: 'Canon R5' } }`.
- Multiple chips: `AND` conjunction.
- Chips are applied on top of the collection's existing `filterQuery`.

---

## 10. Component Tree

```
CollectionDetailPage (Server Component)
  ├─ CollectionHeader (Server + partial hydration for Edit/Actions)
  │    ├─ BackLink
  │    ├─ CollectionIdentity (icon, name, badge)
  │    └─ CollectionActions (Edit Rules, overflow menu)
  ├─ FilterBar (Client Component — chip interaction)
  │    ├─ FilterChip[] (type, camera, tag chips)
  │    ├─ FilterAddPopover (date range, custom field)
  │    └─ ViewModeToggle
  └─ CollectionAssetGrid (Client Component — wraps existing MediaGrid)
       ├─ MasonryGrid | CompactGrid | TimelineStream (view mode switch)
       ├─ InfiniteScrollObserver
       └─ SelectionToolbar (collection-context additions)
```

---

## 11. Existing Components to Reuse

| Need | Existing Component |
|---|---|
| Asset cards | `MediaCard.tsx` — no changes needed |
| Masonry layout | `MasonryGrid.tsx` — no changes needed |
| Timeline grouping | `TimelineStream.tsx` + `GroupHeader.tsx` |
| Selection mode | `MediaGrid.tsx` selection state — extract to shared hook |
| Asset detail modal | `AssetViewer` + `MediaDetailModal.tsx` |
| Collection rule editor | `CollectionRuleEditor.tsx` |
| Asset picker | `MediaPickerModal.tsx` |
| Bulk collection add | `BulkAddToCollectionModal.tsx` |

The `MediaGrid.tsx` component currently conflates the library discovery header, status filter bar, and grid rendering. For the expanded view, these concerns should be separated — the `CollectionDetailPage` owns the header and filter bar; `MediaGrid` (or a new `CollectionAssetGrid`) owns only the asset rendering and selection mechanics.

---

## 12. Performance Constraints

- **1000+ asset collections:** Must not block on full dataset load. Initial render is 48 assets; all others lazy-loaded.
- **Masonry reflow:** When infinite scroll appends assets, the masonry column layout should not reflow existing items — append-only. Use CSS columns or a virtual masonry approach.
- **Filter chip change:** Should feel instant. Target < 300ms for filter change to new grid render (URL navigation + server component re-render on Next.js 15 is typically 150–250ms on warm cache).
- **Animation:** Framer Motion `layout` animations are CPU-intensive on large grids. Only animate the first viewport's items (first 20) on mode switch — items below the fold swap without animation.
- **Image loading:** Use `loading="lazy"` + `sizes` attribute tuned to the column count per view mode. Blur placeholder (`blurDataURL`) for perceived performance on slow connections.

---

## 13. Accessibility

- Collection header landmark: `<header role="banner">` — accessible label: `aria-label="{collectionName} collection"`.
- Filter chips: `<button role="checkbox" aria-checked={active}>` in a `role="group" aria-label="Filter by"` wrapper.
- View mode toggle: `role="radiogroup"` with `aria-label="View mode"`. Each toggle: `role="radio"`.
- Keyboard navigation: Tab order follows visual order. Filter chips are navigable with arrow keys within the chip group.
- Focus trap: Asset detail modal traps focus (existing `AssetViewer` behavior).
- Reduced motion: All animations respect `prefers-reduced-motion: reduce` — transitions set to `duration: 0` when enabled.
- Contrast: All text against backgrounds meets WCAG AA (4.5:1 minimum). Gold accent text (`#d79922`) only used for decorative numbers, not body text.

---

## 14. Open Questions (for implementation review)

1. **View Transitions API:** Browser support ~73% as of 2025. Fallback to Framer Motion is defined. Confirm whether we gate on `document.startViewTransition` availability.
2. **Chip filter server action vs. navigation:** Should filter changes use `router.push()` (URL nav, server re-render) or a client-side server action + `useOptimistic`? Recommendation: URL navigation (simpler, sharable URLs, back-button works).
3. **Compact grid vs. existing MediaCard:** `MediaCard` has variable height and metadata panels. A separate `CompactMediaCard` may be needed for the compact grid square variant to avoid layout awkwardness.
4. **Shared element transition scope:** View Transitions API requires a unique `view-transition-name` per card. At 48 cards, this is fine. At 1000, names must be scoped to viewport-visible cards only.
5. **Chip extraction performance:** Running `extractChipSuggestions` on 1000+ asset collections at request time may be slow. Consider caching chip metadata on the `SmartCollection` document (a denormalized `chipCache` field updated by an afterChange hook on Media).

---

## 15. Success Criteria Mapping

| Acceptance Criterion | Implementation |
|---|---|
| Expansion preserves navigation context | Sticky header always visible; back nav restores scroll position |
| Responsive across devices | §7 responsive breakpoints; mobile bottom-sheet selection |
| Filters persist while browsing | URL params + `localStorage` for view mode |
| Collection transitions animated smoothly | §4 shared element + Framer Motion fallback |
| Handle 1000s of assets | Infinite scroll, 48-asset batches, append-only masonry |
| Mobile responsive | §7 mobile layout; compact grid as mobile default |
| Follow design.md styling | All tokens, no 1px borders, ROUND_SIXTEEN+, gold accents, glassmorphism |
| Light and dark modes | Tailwind `dark:` variants on all elements |
| Space efficient, easily understandable | Compact grid mode; filter chips surface discoverability; clear empty states |
