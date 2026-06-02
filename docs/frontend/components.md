# Component Library Reference

## Directory Structure

```
src/components/
├── ui/                    # Primitive UI components (Radix + shadcn-style)
├── Gallery/               # Media library and upload workbench
├── Portfolio/             # Public portfolio viewer
├── Portfolios/            # Dashboard portfolio management
├── SmartCollections/      # Collection management UI
├── AssetViewer/           # Full-screen asset detail viewer
├── Sessions/              # Ingest session management
├── Collections/           # Manual collection components
├── layout/                # Layout scaffolding (DashboardLayout, etc.)
├── forms/                 # Auth forms
├── Header/                # Site header
├── Footer/                # Site footer
├── Media/                 # CMS media renderer
└── [Feature components]   # See list below
```

---

## UI Primitives (`src/components/ui/`)

These are Radix UI-based primitives styled to the Curated Gallery design system. Add new primitives here following the same pattern.

| Component | Description |
|-----------|-------------|
| `accordion.tsx` | Collapsible accordion sections (Radix `Accordion`) |
| `badge.tsx` | Status/label badge chip |
| `button.tsx` | Primary button with variant + size props |
| `calendar.tsx` | Date picker calendar (Radix + react-day-picker) |
| `card.tsx` | Surface card with header/content/footer slots |
| `carousel.tsx` | Embla-powered horizontal carousel |
| `checkbox.tsx` | Styled checkbox (Radix `Checkbox`) |
| `combobox.tsx` | Searchable select dropdown |
| `date-picker.tsx` | Date picker composed from `calendar.tsx` + `popover.tsx` |
| `dialog.tsx` | Modal dialog (Radix `Dialog`) |
| `dropdown-menu.tsx` | Context/action menu (Radix `DropdownMenu`) |
| `field-input.tsx` | Labelled input with error state |
| `input.tsx` | Base text input |
| `label.tsx` | Form label |
| `location-search.tsx` | Location autocomplete input |
| `navigation-menu.tsx` | Radix navigation menu |
| `pagination.tsx` | Page navigation controls |
| `popover.tsx` | Floating popover (Radix `Popover`) |
| `progress.tsx` | Linear progress bar (Radix `Progress`) |
| `search-input.tsx` | Search input with clear button |
| `select.tsx` | Native-style select (Radix `Select`) |
| `separator.tsx` | Horizontal/vertical divider |
| `sheet.tsx` | Side drawer (Radix `Dialog` as bottom/side sheet) |
| `sonner.tsx` | Sonner toast container configuration |
| `tag-input.tsx` | Multi-tag input with add/remove |
| `textarea.tsx` | Multi-line text input |
| `feature197.tsx` | Feature flag / hero marketing component |

---

## Feature Components

### Gallery (`src/components/Gallery/`)

Core of the media library experience on `/dashboard/library`.

| Component | Description |
|-----------|-------------|
| `IngestionWorkbench.tsx` | Top-level upload entry point — file drop zone, staged files list, "Start Archival Ingest" trigger |
| `ArchivalProgressOverlay.tsx` | Full-screen overlay shown during active upload batch — progress bars, per-item status |
| `MediaCard.tsx` | Grid thumbnail card — uses URL fallback chain (`thumbnailUrl \|\| proxyUrl \|\| originalUrl \|\| url`), processing state badge |
| `index.tsx` (LibraryView) | Main library page — search, filters, media grid, pagination |
| `MediaGrid.tsx` | Responsive CSS grid of `MediaCard` components |
| `MasonryGrid.tsx` | Masonry layout variant for the media grid |
| `MediaDetailModal.tsx` | Inline detail modal for a single asset |
| `UploadModal.tsx` | Upload dialog wrapper |
| `UploadQueueWidget.tsx` | Floating upload progress widget |
| `TimelineStream.tsx` | Chronological stream of recently ingested media |
| `BulkEditTagsModal.tsx` | Bulk tag editor for selected media |
| `SafetyLockDeleteModal.tsx` | Confirmation modal for destructive delete with safety lock |
| `SaveViewModal.tsx` | Save current filter view as a smart collection |
| `GroupHeader.tsx` | Section header for grouped media views |
| `EmptyState.tsx` | Empty state illustration + CTA |
| `cards/CardIdentityBar.tsx` | Bottom bar of a MediaCard — filename, type |
| `cards/CardMetadataPanel.tsx` | Hover-revealed metadata panel on a card |
| `cards/CardTopBadges.tsx` | Top-left badge overlay (processing status, media type) |

### AssetViewer (`src/components/AssetViewer/`)

Full-screen asset detail viewer, opened from the library or collection views.

