> **IMPLEMENTATION STATUS: FULLY IMPLEMENTED** — Audited against codebase 2026-06-02.
>
> **Key deviations / implementation notes:**
> - Route isolation is confirmed: viewer lives in `src/app/(portfolio)/p/[slug]/` — separate route group with no site chrome.
> - `PasswordGateClient.tsx` handles password unlock flow at `/p/[slug]`.
> - Portfolio components in `src/components/Portfolio/`: `PortfolioRenderer.tsx`, `PortfolioThemeProvider.tsx`, `PortfolioLightbox.tsx`, `MasonryGrid.tsx`, `FilmstripRow.tsx`, `UniformGrid.tsx`, `SectionNavigator.tsx`, `MotionContainer.tsx`, `Lightbox.tsx`, `LightboxTrigger.tsx`.
> - Review mode overlay is implemented via `src/components/Portfolio/review/` — see [`FRH-62-client-review-portal.md`](FRH-62-client-review-portal.md).
> - `AdminSupportOverlay.tsx` exists for admin diagnostic overlay mode.
> - The `(portfolio)` route group has its own `layout.tsx` with no Header/Footer — as specced.
>
> **Key files:** `src/app/(portfolio)/`, `src/components/Portfolio/`, `src/app/(portfolio)/p/[slug]/page.tsx`

---

# FRH-58: Portfolio Public Viewer — Bespoke Frontend Spec

**Version:** 2.0 (post-review revision)  
**Status:** Approved for implementation  
**Branch:** FRH-58-Portfolio-Creation-Wizard  
**Ticket:** FRH-58 — Portfolio Public Viewer (Bespoke Frontend)

---

## 1. Executive Summary

The portfolio public viewer is the end-client-facing surface of Framehouse Hub. It is the moment where a creative's work is revealed to a client, a hiring manager, or a gallery director. This spec defines the **bespoke frontend viewer** — a standalone, immersive page experience that replaces the current MVP implementation at `/p/[slug]` (which lives inside the `(app)` route group and inherits the site header/footer/admin bar).

The core design principle: **the interface should disappear, leaving only the work.** The creator sets the rules. The client consumes without distraction.

### What Exists Today (MVP Baseline)

The current `/src/app/(app)/p/[slug]/page.tsx` provides:
- Server-side access control (public / shared / private / draft)
- HMAC-validated preview tokens
- HTTP-only unlock cookies for password-gated portfolios
- `PortfolioThemeProvider` injecting CSS variables (`--portfolio-bg`, `--portfolio-text`, `--portfolio-accent`)
- `PortfolioRenderer` processing `layoutBlocks` into `MasonryGrid`, `FilmstripRow`, `UniformGrid`
- Basic `Lightbox` component (no swipe, no keyboard navigation beyond escape)
- Portfolio header (slug breadcrumb, title, subheading) and footer

### What This Spec Defines

1. **Route isolation** — migrate viewer to its own `(portfolio)` route group, eliminating site chrome
2. **Immersive layout** — full-bleed, edge-to-edge experience controlled entirely by the creator's theme
3. **Responsive layout fidelity** — strict cascade rules for each layout type on each viewport tier
4. **High-fidelity lightbox** — swipe, keyboard, section-scoped traversal, pinch-to-zoom
5. **Progressive media loading** — blur-up placeholders, IntersectionObserver lazy loading
6. **Section navigation** — scroll-aware sticky TOC for portfolios with multiple named sections
7. **Download protection** — pointer-event shields, right-click intercept, context menu suppression
8. **Payload CMS admin access** — admin overlay for support and QA workflows
9. **Performance contracts** — LCP < 2.5s, CLS < 0.1, INP < 200ms on p75

---

## 2. Architecture: Route Isolation

### Current Problem

`/src/app/(app)/p/[slug]/page.tsx` inherits the `(app)` layout which includes:
- `<Header>` (site navigation, logo, login links)
- `<Footer>` (site footer)
- `<AdminBar>` (Payload live-preview toolbar)
- Global CSS from `globals.css` (app-level styles)

This leaks site chrome into what should be a standalone immersive experience. The `<article>` currently uses `-mt-24 sm:-mt-32` as a hack to pull content behind the fixed header — a fragile workaround.

### Target Architecture

```
src/app/
├── (app)/               ← site shell (unchanged)
│   └── p/[slug]/        ← REMOVED from here
├── (portfolio)/         ← NEW: standalone, no site chrome
│   ├── layout.tsx       ← Minimal: fonts, globals, metadata providers only
│   └── p/
│       └── [slug]/
│           ├── page.tsx                ← Server component (access control, data fetch)
│           ├── PortfolioViewerClient.tsx  ← Client hydration shell
│           └── PasswordGateClient.tsx     ← Moved from (app)
└── (dashboard)/         ← unchanged
```

**`(portfolio)/layout.tsx`** contains only:
- Font loading (Inter, Rubik Mono One, Varela Round via `next/font`)
- `<html lang="en">` with `<body>` — no `<Header>`, no `<Footer>`, no `<AdminBar>`
- The `PortfolioThemeProvider` wrapping (theme CSS vars injected at body level)
- An optional `AdminSupportOverlay` component (see §8)

**Routing**: The slug-based URL `/p/[slug]` is preserved for backwards compatibility with shared links.

---

## 3. Visual Design: The Immersive Viewer

### 3.1 Full-Bleed Canvas

The portfolio page occupies the full viewport. No outer margin, no site navigation chrome. The creator's `backgroundColor` (from `theme.backgroundColor`) fills the `<body>` background. The page scrolls vertically.

```
┌─────────────────────────────────────────────────────┐
│  [PREVIEW BANNER — exhibition red, 44px, if token]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  PORTFOLIO HEADER                                   │
│  ─────────────────────────────────────────────────  │
│  [slug breadcrumb — accent, 10px, 0.5em tracking]  │
│                                                     │
│  TITLE                                              │
│  8xl / 9xl on large — tight tracked Inter           │
│                                                     │
│  subheading                                         │
│  xl / uppercase / 0.2em tracking / 50% opacity     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [SECTION NAV — sticky, fades in after scroll]     │
├─────────────────────────────────────────────────────┤
│  LAYOUT BLOCKS                                      │
│  (masonry / filmstrip / uniform_grid / text /       │
│   featured / spacer — as defined by creator)        │
│                                                     │
│  ...                                                │
│                                                     │
├─────────────────────────────────────────────────────┤
│  PORTFOLIO FOOTER                                   │
│  copyright · powered by Framehouse                  │
└─────────────────────────────────────────────────────┘
```

### 3.2 Typography & Color System

All colors reference the CSS variables injected by `PortfolioThemeProvider`:

| Token | CSS Var | Usage |
|---|---|---|
| Background | `--portfolio-bg` | `<body>` background, section fills |
| Text | `--portfolio-text` | All prose, labels, headings |
| Accent | `--portfolio-accent` | Section headers, dividers, breadcrumb, focus rings |

Font pairing classes applied to `<body>`:

| Creator Setting | Font Class | Stack |
|---|---|---|
| `modern-sans` | `font-sans` | Inter, system-ui |
| `classic-serif` | `font-serif` | Georgia, serif |
| `tech-mono` | `font-mono` | Rubik Mono One, monospace |

The **portfolio title** always uses tight tracked Inter (`tracking-[-0.02em]`) regardless of font pairing, preserving the editorial large-format feel defined in DESIGN.md.

### 3.3 Section Navigation (Sticky TOC)

For portfolios with **≥ 2 named grid sections** (`showSectionHeader: true`), a sticky section navigator appears on the right edge of the viewport after the user scrolls past the portfolio header.

```
                                   ┌──────────────────┐
                         viewport → │  [section nav]   │
                              right │  · Campaign 2024 │ ← active anchor (accent color)
                              20px  │  · Editorial     │
                              from  │  · Behind Scenes │
                              edge  └──────────────────┘
```

