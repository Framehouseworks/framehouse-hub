# SPEC: MEDIA ARCHIVE STREAM OVERHAUL

## 1. USER JOURNEY (UX FLOW)

```mermaid
graph TD
    A[Creator lands on Dashboard] --> B[Default View: Chronological Stream by Capture Date]
    B --> C{Action}
    C -->|Browse| D[Scroll timeline with date headers & shoot titles]
    C -->|Inspect| E[Click media -> Open forensic detail modal]
    C -->|Upload| F[Ingest new work -> Placed in background queue]
    C -->|Toggle Chronology| G[Switch: Capture Date vs Ingest Date]
    F --> H[Worker processes EXIF -> Asset appears in timeline based on Capture Date]
```

---

## 2. UI LAYOUT & SECTIONS

- **Stage Canvas**
  - High negative space. No borders, lines, or grid dividers.
  - Tonal changes define boundaries between control bar and media canvas.
- **Top Control Bar**
  - "Source of Truth" main title.
  - Action buttons: Selection mode, Upload queue.
  - Search bar + view presets.
  - Toggle switch: "Capture Date" (EXIF) vs "Upload Date" (Archival sequence).
- **Temporal Group Headers**
  - "TODAY" / "THIS WEEK" (Caps, Monospaced metadata font).
  - Shoot Clusters: "Northern Lights Expedition" (Bold, clean body font).
  - Month/Year separators (Small, monospaced metadata font).
- **Adaptive Masonry Grid**
  - Mixed media grid: Aspect-ratio preserving blocks.
  - No cropping. 16:9 videos next to vertical RAW portraits next to square photos.
  - Cards show media preview, badge for type (RAW, Video, etc.).
- **Museum Label Metadata (Hover/Detail)**
  - Technical metadata (ISO, shutter, aperture, resolution, size) in monospaced font.
  - Body descriptions and tags in clean Inter text.

---

## 3. LOGIC & DATA FLOW

- **Chronological Grouping Engine**
  1. Fetch all media sorted by `captureDate` (primary) and `createdAt` (fallback).
  2. Parse date into buckets: Today, This Week, Month, Year, or Shoot (if `shootName` set).
  3. Render bucket header. Render masonry items inside bucket.
- **Upload vs Capture Chronology**
  - *Default View:* Sorted by `captureDate` (EXIF timestamp).
  - *Ingested View:* Sorted by `createdAt` / `uploadBatchId`. Separate stream for quick retrieval of recent uploads.
- **Performance Scroll (Virtuoso Masonry)**
  - Dynamic height virtualization.
  - Only render visible timeline items and headers.
  - Lazy-load original assets using low-res proxy previews.