| Component | Description |
|-----------|-------------|
| `index.tsx` | Root viewer — keyboard navigation, layout shell |
| `MediaStage.tsx` | Image or video render area |
| `ProgressiveImage.tsx` | Blur-up progressive image loader |
| `VideoStub.tsx` | Video player placeholder |
| `MetadataPanel.tsx` | EXIF/technical metadata sidebar |
| `NavControls.tsx` | Previous/next asset navigation |
| `ActionBar.tsx` | Top action bar — download, add to collection, delete |

### Portfolios (`src/components/Portfolios/`)

Dashboard portfolio management. Divided into list, editor, wizard, and reviews.

**Wizard** (`wizard/`):

| Component | Description |
|-----------|-------------|
| `PortfolioWizardPage.tsx` | Multi-step wizard shell for `/dashboard/portfolios/new` |
| `WizardStepMetadata.tsx` | Step 1 — title, description, client info |
| `WizardStepTheme.tsx` | Step 2 — theme picker |
| `WizardStepSectionLayout.tsx` | Step 3 — section layout selection |
| `WizardStepAssetTray.tsx` | Step 4 — asset picker and ordering |
| `WizardStepOverrides.tsx` | Step 5 — per-asset focal point and caption overrides |
| `WizardStepShare.tsx` | Step 6 — share settings, password gate, slug |
| `SectionLane.tsx` | Individual section lane in the asset tray |
| `SectionLaneHeader.tsx` | Section lane header with layout controls |
| `AssetPickerSheet.tsx` | Bottom sheet for picking assets from the library |
| `AutoParseBar.tsx` | AI-assisted section name inference |
| `FocalPointCanvas.tsx` | Canvas-based focal point drag tool |
| `VideoThumbnailControls.tsx` | Video poster frame selection |

**Editor / List / Reviews:**

| Component | Description |
|-----------|-------------|
| `PortfolioEditorPage.tsx` | Full portfolio editor for existing portfolios |
| `PortfolioListPage.tsx` | Grid list of all portfolios |
| `reviews/PortfolioReviewsPage.tsx` | View and manage client review submissions |

### Portfolio Viewer (`src/components/Portfolio/`)

Public-facing viewer at `/p/[slug]`.

| Component | Description |
|-----------|-------------|
| `PortfolioRenderer.tsx` | Top-level renderer — resolves layout and section types |
| `PortfolioThemeProvider.tsx` | Applies per-portfolio theme tokens |
| `PortfolioLightbox.tsx` | Full-screen lightbox for portfolio images |
| `Lightbox.tsx` | Base lightbox primitive |
| `LightboxTrigger.tsx` | Trigger wrapper for opening the lightbox |
| `PasswordGate.tsx` | Password entry screen for protected portfolios |
| `SectionNavigator.tsx` | Side nav for multi-section portfolios |
| `FilmstripRow.tsx` | Horizontal filmstrip section layout |
| `MasonryGrid.tsx` | Masonry section layout |
| `UniformGrid.tsx` | Uniform grid section layout |
| `MotionContainer.tsx` | Framer Motion wrapper for animated entrances |
| `AdminSupportOverlay.tsx` | Overlay shown to admins for support diagnostics |

**Review mode** (`review/`):

| Component | Description |
|-----------|-------------|
| `ReviewModeProvider.tsx` | Context for client review session state |
| `ClientIdentificationModal.tsx` | Client name/email entry before review |
| `SelectionModePill.tsx` | Pill toggle to activate selection mode |
| `SelectionCheckbox.tsx` | Per-asset selection checkbox |
| `SelectionBar.tsx` | Bottom bar showing selection count and actions |
| `CommentPanel.tsx` | Per-asset comment input |
| `SubmitSelectionSheet.tsx` | Final submission sheet for selected assets |
| `DownloadSheet.tsx` | Download selected assets sheet |

### SmartCollections (`src/components/SmartCollections/`)

| Component | Description |
|-----------|-------------|
| `SmartCollectionsView.tsx` | Top-level collections page view |
| `CollectionsGrid.tsx` | Grid of `CollectionCard` components |
| `CollectionCard.tsx` | Individual collection card with preview strip |
| `NewCollectionCard.tsx` | CTA card for creating a new collection |
| `CollectionDetailHeader.tsx` | Header for collection detail page |
| `CollectionGroupSection.tsx` | Grouped section of collections |
| `CollectionRuleEditor.tsx` | Rule-based filter editor for smart collections |
| `RuleRow.tsx` | Single rule row (field + operator + value) |
| `ManualOverridesPanel.tsx` | Panel for adding manual media overrides |
| `MediaPickerModal.tsx` | Modal for picking media to add to a collection |
| `CollectionPickerPopover.tsx` | Popover for selecting a target collection |
| `BulkAddToCollectionModal.tsx` | Bulk-add selected media to a collection |
| `PreviewStrip.tsx` | Horizontal strip of preview thumbnails |

### Sessions (`src/components/Sessions/`)