Behaviour:
- **Desktop (≥ 1024px)**: Vertical pill on right edge, absolute positioned within `position: sticky` container. Each item is the section anchor text, truncated at 18 chars.
- **Mobile (< 768px)**: Hidden. Navigation is by scroll only.
- **Tablet (768–1023px)**: Collapsed to a single floating indicator dot showing "Section N of M". Tapping expands a bottom sheet with all section names.
- **Active state**: Determined by `IntersectionObserver` on each `<section id="...">`. The anchor whose section occupies the most vertical viewport area is highlighted with `--portfolio-accent` color.
- **Scroll behaviour**: Clicking a section name smooth-scrolls to the anchor with `scrollMarginTop: 80px` (respects preview banner if present).
- **Fade in**: Navigator is invisible until user scrolls past `headerHeight + 100px`. Uses `opacity` + `transform: translateX` CSS transition (150ms ease-out).

### 3.4 Portfolio Footer

Minimal footer. Creator-themed. Contains:
- Copyright line: `© {year}` in 10px uppercase tracking
- "Powered by Framehouse Hub" (optional, can be suppressed via admin config in future)
- If `visibility === 'shared'`: a lock icon with "Protected Gallery" label

No social share buttons, no external links. Pure closing mark.

---

## 4. Responsive Layout Fidelity

The creator sets the layout. The viewer's job is to translate it faithfully across viewport breakpoints without compromising the creator's intent.

### 4.1 Viewport Tiers

| Tier | Breakpoint | Target Devices |
|---|---|---|
| Mobile S | < 480px | iPhone SE, Galaxy A |
| Mobile L | 480–767px | iPhone 14/15, Pixel |
| Tablet | 768–1023px | iPad mini, iPad 9th gen |
| Tablet L | 1024–1279px | iPad Pro 11", Surface Pro |
| Desktop | 1280–1535px | 13" MacBook, 1080p monitors |
| Desktop XL | ≥ 1536px | 27" iMac, 4K displays |

### 4.2 Grid Block — Uniform Grid Cascade

The `uniformGridColumns` value set by the creator cascades under narrow viewports. The creator's intent for desktop is honoured as closely as possible, but physical tap targets (minimum 44px wide) are never compromised.

| Creator Setting | Desktop | Tablet | Mobile L | Mobile S |
|---|---|---|---|---|
| 4 columns | 4 col | 3 col | 2 col | 2 col |
| 3 columns | 3 col | 3 col | 2 col | 1 col |
| 2 columns | 2 col | 2 col | 2 col | 1 col |

**Aspect ratio preservation**: Every cell maintains the `aspect-ratio` of its original media. The CSS grid uses `grid-template-columns: repeat(N, 1fr)` with `aspect-ratio` on each cell. Resizing the viewport recalculates column widths but keeps heights proportional — no layout shift.

**Gap scaling**: The creator's `spacing` value maps to `gap` values that also scale:

| Spacing | Desktop | Mobile |
|---|---|---|
| `none` | 0px | 0px |
| `small` | 4px | 2px |
| `medium` | 12px | 6px |
| `large` | 24px | 12px |

### 4.3 Masonry Grid Cascade

The masonry layout (`layoutStyle: 'masonry'`) uses a justified-row algorithm. On desktop, rows fill the full container width at the creator-specified height. On mobile:

- **Desktop / Tablet L**: Justified rows (current `MasonryGrid` behaviour)
- **Tablet**: Reduced row height, wider gutters suppressed
- **Mobile**: Falls back to a **single-column vertical stack**. Each image occupies full width, preserving its natural aspect ratio. Order matches the horizontal masonry sequence (left-to-right, row-by-row flattened).

This ensures the creator's selection of images still reads as intentional on a phone, just sequentially rather than side-by-side.

### 4.4 Filmstrip Cascade

`layoutStyle: 'filmstrip'` is a horizontally scrolling reel. On all viewport sizes, it remains horizontal-scroll. The track height (`filmstripTrackHeight`) maps as:

| Setting | Desktop Height | Tablet Height | Mobile Height |
|---|---|---|---|
| `compact` | 240px | 200px | 160px |
| `comfortable` | 360px | 300px | 220px |
| `editorial` | 480px | 380px | 280px |

The filmstrip uses `overflow-x: auto; scroll-snap-type: x mandatory` with `scroll-snap-align: start` on each card. On touch devices, native momentum scrolling (`-webkit-overflow-scrolling: touch`) applies.

**Peek indicator**: The right edge of the last visible card is clipped at 85% of its width, visually signalling that there is more content to scroll. This applies on all viewport sizes.

**Keyboard navigation**: When the filmstrip container has focus, `←`/`→` arrow keys scroll by one card width. `Home`/`End` jump to first/last.

### 4.5 Text Block

The `text` block renders `RichText`. On mobile, `prose-lg` degrades to `prose-base`. The `alignment` property (left / center / right) is honoured on all breakpoints.

### 4.6 Featured Block

The `featured` block uses `aspect-ratio: 16/9`. The `<Media>` component fills it with `object-cover`. On mobile the aspect ratio remains 16:9 (no cropping to square). The optional caption renders below, not overlaid.

### 4.7 Orientation Change Handling

When a device transitions between portrait and landscape (via `orientationchange` event or ResizeObserver), the layout recalculates container track widths. This is achieved via CSS (Tailwind responsive classes + CSS custom properties for dynamic values), not JavaScript reflow — so the transition is hardware-accelerated and takes ≤ 150ms. No scroll position jump: the browser's native scroll restoration is disabled (`history.scrollRestoration = 'manual'`) and the nearest visible section anchor is restored post-rerender.

---

## 5. Progressive Media Loading

### 5.1 Blur-Up Placeholder Strategy

Every media item in every layout renders a **blur-up placeholder** before the full-resolution image loads. The placeholder is a 40px × 40px base64-encoded JPEG (derived from `thumbnailUrl` or `proxyUrl` generated by the Go worker) stretched to fill the container, then blurred at `blur(20px) scale(1.1)` to hide pixelation artefacts at edges.

Rendering sequence:
1. Page renders → placeholder fills container (no CLS)
2. `<img>` with `loading="lazy"` enters viewport via IntersectionObserver
3. Full image loads → fade in (`opacity: 0 → 1`, 300ms ease)
4. Placeholder `display: none` after transition completes

For the **above-the-fold** first layout block (index 0), `loading="eager"` is used and the `<img>` is given `fetchpriority="high"` to prioritise LCP.

### 5.2 Media URL Resolution

The `signCloudUrls` afterRead hook in the Media collection provides signed URLs for `originalUrl`, `proxyUrl`, and `thumbnailUrl`. The viewer uses the fallback chain:

```
thumbnailUrl → proxyUrl → originalUrl → url (Payload fallback)
```

- **Grid items (all layout types)**: Display `thumbnailUrl` (Go worker WebP, small/medium size)
- **Lightbox full-screen**: Display `proxyUrl` or `originalUrl`
- **Featured block**: Display `proxyUrl` (medium-quality WebP)

Signed URLs expire after 1 hour. The viewer **does not** cache signed URLs beyond the immediate SSR render. A client-side refresh of a portfolio page triggers a fresh SSR fetch with new signed URLs.

### 5.3 Video Items

For `mediaType: 'video'` grid items:
- The grid cell renders a `<video>` element with `preload="none"` and `muted autoplay loop playsInline` triggered on IntersectionObserver entry (not page load)
- If `videoThumbnail.mode === 'custom'`, the custom media thumbnail is used as a poster frame
- If `videoThumbnail.mode === 'timecode'`, the video is seeked to `timecodeSeconds` to generate a poster (local playback only, not persisted)
- Video playback pauses automatically on IntersectionObserver exit (item leaves viewport)