| Component | Description |
|-----------|-------------|
| `SessionsView.tsx` | Session list page |
| `SessionsClient.tsx` | Client shell with filter/sort state |
| `SessionCard.tsx` | Individual session card |
| `SessionEditPanel.tsx` | Inline edit panel for session metadata |
| `SessionDetailActions.tsx` | Action buttons on a session detail page |

---

## Blocks System (`src/blocks/`)

Blocks are CMS-authored content sections rendered inside Page documents. Each block has:
- `config.ts` — Payload field config, registered in `payload.config.ts`
- `Component.tsx` — React server component that renders the block
- `Component.client.tsx` — client island if the block needs interactivity

`src/blocks/RenderBlocks.tsx` is the dispatcher — it receives the `blocks` array from a Page and renders the correct component for each `blockType`.

| Block | Purpose |
|-------|---------|
| `Banner` | Alert/callout banner with icon and rich text |
| `CallToAction` | CTA section with heading, body, and button(s) |
| `Carousel` | Auto-playing image/content carousel |
| `Code` | Syntax-highlighted code block with copy button |
| `Content` | Rich text content column(s) |
| `ArchiveBlock` | Paginated archive of a collection (articles, etc.) |
| `ArticleGrid` | Grid of article cards (for `/learn`) |
| `TutorialGrid` | Grid of tutorial cards (for `/learn`) |
| `DownloadGrid` | Grid of downloadable resources |
| `Form` | Embeds a Payload Form collection entry with field types: Text, Textarea, Email, Number, Select, Checkbox, Country, State |
| `MediaBlock` | Full-width media embed (image or video) |
| `Pricing` | Pricing tiers pulled from the Pricing global |
| `SprocketDivider` | Decorative section divider |
| `ThreeItemGrid` | Three-column feature/item grid |
| `About3` | Three-column about/team section |

---

## Hero Types (`src/heros/`)

Heroes are top-of-page sections rendered from the Page collection's `hero` field.

| Hero | File | Use |
|------|------|-----|
| `HighImpact` | `HighImpact/` | Full-bleed image with overlay text — primary landing pages |
| `MediumImpact` | `MediumImpact/` | Image + text side-by-side |
| `LowImpact` | `LowImpact/` | Text-only header, minimal height |

`src/heros/RenderHero.tsx` dispatches to the correct hero based on `hero.type`.

---

## Creating a New Component

1. **Decide Server vs Client.** If no browser APIs, state, or event handlers are needed → Server Component.
2. **Choose the right directory.** Match the feature domain (`Gallery/`, `Portfolio/`, `SmartCollections/`, etc.) or create a new named folder.
3. **File naming.**
   - `ComponentName/index.tsx` for components with multiple sub-files.
   - `ComponentName.tsx` for single-file components colocated in a feature folder.
   - `ComponentName.client.tsx` for client islands paired with a server shell.
4. **Props interface.** Define a named `Props` or `ComponentNameProps` type in the same file.
5. **No inline styles.** Use Tailwind utility classes only. Follow DESIGN.md tokens.

```tsx
// Server Component (default)
import type { Media } from '@/payload-types'

type Props = {
  asset: Media
}

export function AssetThumbnail({ asset }: Props) {
  const src = asset.thumbnailUrl ?? asset.proxyUrl ?? asset.originalUrl ?? asset.url
  return <img src={src ?? ''} alt={asset.title ?? asset.filename ?? ''} />
}
```

```tsx
// Client Component
'use client'

import { useState } from 'react'

export function ExpandableCaption({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <p onClick={() => setExpanded(!expanded)}>
      {expanded ? text : text.slice(0, 100)}
    </p>
  )
}
```

---

## When to Use Radix Primitives vs Custom Components

| Scenario | Approach |
|----------|---------|
| Dialog / modal | `src/components/ui/dialog.tsx` (wraps Radix `Dialog`) |
| Dropdown menu / context menu | `src/components/ui/dropdown-menu.tsx` |
| Popover (tooltips, pickers) | `src/components/ui/popover.tsx` |
| Bottom / side drawer | `src/components/ui/sheet.tsx` |
| Select / combobox | `src/components/ui/select.tsx` or `combobox.tsx` |
| Simple styled div | Custom Tailwind component — no Radix needed |
| Animation / motion | Framer Motion (`MotionContainer.tsx` pattern) |

Do not reach for Radix directly in feature components — always go through the `ui/` wrapper so styling is consistent.

---

## Accessibility Requirements

- All interactive elements must be keyboard-navigable (tab order, `Enter`/`Space` activation).
- Use semantic HTML: `<button>` not `<div onClick>`, `<nav>`, `<main>`, `<section>` with `aria-label`.
- Images must have `alt` text — for decorative images use `alt=""`.
- Color alone must never convey meaning — pair with text or icon.
- Modals must trap focus and restore focus on close (Radix handles this automatically).
- Radix primitives expose correct ARIA roles by default — do not override `role` unless necessary.
- Minimum touch target: 44x44px for all interactive elements on mobile.