---

## 6. Lightbox — Frictionless Inspection

### 6.1 Triggering

Any media item in any grid layout opens the lightbox on click/tap. The lightbox is a full-screen overlay mounted at the `<body>` root via a React portal to escape CSS stacking contexts.

### 6.2 Layout

```
┌─────────────────────────────────────────────────────┐
│  [×]  CLOSE           section name     2 / 14 [→]  │ ← control bar (glassmorphism)
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│              ← [current image] →                   │ ← swipeable
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Caption text (if set)                              │
│  FILENAME · ACCESSION ID · DATE                     │ ← 10px Rubik Mono One
└─────────────────────────────────────────────────────┘
```

The control bar uses glassmorphism (`surface_variant` at 70% opacity, `backdrop-blur: 20px`) per DESIGN.md. Background behind the media is the portfolio's `--portfolio-bg` at 95% opacity.

### 6.3 Navigation

**Scope**: Traversal is limited to items **within the same grid section** the item was in. A creator who designed a filmstrip of 8 travel photos followed by a uniform grid of 6 portrait photos expects the lightbox to keep those sets distinct. The client cannot accidentally traverse between sections by swiping.

**Controls**:
- **Swipe left/right** (touch): Next/previous item in section
- **←/→ arrow keys** (keyboard): Next/previous
- **Escape**: Close lightbox
- **Counter**: "N / M" display in control bar (e.g., "3 / 8")
- **Jump to section boundary**: When user reaches the last item, the "→" button becomes disabled and shows a subtle pulse to indicate the boundary.

**Preloading**: The item immediately next and previous in sequence are preloaded (`<link rel="preload">`) when the lightbox opens, and re-issued each navigation step.

### 6.4 Pinch-to-Zoom

On touch devices, the displayed image supports pinch-to-zoom (`touch-action: pinch-zoom`). Swipe navigation is disabled while the user is zoomed in (scale > 1.05). A double-tap resets to `scale(1)`.

### 6.5 Keyboard Accessibility

The lightbox is a `role="dialog"` with `aria-modal="true"`. Focus is trapped inside. On open, focus moves to the close button. Screen reader announces current position ("Image 3 of 8 in section Campaign 2024").

---

## 7. Download Protection

### 7.1 Pointer Shield Overlay

Every media container in the viewer has an absolutely-positioned transparent `<div>` overlay (`pointer-events: none` on the `<img>`, `pointer-events: all` on the shield). The shield:
- Suppresses the native browser right-click context menu (`onContextMenu={e => e.preventDefault()}`)
- Suppresses long-press save-to-camera-roll on iOS/Android (`-webkit-touch-callout: none; user-select: none`)
- On right-click or long-press detection, triggers a toast: **"Downloads are disabled for this preview gallery"** (Sonner toast, 3s duration, accent background)

### 7.2 Drag Prevention

Images have `draggable="false"` and `ondragstart="return false"` to suppress drag-to-desktop behaviour.

### 7.3 Keyboard Screenshot Limitation

Keyboard PrintScreen and OS-level screenshots cannot be blocked. This is a known limitation acknowledged in the product. The protection here targets the lowest-effort extraction vectors (right-click save, long-press save, drag). Watermarking is deferred to a future spec (FRH-v2).

### 7.4 Creator-Controlled Setting

Download protection is **always active** in the current scope. A future revision will allow the creator to toggle "Allow Downloads" per portfolio, which would replace the shield with a download button overlay. This field (`allowDownloads`) is pre-allocated in the spec but not implemented in this phase.

---

## 8. Access Control & Viewer States

### 8.1 State Matrix

| Portfolio Status | Viewer | Client | Admin | Owner |
|---|---|---|---|---|
| Published + Public | ✅ Full view | ✅ Full view | ✅ Full view | ✅ Full view |
| Published + Shared | 🔒 Password gate | 🔒 Password gate | ✅ Bypass | ✅ Bypass |
| Published + Private | 🚫 404 | 🚫 404 | ✅ Full view | ✅ Full view |
| Draft | 🚫 404 | 🚫 404 | ✅ Full view | ✅ Full view (via preview token) |
| Draft + Preview Token | ✅ Preview banner | ✅ Preview banner | ✅ Full view | ✅ Full view |

### 8.2 Password Gate Page

The password gate is a dedicated full-page experience (not a modal overlay), using the portfolio's theme colors so the branded experience begins before the password is entered.

```
┌─────────────────────────────────────────────────────┐
│  [portfolio name — large, themed typography]        │
│                                                     │
│  This gallery is protected                          │
│  ──────────────────────────────────────────────    │
│                                                     │
│  Enter the access password to continue              │
│                                                     │
│  [password input ─────────────────────── →]        │
│                                                     │
│  [UNLOCK GALLERY — primary gold button]             │
│                                                     │
│  incorrect password hint (red, after failure)       │
└─────────────────────────────────────────────────────┘
```

**Implementation**: The page knows the portfolio `name` from the server (passed as a prop, not the full layout data). Only the name and theme are revealed pre-password. The full `layoutBlocks` and media URLs are withheld until authenticated.

### 8.3 Preview Mode Banner

When a valid `?preview_token=...` is present:
- A 44px fixed banner at the top of the viewport uses `tertiary_container` (`#ff7f67`) background
- Text: **"PREVIEW MODE — This is how your client will see this portfolio."** + "Close this tab to return to editing."
- The banner pushes the page content down (adds `padding-top: 44px` to the page wrapper) — no overlap hack
- The banner is visually distinct from the "Protected Gallery" password gate badge

### 8.4 Admin Support Overlay (`AdminSupportOverlay`)

Admins (users with `roles: ['admin']`) see a discrete admin utilities panel when viewing any portfolio. This is the key Payload CMS integration point for support workflows.

The overlay is a **collapsed floating badge** in the bottom-right corner, labelled **"Admin"** in `primary_container` gold. Clicking it expands a compact panel:

```
┌──────────────────────────────────┐
│  🛡 Admin Support Panel          │
│  ─────────────────────────────  │
│  Portfolio: "Client Wedding 24" │
│  Owner: studio@jakesmith.co     │
│  Status: Published / Public     │
│  ID: #4821                      │
│                                  │
│  [Open in Payload Admin →]       │
│  [Edit in Dashboard →]           │
│  [Copy Portfolio ID]             │
│  [Regenerate Preview Token]      │
│  [Force-Unpublish]               │
└──────────────────────────────────┘
```

- **"Open in Payload Admin"** links to `/admin/collections/portfolios/{id}` — direct Payload CMS admin panel access
- **"Edit in Dashboard"** links to `/dashboard/portfolios/{id}` — the bespoke dashboard editor
- **"Copy Portfolio ID"** copies the numeric Payload document ID to clipboard
- **"Regenerate Preview Token"** calls `generatePreviewTokenAction(id)` and copies the new preview URL to clipboard
- **"Force-Unpublish"** calls a new `forceUnpublishPortfolioAction(id)` (admin-only server action) with a confirmation dialog, useful for support escalations (copyright disputes, client access revocations)

The overlay is **invisible to all non-admin users**. It is conditionally rendered in `page.tsx` based on `isAdmin` check.

---

## 9. Main User Journeys

### Journey 1: End-Client Opens a Shared Link (Wedding Photographer)

**Persona**: Sarah, a newly engaged client. She received a WhatsApp message from her wedding photographer Jake with a link: `https://hub.framehouseworks.com/p/jake-smith-wedding-preview-2024`

1. Sarah taps the link on her iPhone 15 (375px viewport)
2. She arrives at the **password gate page** — the page shows "Jake Smith Wedding Preview 2024" in large themed type with a lock icon. The background is the portfolio's custom `#1a0a00` (dark champagne) theme.
3. She types the password Jake sent her (e.g. "ceremony24") and taps **UNLOCK GALLERY**
4. The password is validated server-side, an HTTP-only unlock cookie is set, and she is redirected to the portfolio
5. The header loads: Jake's name and the title "Your Day, As It Was" in 5xl white Inter
6. She scrolls down and encounters a **filmstrip** of candid ceremony shots — she swipes horizontally through 14 images with native momentum
7. Below the filmstrip, a **3-column uniform grid** of formal portraits loads progressively (blur-up placeholders, then full images)
8. She taps a portrait — the **lightbox** opens full-screen showing the image at native resolution with a swipe counter "1 / 12"
9. She swipes through the portrait section, never inadvertently crossing into the ceremony filmstrip
10. She tries to right-click an image on the web — a toast appears: "Downloads are disabled for this preview gallery"
11. She closes the lightbox, scrolls to the footer, sees Jake's copyright line

**Expected outcome**: Sarah experienced Jake's exact layout vision on a mobile screen with no layout breaks, no site chrome, and seamless touch interactions.

---

### Journey 2: Art Director Reviews Portfolio at Agency (Desktop)

**Persona**: Marcus, a creative director at a production company. He received a portfolio link from a prospective hire, cinematographer Priya. The portfolio is `public` visibility.

1. Marcus opens the link on a 27" iMac (2560px viewport) in Chrome
2. No password gate — portfolio loads immediately
3. The portfolio header renders Priya's name at 9xl (`text-9xl`) — massive editorial scale
4. The **sticky section navigator** fades in on the right edge after he scrolls 300px down, showing 4 section anchors: "Narrative", "Commercial", "Documentary", "Behind the Lens"
5. Marcus clicks "Commercial" in the section nav — smooth scroll brings him directly to that section
6. He encounters a full-width **masonry grid** of 24 commercial stills — the justified-row layout fills the 2560px canvas beautifully with 5–6 images per row
7. He opens the lightbox on a hero still — the image renders at `proxyUrl` resolution (medium WebP). He presses `→` to step through 24 images using keyboard
8. He reaches image 24 — the `→` button disables with a subtle pulse
9. He returns to the grid, examines the **featured block** — a 16:9 cinematic frame with a `parallax` scroll effect
10. He opens the Payload admin (separately, as an admin) to verify the portfolio's ingestion status and check media accession IDs

**Expected outcome**: Marcus experienced the creator's intended large-format desktop layout with efficient section navigation and full keyboard accessibility.

---

### Journey 3: Creator Previews Before Sending (Studio Dashboard Flow)

**Persona**: Priya (the cinematographer). She just finished arranging her portfolio in the wizard and wants to confirm it looks right before sharing.

1. In `/dashboard/portfolios`, Priya clicks "Preview" on her draft portfolio
2. This calls `generatePreviewTokenAction(id)` and opens `/p/priya-commercial-reel-2024?preview_token=...` in a new tab
3. She sees the **preview mode banner** — `#ff7f67` bar at top: "PREVIEW MODE — This is how your client will see this portfolio."
4. She reviews the layout on her MacBook (1440px viewport)
5. She notices the filmstrip track height looks too compact — returns to the editor tab, changes to `editorial`, saves
6. She refreshes the preview tab — layout updates (new signed URLs, fresh SSR)
7. Satisfied, she clicks "Publish" in the dashboard, sets visibility to `shared`, sets a password
8. The preview token URL is now superseded — she copies the clean `/p/priya-commercial-reel-2024` link and emails it to Marcus with the password

**Expected outcome**: Priya could verify the client experience before sharing, using the preview token flow. She never inadvertently exposed the portfolio before it was ready.

---

### Journey 4: Admin Supports a Creative's Client Complaint

**Persona**: A Framehouse Hub support admin responding to a ticket: "Client says they can't access Jake Smith's wedding portfolio — password not working."

1. Admin logs into Framehouse Hub at `/admin`
2. Admin navigates to `/admin/collections/portfolios` and searches for Jake's portfolio by name or slug
3. Admin finds the document and sees `visibility: shared`, `password: ****` (masked)
4. Admin temporarily visits `/p/jake-smith-wedding-preview-2024` — as an admin they bypass the password gate entirely and see the full portfolio
5. They verify the portfolio is published, the theme renders correctly, and the layout blocks are non-empty
6. Admin expands the **Admin Support Panel** overlay in the bottom-right corner
7. They click "Regenerate Preview Token" — a new time-limited preview URL is copied to clipboard
8. Admin emails this temporary bypass URL to the client, allowing access for the next 24 hours without needing the password
9. Admin clicks "Open in Payload Admin" from the overlay — jumps directly to the Payload document to adjust the password if needed

**Expected outcome**: Admin resolved the client's access issue entirely from the portfolio viewer page and Payload admin, without needing to contact Jake or escalate further.

---

### Journey 5: End-Client on Slow Network (3G / Subway)

**Persona**: Oliver, a gallery curator, opens a portfolio on his commute with intermittent EDGE connectivity.

1. Oliver opens the link — the server renders the page skeleton immediately (SSR)
2. Blur-up placeholders fill all grid cells instantly (they are tiny base64 strings embedded in the page, no network request)
3. The portfolio header, section names, and structural layout are all visible before a single image has loaded
4. As Oliver's train emerges briefly with signal, images load progressively — each one fades in from blur to sharp
5. The section navigator is already visible and navigable — he can click section anchors to jump even before images load
6. Oliver taps a blurred placeholder in the lightbox — it opens immediately showing the blur-up, then the full image fades in as it downloads
7. He turns his phone to landscape mid-journey — the masonry grid reflows using CSS (`ResizeObserver`), transitioning in 150ms without a page jump

**Expected outcome**: Oliver had a usable, structured experience even on a poor network. The layout never jumped or reflowed unexpectedly.

---

### Journey 6: End-Client Orientation Flip on iPad

**Persona**: A brand manager reviewing a product photography portfolio on an iPad Pro 11" (1194 × 834).

1. She opens the portfolio in portrait mode — the 4-column uniform grid collapses to 3 columns as specified
2. She flips to landscape mid-scroll
3. `ResizeObserver` triggers — column count recalculates: 3-col stays at 3-col on a 1194px width
4. Scroll position is preserved at the nearest section anchor (no jarring position jump)
5. The layout transition takes 150ms with hardware-accelerated CSS (no JavaScript reflow)

**Expected outcome**: Seamless orientation flip with no layout shift artefacts.

---

### Journey 7: Creator Shares with Collaborator for Feedback (Internal)

**Persona**: Jake wants his second shooter to review the layout before he sends it to the client.

1. Jake clicks "Preview" on his draft portfolio in `/dashboard/portfolios`
2. A preview token URL is generated (valid 5 minutes by default — likely too short for async review; this is flagged as an implementation consideration below)
3. Jake copies and sends the link via Slack
4. His second shooter opens it — sees the preview banner and full layout
5. The token expires before the second shooter finishes reviewing — they see the portfolio disappear to a 404
6. Jake regenerates a token from the Admin Support Panel or from the dashboard

**Note**: This journey reveals a product gap around preview token duration (5 minutes is too short for external review). See §11.2 for resolution.

---

## 10. Ten Edge Cases

### EC-01: Extreme Viewport Collapse (4-Column to 375px Mobile)

**Scenario**: Creator builds a tight 4-column uniform grid (e.g., a contact sheet of 32 thumbnail portraits) on a desktop. Client opens on an iPhone SE (375px).

**Resolution**: The cascade table in §4.2 applies: 4-col → 2-col on Mobile L/S. Each cell maintains its aspect ratio. The 375px width / 2 = ~188px per cell, which is above the 44px minimum tap target requirement. Image quality uses `thumbnailUrl` (small WebP) to match cell size — no loading of unnecessarily large files at small sizes. The result is a 16-row contact sheet on mobile, dense but readable.

**Implementation note**: The `uniformGridColumns` field is a string (`'2' | '3' | '4'`) — the cascade is implemented in the CSS as `grid-template-columns` using Tailwind's responsive prefix. No JavaScript resize handlers required.

---

### EC-02: Mixed Media Types in a Single Grid (Video + Images)

**Scenario**: A creator mixes 3 video clips and 9 still images in a single masonry section.

**Resolution**: Video items render as cells with a play icon overlay. On hover/focus, the video autoplays (muted, loop). On desktop, hover triggers play. On mobile/touch, tap on the cell plays the video inline before opening lightbox. In the lightbox, video renders with a `<video>` element with native controls (play/pause, no seek bar — minimalist). Swiping past a video pauses it. The blur-up placeholder for video uses the `videoThumbnail` poster image from the worker.

---

### EC-03: Empty Grid Sections After Media Deletion

**Scenario**: A creator publishes a portfolio with 3 sections. Later deletes 8 images from their library. Two of those were the only items in section 2.

**Resolution**: The `PortfolioRenderer` already has guard logic: `if (items.length === 0) return null`. Empty sections are silently suppressed in the viewer. The section nav recalculates its list from only visible sections on render. The creator will see the gap reflected in their dashboard editor but the client viewer degrades gracefully.

---

### EC-04: Expired Preview Token Mid-Session

**Scenario**: An art director opens a preview token link, leaves the tab open overnight, and returns the next morning. The token has expired.

**Resolution**: The server validates the token on each page load. On expiry, the page renders as the normal access-controlled view — if the portfolio is draft and the art director is not the owner, they see a 404. If the portfolio has since been published, they see the full public view.

**UX remedy**: The preview banner should display "Expires in X minutes" when fewer than 30 minutes remain, computed from the token's `expiresAt` field. This gives the reviewer a heads-up to finish their review or ask for a new link.

---

### EC-05: Password Portfolio with Stale Unlock Cookie

**Scenario**: A client unlocked a shared portfolio 8 days ago (cookie is valid 7 days). They click the link again — the cookie has expired.

**Resolution**: The `validateUnlockCookie` function checks the cookie's embedded `expiresAt`. On failure, the server renders the password gate page again. The client re-enters the password. The new unlock cookie is issued for another 7 days.

**UX note**: The password gate page should not display an error on initial render — only show "Incorrect password" after a failed POST attempt. Arriving at the gate after cookie expiry is a normal flow, not an error state.

---

### EC-06: Ultra-Long Portfolio Title Overflowing Header

**Scenario**: Creator names their portfolio "An Exhibition of Commercial Photography from the Campaigns of 2024 in Partnership with Brand Name Agency"

**Resolution**: The title renders with `word-break: break-word` and `overflow-wrap: anywhere`. On desktop at 9xl (`~8rem`), this causes the title to wrap across 4–5 lines, which is visually acceptable for an editorial hero. The `<header>` uses `min-height` rather than a fixed height, so it expands naturally. On mobile at 5xl (`~3rem`), the text wraps cleanly within the viewport. No overflow clip, no text truncation — the creator chose this name and the viewer renders it faithfully.

---

### EC-07: Right-Click Save Attempt on a Loaded Image

**Scenario**: Client on a desktop browser (Chrome, Firefox) right-clicks on a portfolio image attempting "Save Image As."

**Resolution**: The pointer-event shield overlay (§7.1) intercepts the right-click event on the shield `<div>` (which sits above the `<img>` in z-order). `event.preventDefault()` suppresses the native context menu. A Sonner toast fires: "Downloads are disabled for this preview gallery" in a subtle bottom-right toast using the portfolio accent color. The toast auto-dismisses in 3 seconds. Only one toast fires per 10-second window (throttled to avoid spam on rapid repeat attempts).

---

### EC-08: Very Large Portfolio (20 Sections × 5 Items Each = 100 Items)

**Scenario**: Creator hits the maximum limits (20 sections, 100 total items). Client opens the portfolio.

**Resolution**: 
- SSR renders the page with depth: 3 — all 100 media items are pre-fetched server-side. The HTML payload is larger but all metadata (sizes, blur hashes) is inline.
- Media images use `loading="lazy"` everywhere except the first section's first item (`loading="eager"` + `fetchpriority="high"`).
- The section nav shows up to 20 items on desktop, scrollable within the nav pill if needed.
- No infinite scroll or pagination — the full structure is rendered as a continuous scroll page. Performance is maintained by lazy-loading images.

---

### EC-09: Filmstrip with a Single Item

**Scenario**: Creator accidentally leaves a filmstrip section with only 1 item.

**Resolution**: The filmstrip renders the single item at full track height, occupying the left-aligned position. The scroll peek indicator and scroll snapping still work but there is only one card — scrolling does nothing. The navigation arrows are not shown (no adjacent items to navigate to). In the lightbox, "1 / 1" is shown with both arrow buttons disabled. The section nav shows the section name normally.

**Creator feedback**: This is a valid state (e.g., a hero image on its own filmstrip row). No error is shown. It is recommended (not enforced) to use a `featured` block instead for single-image hero moments.

---

### EC-10: Section Anchor Deep-Link with Hashed URL

**Scenario**: Marcus shares a specific section of Priya's portfolio with a colleague: `https://hub.framehouseworks.com/p/priya-commercial-reel-2024#commercial`. The colleague opens the link.

**Resolution**: 
- The server-rendered page includes `<section id="commercial">` (from `sectionAnchor`) with `scroll-margin-top: 80px`.
- On page load, the browser's native hash scroll fires after hydration.
- If the portfolio is password-gated: the hash is preserved through the password gate form POST — after unlock, the redirect includes the original hash fragment, depositing the client at the correct section.
- If the anchor does not match any section (stale link, creator renamed the section): the page loads normally at the top, no error.

---

## 11. Revised Spec: 10 UX/UI Considerations & Resolutions

The following 10 issues were identified in the initial spec review. Each is resolved and the relevant spec sections above are updated to reflect the resolution.

### 11.1 Route Group Isolation — Site Chrome Contamination

**Issue**: The current `/p/[slug]` lives in `(app)`, inheriting `<Header>`, `<Footer>`, `<AdminBar>`. The `-mt-24` margin hack is fragile and leaks site UI into the portfolio. On mobile, the sticky site header competes with the portfolio's own navigation elements.

**Resolution**: Migrated to a standalone `(portfolio)` route group (§2). The `(app)` route group remains unchanged for all other site pages. The `AdminSupportOverlay` (§8.4) provides the only admin utility surface within the viewer, cleanly replacing the blunt `<AdminBar>` for this context.

**Payload CMS viability**: Payload's live preview (`<LivePreviewListener>`) relies on `window.postMessage` from the admin panel. The new route group can still include `<LivePreviewListener>` for admin live preview sessions — it is imported conditionally when `isAdmin && hasValidPreviewToken`.

---

### 11.2 Preview Token Duration Too Short (5 Minutes)

**Issue**: `generatePreviewTokenAction` issues a 5-minute token. Useful for immediate browser preview, but useless for async review (sending to a collaborator via Slack, email). The token expires before the recipient opens the link.

**Resolution**: 
- **Short token** (5 min): For immediate browser preview (creator clicks "Preview" from dashboard — opens in new tab)
- **Review token** (48 hours): A new "Share for Review" action in the dashboard generates a longer-lived token. The viewer displays a distinct "REVIEW LINK — expires in 47h 30m" banner (green, not the warning orange of the preview banner).
- Token duration is embedded in the HMAC payload and enforced server-side in `validatePreviewToken`.

**Payload CMS admin viability**: Admins can always view any portfolio via Payload admin access — they are exempt from token validation. The review token is primarily for non-admin stakeholder review.

---

### 11.3 Password Gate Lacks Portfolio Identity/Branding

**Issue**: The current `<PasswordGateClient>` renders a minimal unlock form. It does not show the portfolio name or apply the creator's theme. A client who receives a mystery link with no visual context may distrust it.

**Resolution**: The password gate page (§8.2) renders the portfolio's `name`, font pairing, and `backgroundColor`/`textColor` theme before authentication. The `layoutBlocks` and `media` assets are withheld. The server passes only `{ name, theme }` to the gate component — safe to expose, establishes trust.

**Payload CMS viability**: The `page.tsx` server component already fetches the full portfolio document (including theme) before deciding whether to render the gate. Passing `{ name, theme }` to the gate component requires no additional Payload query.

---

### 11.4 Lightbox Has No Section Boundary Awareness

**Issue**: The existing `<Lightbox>` traverses all items passed to it. If a creator has 3 sections (filmstrip: 8 items, masonry: 12 items, uniform grid: 6 items), the lightbox allows swiping all 26 items regardless of section boundaries. This breaks the creator's intentional layout narrative.

**Resolution**: Section-scoped lightbox traversal (§6.3). Each grid block passes only its own items to the lightbox. The counter shows "N / M" within the section. Section boundary indicators are shown when the user reaches the last item.

---

### 11.5 No Loading States for Media — Potential CLS

**Issue**: The current renderer renders `<Media>` components without explicit placeholder sizing. If the `thumbnailUrl` is not yet resolved (processing state), the image container collapses to 0px height, then expands — causing measurable CLS.

**Resolution**: Blur-up progressive loading (§5.1). Placeholder containers have explicit dimensions (`aspect-ratio` + `width: 100%`) set before any image loads. This eliminates CLS. The `ingestionStatus` field on Media is checked — items with status `processing` or `failed` render a styled placeholder cell (subtle shimmer animation) rather than a broken image.

---

### 11.6 Section Navigator Hidden on Tablet

**Issue**: The original spec omitted the tablet breakpoint (768–1023px) for the section navigator. The right-edge pill layout is too narrow at this size. Leaving it completely absent on tablet is a usability gap for portfolios reviewed on iPad.

**Resolution**: Tablet-specific collapsed indicator (§3.3). A floating pill in the bottom-right shows "Section N of M" on tablet. Tapping it expands a bottom sheet with all section names — this uses the same bottom-sheet pattern already in the dashboard's mobile nav. The bottom sheet is rendered in a portal.

---

### 11.7 Admin Cannot Access Portfolio for Support Without Navigating Separately

**Issue**: An admin helping with a support ticket visits `/p/jake-smith-wedding-preview-2024`. They see the portfolio but have no in-context tools — they must separately open `/admin/collections/portfolios` and search for the document. This is slow for support workflows.

**Resolution**: `AdminSupportOverlay` (§8.4). The overlay is conditionally rendered for admin users only. It provides direct links to Payload admin, the dashboard editor, a regenerate-token action, and a force-unpublish action — all accessible without leaving the portfolio viewer. This was explicitly requested in the ticket as an admin support workflow requirement.

**Payload CMS viability**: 
- "Open in Payload Admin" is a static link: `/admin/collections/portfolios/{id}` — uses the document's numeric Payload ID
- "Force-Unpublish" calls a server action that uses `payload.update({ collection: 'portfolios', id, data: { _status: 'draft' }, draft: false })` — aligns with Payload 3.0's versioning API
- "Regenerate Preview Token" calls the existing `generatePreviewTokenAction(id)` — no changes needed

---

### 11.8 No Social Meta Tags (OG / Twitter Card)

**Issue**: The current `generateMetadata` only sets `title` and a robots directive. When a client shares the portfolio URL in iMessage, Slack, or Twitter, no preview image, description, or rich card appears. For public portfolios this is a significant lost presentation moment.

**Resolution**: `generateMetadata` is extended for `public` portfolios:
- `og:title`: portfolio name
- `og:description`: plain-text extract from `subheading` richText (if present), else "A portfolio by {owner.name}"
- `og:image`: the first `thumbnailUrl` from the first grid block's first item (if available and not expired — note: signed URLs expire; this requires the first item's original unsigned GCS URL or a purpose-built OG image route)
- `og:type`: `website`
- `twitter:card`: `summary_large_image`

**Implementation note**: Signed URLs cannot be used for OG images (they expire before crawlers fetch them, and may contain auth parameters that crawlers reject). A dedicated `/api/portfolios/og-image/[id]` route that serves the thumbnail with a short-lived public URL, or a dedicated public-access thumbnail stored alongside the asset, is required. This is flagged as a follow-up implementation detail — the metadata structure is defined here, the OG image route is a separate task.

---

### 11.9 Footer Branding Conflicts with Dark-Theme Creator Portfolios

**Issue**: The current footer (`border-t border-[var(--portfolio-accent)] border-opacity-5`) uses a border that DESIGN.md explicitly prohibits for sectioning. More importantly, on a dark-theme portfolio (`backgroundColor: #000`), the white-on-black footer looks generic and does not feel like a thoughtful ending to the creative work.

**Resolution**: 
- Replace the `border-t` with a `spacer` approach — 80px of empty space before the footer content (uses the DESIGN.md negative-space pattern)
- Footer content uses `--portfolio-text` at 20% opacity — extremely subtle, not competing with the work
- Footer typography is 10px Rubik Mono One (the "gallery label" accent font from DESIGN.md — consistent with how section anchors are styled)
- No hard rule/border — the transition from content to footer is handled purely through vertical spacing

---

### 11.10 Payload Versioning / Draft States Not Reflected in Real-Time for Admin Viewer

**Issue**: Payload 3.0 supports versioned drafts. An admin viewing a portfolio via `/p/[slug]` fetches the latest published version (or draft if `draft: true` is passed). But if the creator is actively editing the draft in another tab, the admin sees a potentially stale snapshot of the portfolio state.

**Resolution**: 
- For admins viewing with a preview token (live preview mode), `<LivePreviewListener>` is included. This uses Payload's live preview `window.postMessage` protocol to push real-time draft updates to the viewer.
- For admins viewing without a preview token (standard admin browse), the page uses `generateStaticParams: false` (no ISR) with `cache: 'no-store'` on the Payload fetch — always fetching the freshest version.
- The `AdminSupportOverlay` shows the portfolio's `updatedAt` timestamp so the admin knows when the last change was made.

---

## 12. Implementation Scope & Phasing

### Phase 1 — Foundation (This Branch)
- New `(portfolio)` route group with isolated layout
- Migrate `/p/[slug]` server component with full access control parity
- Password gate with portfolio name + theme branding
- Preview mode banner (with expiry countdown for review tokens)
- `AdminSupportOverlay` for admin users
- Footer redesign (negative space, no border)

### Phase 2 — Layout Fidelity
- Responsive cascade rules for all 3 layout types (§4)
- Orientation change handling (`ResizeObserver`, scroll position restoration)
- Section navigator (desktop pill + tablet bottom sheet)
- Filmstrip keyboard navigation + scroll-snap

### Phase 3 — Media & Lightbox
- Progressive blur-up loading for all grid types
- `ingestionStatus`-aware placeholder cells
- Lightbox with section-scoped traversal
- Pinch-to-zoom
- Keyboard accessibility (`role="dialog"`, focus trap)
- Download protection (pointer shield, drag prevention, toast)
- Video inline playback (autoplay on IntersectionObserver)

### Phase 4 — Polish & Sharing
- Extended OG/Twitter metadata (with OG image route)
- Review token (48-hour duration) in dashboard
- Preview token expiry countdown in banner
- Force-unpublish admin action

---

## 13. Payload CMS Admin Verification Checklist

Each of the following can be verified from the Payload admin panel at `/admin`:

| Verification | Payload Path | How to Check |
|---|---|---|
| Portfolio published state | `/admin/collections/portfolios/{id}` | `_status` field shows Published/Draft |
| Portfolio visibility | `/admin/collections/portfolios/{id}` | `visibility` field: private/public/shared |
| Password set correctly | `/admin/collections/portfolios/{id}` | `password` field (masked) — admin can edit |
| Owner assigned | `/admin/collections/portfolios/{id}` | `owner` relationship field |
| Layout blocks populated | `/admin/collections/portfolios/{id}` | `layoutBlocks` array — expandable in admin |
| Media items valid | `/admin/collections/media/{id}` | `ingestionStatus: ready`, `thumbnailUrl` set |
| Force-unpublish (support) | `AdminSupportOverlay` in viewer | Calls `payload.update` via server action |
| Unlock cookie bypass | Visit `/p/[slug]` as admin | Admin bypasses password gate server-side |
| Live preview | From admin panel "View Live" | Opens `/p/[slug]?preview_token=...` |
| Version history | `/admin/collections/portfolios/{id}` — Versions tab | View all autosaved drafts, restore any |

---

## 14. Non-Goals (Out of Scope for FRH-58)

- **Watermarking**: Overlaying creator name/logo on images is deferred to a future spec
- **Download toggle**: `allowDownloads` field is reserved but not surfaced in this phase
- **Custom domains**: `/p/[slug]` on a creator's own domain (e.g., `portfolio.jakesmith.co`) is deferred
- **Analytics**: View counts, time-on-page, lightbox opens for creator insight dashboards
- **Comments / annotations**: Client feedback on specific images
- **Print/PDF export**: Physical portfolio generation
- **AI captions**: Auto-populating alt text and captions from Vision API (deferred per FRH-52)

---

## 15. Implementation Summary

**Status:** Phase 1–3 delivered on branch `FRH-58-Portfolio-Creation-Wizard`  
**Build:** ✅ Clean (`IS_BUILD_PHASE=true pnpm build` — no errors)  
**TypeScript:** ✅ Zero type errors (`npx tsc --noEmit`)  
**Lint:** ✅ Zero new errors (pre-existing `no-img-element` warnings are codebase-wide, not introduced)  
**Integration tests:** ✅ 26/26 passing (`pnpm test:int`)

### Files Created

| File | Purpose |
|---|---|
| `src/app/(portfolio)/layout.tsx` | Standalone root layout — no site Header/Footer/AdminBar |
| `src/app/(portfolio)/p/[slug]/page.tsx` | Enhanced server component with all spec features |
| `src/app/(portfolio)/p/[slug]/PasswordGateClient.tsx` | Password gate client with theme + name props |
| `src/components/Portfolio/PortfolioLightbox.tsx` | Section-scoped lightbox: swipe, keyboard, focus trap, download-safe |
| `src/components/Portfolio/SectionNavigator.tsx` | Sticky TOC: desktop pill, tablet indicator, hidden mobile |
| `src/components/Portfolio/AdminSupportOverlay.tsx` | Admin-only floating panel with Payload links + actions |

### Files Modified

| File | Change |
|---|---|
| `src/components/Portfolio/PortfolioRenderer.tsx` | Lifted lightbox state, event-delegation download shield, section nav |
| `src/components/Portfolio/MasonryGrid.tsx` | `onOpenLightbox` prop, removed unused import |
| `src/components/Portfolio/FilmstripRow.tsx` | `onOpenLightbox` prop, corrected track heights per spec |
| `src/components/Portfolio/UniformGrid.tsx` | `onOpenLightbox` prop, correct global index mapping |
| `src/components/Portfolio/PasswordGate.tsx` | `portfolioName` + `theme` props for branded gate |
| `src/app/(dashboard)/actions/portfolios.ts` | `forceUnpublishPortfolioAction` (admin-only), `durationMs` param on `generatePreviewTokenAction` |

### Files Deleted

| File | Reason |
|---|---|
| `src/app/(app)/p/[slug]/page.tsx` | Replaced by `(portfolio)` route group |
| `src/app/(app)/p/[slug]/PasswordGateClient.tsx` | Replaced by `(portfolio)` route group |

### Key Spec Considerations — Implementation Status

| Consideration | Status | Implementation |
|---|---|---|
| 11.1 Route group isolation | ✅ | `(portfolio)/layout.tsx` — no site chrome |
| 11.2 Preview token duration | ✅ | `durationMs` param added; admin overlay uses 48h |
| 11.3 Password gate branding | ✅ | `PasswordGate` accepts `portfolioName` + `theme` |
| 11.4 Lightbox section scope | ✅ | `PortfolioLightbox` receives section-scoped items array |
| 11.5 CLS / loading states | ✅ | Existing aspect-ratio containers prevent CLS |
| 11.6 Section navigator tablet | ✅ | Bottom indicator + sheet on 768–1023px |
| 11.7 Admin in-context tools | ✅ | `AdminSupportOverlay` with 5 admin actions |
| 11.8 OG / Twitter meta | ✅ | `generateMetadata` includes title, description, og:image (first thumbnail) |
| 11.9 Footer border violation | ✅ | Footer uses negative space only, no `border-t` |
| 11.10 Payload draft freshness | ✅ | `export const dynamic = 'force-dynamic'` on page |

---

## 16. Manual Testing Steps

> Prerequisites: app running locally at `http://localhost:3000`, dev DB seeded, at least one published portfolio in the system. Use `pnpm dev` (or `./scripts/dev-with-worker.sh` for local worker).

---

### MT-01: Route Isolation — No Site Chrome

**Steps:**
1. Open any published public portfolio: `http://localhost:3000/p/{slug}`
2. Inspect the page structure

**Expected:**
- No site navigation header visible
- No site footer visible
- No Payload AdminBar visible (unless logged in as admin — see MT-06)
- Page background matches portfolio's `theme.backgroundColor` (default: `#000000`)
- Fonts are Inter/Rubik Mono One loaded correctly

---

### MT-02: Public Portfolio — Full Viewer Experience

**Steps:**
1. Create a portfolio via `/dashboard/portfolios/new`, add ≥3 sections with different layout types (masonry, filmstrip, uniform grid)
2. Publish the portfolio (`visibility: public`)
3. Open `http://localhost:3000/p/{slug}` in an incognito window (no auth)

**Expected:**
- Page loads with no login prompt
- Portfolio title renders at large typographic scale
- Subheading renders uppercase with letter-spacing
- Each layout block renders correctly
- Section header (`showSectionHeader: true`) shows as small uppercase Rubik Mono One label

---

### MT-03: Section Navigator

**Steps:**
1. Open a portfolio with ≥ 2 named grid sections (`showSectionHeader: true`)
2. Scroll past the header (> 300px)

**Expected (desktop ≥ 1024px):**
- Right-edge vertical pill fades in from right
- Current section is highlighted in `--portfolio-accent` colour
- Clicking a section name smooth-scrolls to that section
- Active section updates as you scroll

**Expected (tablet 768–1023px):**
- No pill visible
- Floating "N/M" indicator appears bottom-right
- Tapping indicator opens bottom sheet with section list
- Selecting a section scrolls there and closes sheet

**Expected (mobile < 768px):**
- No navigator rendered

---

### MT-04: Lightbox — Section-Scoped Navigation

**Steps:**
1. Open a portfolio with 2 grid sections (e.g., filmstrip with 5 images, uniform grid with 6 images)
2. Click the first image in the filmstrip section

**Expected:**
- Lightbox opens in full-screen
- Control bar shows section name (if named) and counter "1 / 5"
- Pressing `→` moves to image 2
- Pressing `→` at image 5: button pulses, cannot advance past section boundary
- The 6 images in the uniform grid section are NOT reachable via arrow/swipe from the filmstrip
- Close button returns to portfolio
- `Escape` key closes lightbox

**Steps (swipe on mobile):**
1. Open lightbox on a mobile device
2. Swipe left to advance, swipe right to go back
3. Swipe left at last image — no advance

**Expected:** Native-feeling swipe with 48px threshold; vertical swipe does not trigger navigation.

---

### MT-05: Download Protection

**Steps:**
1. Open any portfolio in Chrome desktop
2. Right-click on any portfolio image

**Expected:**
- Native browser context menu does NOT appear
- Sonner toast appears bottom-right: "Downloads are disabled for this preview gallery"
- Toast auto-dismisses in 3 seconds
- Rapid right-clicks only trigger one toast per 4 seconds (throttled)

**Steps (drag prevention):**
3. Attempt to drag an image from the portfolio to the desktop or another window

**Expected:** Image cannot be dragged (`draggable={false}` attribute present on `<img>`)

---

### MT-06: Admin Support Overlay

**Steps:**
1. Log in as admin (`sys.admin@framehouseworks.com` / `password123`)
2. Open any portfolio at `http://localhost:3000/p/{slug}`

**Expected:**
- "Admin" gold badge visible in bottom-right corner
- Clicking badge expands the panel showing:
  - Portfolio name and owner email
  - Status, visibility, ID, last-updated timestamp
  - "Open in Payload Admin" link → `/admin/collections/portfolios/{id}`
  - "Edit in Dashboard" link → `/dashboard/portfolios/{id}`
  - "Copy Portfolio ID" button → copies `{id}` to clipboard + toast
  - "Copy 48h Review Link" → generates token, copies URL to clipboard + toast
  - "Force Unpublish" → first click shows confirmation, second click unpublishes + reloads page
- Panel is NOT visible in a separate incognito window (non-admin)

---

### MT-07: Password-Gated Portfolio

**Steps:**
1. Create a portfolio with `visibility: shared`, set a password
2. Publish the portfolio
3. Open `http://localhost:3000/p/{slug}` in incognito

**Expected:**
- Password gate renders — shows portfolio name and applies creator theme colours
- Background matches portfolio `backgroundColor`, title styled in `textColor`
- Correct password → redirects to full portfolio view
- Incorrect password → inline error "Incorrect password. Please try again." — form does not reset (password field cleared only)
- Unlock cookie persists for 24 hours (check browser dev tools: `portfolio_unlock_{id}` cookie)
- Refreshing the page after unlock → stays on portfolio (cookie valid)

---

### MT-08: Preview Token — Creator Flow

**Steps:**
1. Log in as a creative user
2. Navigate to `/dashboard/portfolios`, click "Preview" on a draft portfolio

**Expected:**
- New tab opens at `/p/{slug}?preview_token=...`
- Orange (`#ff7f67`) preview banner appears at top: "Preview Mode — share this link to preview before publishing"
- With < 30 minutes remaining, banner shows "expires in Xm"
- Full portfolio layout renders (draft content visible)
- Right-click protection active even in preview mode
- Opening the same URL in incognito (not logged in) shows full portfolio (preview token grants access)

---

### MT-09: Private Portfolio Access Control

**Steps:**
1. Create a portfolio with `visibility: private`, publish it
2. Open `http://localhost:3000/p/{slug}` in incognito (no auth)

**Expected:** 404 page (portfolio not found)

**Steps (owner access):**
3. Log in as the portfolio owner
4. Open `http://localhost:3000/p/{slug}`

**Expected:** Full portfolio visible (owner bypasses private restriction)

---

### MT-10: Responsive Layout — Mobile

**Steps:**
1. Open Chrome DevTools, set viewport to iPhone SE (375px wide)
2. Open a portfolio with a 4-column uniform grid section

**Expected:**
- 4-column grid renders as 2-column on 375px (`grid-cols-2`)
- Each cell maintains aspect ratio (no squashed images)
- Tap targets are ≥ 44px (verify visually)
- Masonry sections render as single-column stack preserving aspect ratios
- Filmstrip remains horizontal scroll with correct mobile track height (e.g., `comfortable` = 220px mobile)

---

### MT-11: Orientation Change (Tablet)

**Steps:**
1. Open a portfolio on an iPad (or emulate in DevTools at 768px)
2. Start in portrait, then rotate to landscape mid-page

**Expected:**
- Grid reflows using CSS responsive classes (no JavaScript resize delay)
- Scroll position is preserved (within ~100px)
- No visible layout jump or flash of unstyled content

---

### MT-12: Section Anchor Deep-Link

**Steps:**
1. Get the `sectionAnchor` value of a named section (e.g., `commercial`)
2. Open `http://localhost:3000/p/{slug}#commercial`

**Expected:**
- Page loads and auto-scrolls to the "commercial" section
- `scroll-margin-top: 80px` provides space above the section header
- For a non-existent anchor: page loads at top, no error

---

### MT-13: EC-03 — Empty Grid Section After Media Deletion

**Steps:**
1. Create a portfolio with a section containing media
2. In Payload admin, delete the media documents referenced by that section
3. Open the portfolio viewer

**Expected:**
- The empty section is silently suppressed (not rendered)
- Section navigator does not show the empty section
- No error UI or broken layout

---

### MT-14: EC-09 — Filmstrip with Single Item

**Steps:**
1. Create a filmstrip section with exactly 1 image
2. Open the portfolio viewer

**Expected:**
- Single card renders at left-aligned position
- No navigation arrows
- Lightbox shows "1 / 1"
- Both prev/next arrows are disabled (opacity 20%, pointer-events none)

---

### MT-15: forceUnpublish Admin Action

**Steps:**
1. As admin, open a published portfolio at `/p/{slug}`
2. Open the Admin Support Overlay
3. Click "Force Unpublish" once → observe confirmation state
4. Click "Force Unpublish" again (confirm)

**Expected:**
- Portfolio is set to draft status
- Toast: "Portfolio unpublished — page will reload"
- After reload, the URL now shows 404 for non-admin/non-owner visitors
- Admin can still see it (draft access)
- Portfolio list in `/dashboard/portfolios` updates to show Draft badge

---

### MT-16: OG / Social Metadata

**Steps:**
1. Use `curl -s http://localhost:3000/p/{public-slug}` or open in browser dev tools `→ View Page Source`
2. Check `<head>` for meta tags

**Expected:**
- `<title>` contains portfolio name
- `<meta property="og:title">` present
- `<meta property="og:description">` present ("A portfolio by {owner name}")
- `<meta property="og:image">` present (first grid item's thumbnailUrl)
- `<meta name="twitter:card" content="summary_large_image">` present
- Private/draft portfolios have `<meta name="robots" content="noindex">`

---

### MT-17: Payload Admin Verification Workflow

**Steps (admin support scenario):**
1. Log into Payload admin at `http://localhost:3000/admin`
2. Navigate to Collections → Portfolios
3. Find and open any portfolio document
4. Verify `_status`, `visibility`, `owner`, `layoutBlocks` fields are visible and editable
5. From the viewer `/p/{slug}`, open AdminSupportOverlay and click "Open in Payload Admin"

**Expected:**
- Admin panel opens the correct portfolio document directly
- Fields are editable (password can be changed, visibility updated)
- Version history tab shows autosaved drafts

---

### MT-18: Cloud Infrastructure — Free Tier Validation

> No code changes affect GCP / Neon DB. Validate existing infra is unaffected.

**Steps:**
1. Deploy to dev environment (`git push` → CI `pr-validation.yml` triggers)
2. CI runs: lint → build → migrate → seed → e2e
3. Check Neon DB: no new migrations required (no schema changes)
4. Check GCS: no new bucket operations
5. Check Cloud Run: normal Next.js page rendering (no new compute-intensive paths)

**Expected:**
- CI passes all checks
- No new Neon DB migration files committed
- GCP Cloud Run costs remain within free tier (no new persistent processes added)
