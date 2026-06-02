# Collections Reference

All collections are registered in `src/payload.config.ts` and defined in `src/collections/`. After any schema change, run `pnpm payload migrate:create` and commit both the `.ts` and `.json` migration files.

---

## Users

**File:** `src/collections/Users/index.ts`  
**Slug:** `users`  
**Auth:** Yes (Payload built-in auth)

### Purpose
Platform user accounts. Supports three roles: `admin`, `creative`, `viewer`. Creatives upload media and own portfolios; admins have full platform access; viewers are read-only guests.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `name` | text | Display name |
| `email` | email | Auth identity — managed by Payload |
| `roles` | select (hasMany) | `admin`, `creative`, `viewer`. Default: `['viewer']` |

### Access Rules

| Operation | Rule |
|---|---|
| Admin UI access | `admin` or `creative` role |
| create | `publicAccess` (open registration) |
| read | `adminOrSelf` |
| update | `adminOrSelf` |
| delete | `adminOnly` |
| `roles` field | `adminOnlyFieldAccess` (read/write/create) |

### Hooks

| Hook | Location | Purpose |
|---|---|---|
| `ensureFirstUserIsAdmin` | `roles.beforeChange` | Auto-promotes the very first user to `admin` |
| `protectRoles` | `roles.beforeChange` | Prevents non-admins from escalating their own role |

### Admin UI
- Group: `Users`
- Custom tab: `/oversight` — renders `CreativeOversightView` with activity metrics for the selected user.

### Notes
- `roles` is admin-only at the field level. A creative registering via the public form gets `['viewer']` by default; an admin must promote them.
- The seeded system admin is `sys.admin@framehouseworks.com` / `password123`.

---

## Media

**File:** `src/collections/Media/index.ts`  
**Slug:** `media`

### Purpose
Core DAM asset collection. Stores metadata for every ingested file. Payload does **not** manage the bytes — bytes go to either the local enclave (`public/media/tenants/…`) or GCS. `disableLocalStorage: true` and `filesRequiredOnCreate: false` are both required.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `title` | text | Required display name |
| `alt` | text | Required accessibility alt text |
| `caption` | richText | Lexical |
| `storagePath` | text (readOnly) | Canonical path: `tenants/{userId}/{domain}/{year}/{month}/{assetUUID}/original/{filename}` |
| `originalUrl` | text (readOnly) | Unsigned GCS or local URL. Rewritten to signed URL by `signCloudUrls` on read |
| `proxyUrl` | text (readOnly) | Medium WebP proxy — signed on read |
| `thumbnailUrl` | text (readOnly) | Small WebP thumbnail — signed on read |
| `accessionId` | text (unique, indexed) | Permanent archival code e.g. `FRH-2024-0001` |
| `archivalSequence` | number (unique) | Atomic intake counter |
| `shootName` | text (indexed) | Archival shoot identity, synced from Session |
| `uploadBatchId` | relationship → UploadBatches | Nullable, `ON DELETE SET NULL` |
| `session` | relationship → Sessions | Optional; links asset to a creative session |
| `mediaType` | select | `image`, `raw`, `video`, `audio`, `document`, `unclassified` |
| `ingestionStatus` | select (readOnly) | `active`, `processing`, `stale`, `ready`, `failed` |
| `processingStep` | select (readOnly) | Current pipeline step |
| `captureDate` | date (indexed) | Primary sort key, from EXIF |
| `technical` | group | `cameraMake`, `cameraModel`, `lensModel`, `iso`, `aperture`, `shutterSpeed`, `focalLength` |
| `location` | group | `latitude`, `longitude`, `address` |
| `manualTags` | array of `{tag}` | User-applied archival tags |
| `heuristicTags` | array of `{tag}` (readOnly) | Rule-based tags from ingestion |
| `filesize`, `width`, `height`, `aspectRatio` | number/text (readOnly) | Populated by worker callback |
| `errorMessage` | text (readOnly) | Set on failure |
| `owner` | relationship → Users (required) | Auto-set to `req.user.id` on create |
| `filename` | text (readOnly) | Slugified, path-safe filename |
| `originalFilename` | text (readOnly, indexed) | Pre-slugify name for display and search |
| `mimeType` | text (readOnly) | MIME type |

### Access Rules

| Operation | Rule |
|---|---|
| read | `() => true` (public metadata) |
| create | `creativeOrAdmin` |
| update | `ownerOrAdmin` |
| delete | `ownerOrAdmin` |

### Hook Chain (execution order)

| Stage | Hook | Purpose |
|---|---|---|
| `beforeOperation` | `preventDuplicates` | Rejects re-uploads of identical files for the same owner |
| `beforeChange` | `writeOriginalToEnclave` | Local mode: writes bytes to tenant enclave path. No-op in cloud. |
| `beforeChange` | `generateAccessionId` | Mints `accessionId` and `archivalSequence` on first create |
| `beforeChange` | `extractMetadata` | Parses EXIF from local file buffer |
| `beforeChange` | `syncShootNameFromSession` | Copies `session.name` → `shootName` if session is set |
| `afterRead` | `aliasUrl` | Copies `originalUrl` → `url` for legacy consumers |
| `afterRead` | `signCloudUrls` | Rewrites `originalUrl`, `thumbnailUrl`, `proxyUrl` to v4 signed GET URLs when `GCS_BUCKET` is set |
| `afterChange` | `triggerLocalWorker` | Fires a detached fetch to `LOCAL_WORKER_URL`. No-op in cloud. |
| `afterDelete` | `cleanupEnclave` | Removes the tenant enclave directory for the deleted asset |

### Relations
- `uploadBatchId` → UploadBatches (nullable FK)
- `session` → Sessions (optional)
- `owner` → Users

### Search
Full-text search via GIN index `media_search_idx` over `to_tsvector('english', title || filename || original_filename || technical_camera_model || technical_lens_model || shoot_name)`. New searchable fields must be added to **both** the migration and `/api/media/search`.

### Important Notes
- **Never persist signed URLs** — they have a 1-hour TTL. Always read fresh from Payload.
- Read media src via: `thumbnailUrl || proxyUrl || originalUrl || url`.
- `url` is a Payload-internal fallback field; prefer the explicit URL fields.
- `filesRequiredOnCreate: false` is mandatory — without it Payload throws `MissingFile` on cloud uploads.

---

## Portfolios

**File:** `src/collections/Portfolios/index.ts`  
**Slug:** `portfolios`

### Purpose
Creative portfolios displayed publicly at `/p/{slug}`. Support drafts/autosave, version history (10 per doc), folder organisation via Payload's folder plugin, and a full client review system.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `name` | text (required) | Internal display name |
| `title` | richText | Public heading (minimalist Lexical) |
| `subheading` | richText | Public subheading |
| `slug` | text (unique, readOnly) | Auto-generated from owner username + name |
| `owner` | relationship → Users | Auto-set on create |
| `visibility` | select | `private`, `public`, `shared` (password-protected) |
| `password` | text | Shown only when `visibility === 'shared'` |
| `clientReviewSettings` | group | `allowSelection`, `allowComments`, `allowDownload`, `requireClientIdentification`, `selectionLimit`, `downloadQuality` (`proxy` / `original`), `reviewMessage` |
| `theme` | group | `fontPairing`, `backgroundColor`, `textColor`, `accentColor` |
| `layoutBlocks` | blocks | `grid`, `text`, `featured`, `spacer` |

#### Grid Block Fields
- `sectionName`, `sectionAnchor` (auto-generated), `sectionAnchorOverride` (admin only)
- `layoutStyle`: `masonry`, `filmstrip`, `uniform_grid`
- `filmstripTrackHeight`, `uniformGridColumns` (hidden in UI, managed by `SectionLayoutAdminField`)
- `items[]`: `media` (relationship → Media, nullable), `size`, `alt`, `caption`, `link`, `instanceId`, `instanceTitle`, `focalPoint`, `videoThumbnail`

### Access Rules

| Operation | Rule |
|---|---|
| create | `() => true` |
| read | Admin: all. Unauthenticated: published + visibility `public`/`shared`. Authenticated: own docs + published public/shared. |
| update | `ownerOrAdmin` |
| delete | `ownerOrAdmin` |

### Hooks

| Stage | Hook | Purpose |
|---|---|---|
| `beforeChange` | `reorderItems` | Syncs item order from `itemsOrder` field |
| `beforeChange` | `stripDocumentId` | Removes stray `id` fields from block data |
| `beforeChange` | `generateSlug` | Builds `{username}-{slugified-name}` slug |
| `beforeChange` | `ensureLibraryAssignment` | Assigns portfolio to "Portfolio Library" folder |
| `beforeChange` | `deduplicateSectionAnchors` | Ensures section anchors are unique within the doc |
| `afterChange` | `auditAdminChanges` | Writes to `AdminActivityLogs` when an admin modifies a portfolio |

### Admin UI
- Group: `Content`
- Live preview at `/p/{slug}`
- Custom `LibraryRedirector` component redirects list view to the folder browser
- Custom `FolderCell` renders folder path in list columns
- `SectionLayoutAdminField` provides a visual layout picker for grid blocks
- `ModernMasonryEditor` handles the drag-and-drop grid item editor

### Notes
- Media FKs inside `layoutBlocks` are nullable (`required: false`) so `ON DELETE SET NULL` works without violating constraints.
- `sectionAnchorOverride` is admin-only and hidden from the standard admin UI (condition `() => false`).
- Autosave interval: 3000ms.

---

## Sessions

**File:** `src/collections/Sessions/index.ts`  
**Slug:** `sessions`

### Purpose
Creative shoot sessions. Group media assets by a named shoot for organisation and smart collection generation. One session can have many media assets; each media asset can belong to one session.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `name` | text (required, indexed) | Normalised via `normalizeSessionName` hook |
| `shootDate` | date (indexed) | Primary shoot date |
| `description` | textarea | Optional notes |
| `location` | group | `address`, `latitude`, `longitude` |
| `defaultTags` | array of `{tag}` | Pre-applied to all assets ingested under this session |
| `coverAsset` | relationship → Media | Hero image for session grid |
| `owner` | relationship → Users | Auto-set on create |

### Access Rules

| Operation | Rule |
|---|---|
| read | `ownerOrAdmin` |
| create | `creativeOrAdmin` |
| update | `ownerOrAdmin` |
| delete | `ownerOrAdmin` |

### Hooks
- `normalizeSessionName` (`name.beforeValidate`): trims whitespace and normalises casing.

---

## SmartCollections

**File:** `src/collections/SmartCollections/index.ts`  
**Slug:** `smart-collections`

### Purpose
Saved filter views over the Media collection. Can be user-created (manual) or auto-generated from asset metadata (system). System-generated collections are re-generated on a debounced schedule after assets reach `ready` status.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `name` | text (required) | Display name |
| `owner` | relationship → Users (indexed) | — |
| `filterQuery` | json (required) | Payload `Where` query object |
| `icon` | select | `folder`, `tag`, `sparkles`, `camera`, `map` |
| `description` | textarea | — |
| `isSystemGenerated` | checkbox (readOnly) | Auto-generated flag; cleared when user edits filter rules |
| `isHidden` | checkbox | Soft-hide from grid |
| `sortOrder` | number (indexed) | Lower = earlier in grid |
| `generatedFrom` | select (indexed) | `manual`, `ai_tags`, `metadata`, `tags`, `location`, `media_type`, `camera`, `date` |
| `coverAsset` | relationship → Media | Override cover image |
| `manualIncludes` | relationship → Media (hasMany) | Always included, cap 500 |
| `manualExcludes` | relationship → Media (hasMany) | Always excluded, takes priority |

### Access Rules

| Operation | Rule |
|---|---|
| create | `creativeOrAdmin` |
| read | `ownerOrAdmin` |
| update | `ownerOrAdmin` |
| delete | `ownerOrAdmin` |

### Hooks
- `beforeChange`: Strips `isSystemGenerated` flag when the user modifies `filterQuery` on a previously system-generated collection.

---

## UploadBatches

**File:** `src/collections/UploadBatches/index.ts`  
**Slug:** `upload-batches`

### Purpose
Groups all media uploads from a single "Start Archival Ingest" click. Each Media doc carries a nullable `uploadBatchId` FK. Deleting a batch nullifies the FK on media (assets survive). Asset count is derived on-demand via `payload.count`, not stored.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `owner` | relationship → Users (indexed) | Auto-set on create |
| `source` | select | `dashboard`, `admin`, `seed`, `api` |
| `notes` | text | Free-form admin note |

### Access Rules

| Operation | Rule |
|---|---|
| read | `ownerOrAdmin` |
| create | `creativeOrAdmin` |
| update | `ownerOrAdmin` |
| delete | `ownerOrAdmin` |

---

## Pages

**File:** `src/collections/Pages/index.ts`  
**Slug:** `pages`

### Purpose
CMS-managed public pages. Block-based layout system. Versions + drafts with autosave. Core system pages (`pricing`, `about`, `features`, `hub`, `learn`, `company`) are deletion-protected.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `title` | text (required) | — |
| `publishedOn` | date | Auto-set when `_status` → `published` |
| Hero tab | — | `hero` field (from `src/fields/hero`) |
| Content tab | `layout` | Blocks: CTA, Content, MediaBlock, Archive, Carousel, ThreeItemGrid, Banner, FormBlock, Pricing, SprocketDivider, About3, ArticleGrid, DownloadGrid, TutorialGrid |
| SEO tab | `meta` | Title, image, description via `@payloadcms/plugin-seo` |
| `slug` | text (unique) | Core slugs are lock-protected |
| `isProtected` | checkbox (readOnly) | System-critical flag |

### Access Rules

| Operation | Rule |
|---|---|
| create | `adminOnly` |
| read | `adminOrPublishedStatus` |
| update | `adminOnly` |
| delete | `adminOnly` |

### Hooks
- `afterChange` / `afterDelete`: `revalidatePage` / `revalidateDelete` — calls `revalidatePath` for ISR cache busting.
- `beforeDelete`: `protectCoreRecord` — throws on attempts to delete core pages.

---

## Categories

**File:** `src/collections/Categories.ts`  
**Slug:** `categories`

### Purpose
Taxonomy for content collections (Articles, etc.). Simple slug + title.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `title` | text (required) | — |
| `slug` | text | Auto-generated via `slugField` utility |

### Access Rules
- read: `() => true`
- All others: Payload default (authenticated).

---

## Articles

**File:** `src/collections/Articles/index.ts`  
**Slug:** `articles`

### Purpose
Blog/editorial articles published under `/learn/articles/{slug}`. Admin-only CRUD. Drafts + autosave. Versions up to 20.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `title` | text (required) | — |
| `excerpt` | textarea | Shown on listing cards |
| `category` | select | `guide`, `workflow`, `news`, `tips` |
| `readTime` | number | Minutes |
| `heroImage` | upload → media | — |
| `publishedOn` | date | Auto-set on first publish |
| `content` | richText | Full Lexical with headings |
| `meta` (tab) | SEO fields | Via `@payloadcms/plugin-seo` |
| `slug` | text | Auto-generated from title |

### Access Rules

| Operation | Rule |
|---|---|
| create/update/delete | `adminOnly` |
| read | `adminOrPublishedStatus` |

### Hooks
- `afterChange`: `revalidatePath` for `/learn/articles/{slug}` and `/learn`.
- `afterDelete`: Same revalidation.

---

## Downloads

**File:** `src/collections/Downloads/index.ts`  
**Slug:** `downloads`

### Purpose
Downloadable resources (LUTs, templates, presets) listed on the /learn page. Admin-only CRUD. Drafts + autosave.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `title` | text (required) | — |
| `description` | textarea | — |
| `fileType` | select | `lut`, `template`, `preset`, `other` |
| `thumbnail` | upload → media | — |
| `downloadFile` | upload → media | The actual file |
| `externalUrl` | text | Alternative to uploading directly |
| `requiresAccount` | checkbox | Default `true` — requires login to download |
| `tags` | array of `{tag}` | — |

### Access Rules
Same as Articles: `adminOnly` for mutations, `adminOrPublishedStatus` for reads.

---

## Tutorials

**File:** `src/collections/Tutorials/index.ts`  
**Slug:** `tutorials`

### Purpose
Step-by-step tutorials published under `/learn/tutorials/{slug}`. Admin-only CRUD. Drafts + autosave. Versions up to 20.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `title` | text (required) | — |
| `description` | textarea | Card summary |
| `category` | select | `getting-started`, `organise`, `publish`, `advanced` |
| `difficulty` | select | `beginner`, `intermediate`, `advanced` |
| `duration` | text | e.g. `"5 min"` |
| `order` | number | Display sort, lower = earlier |
| `heroImage` | upload → media | — |
| `steps` | array | Each: `stepTitle`, `stepContent` (richText), `stepImage` |
| `meta` (tab) | SEO fields | Via plugin-seo |
| `slug` | text | Auto-generated |

### Access Rules
Same as Articles: `adminOnly` for mutations, `adminOrPublishedStatus` for reads.

---

## PortfolioClientSessions

**File:** `src/collections/PortfolioClientSessions/index.ts`  
**Slug:** `portfolio-client-sessions`

### Purpose
Anonymous/identified client sessions for portfolio review portals. One session per browser visit. Sessions expire after 7 days (rolling TTL). Selections are saved here mid-review before final submission.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `portfolio` | relationship → Portfolios (indexed) | — |
| `sessionToken` | text (unique, indexed) | HMAC-signed, stored in httpOnly cookie |
| `clientName` | text | Set via identify endpoint |
| `clientEmail` | email | Optional, set via identify endpoint |
| `ipAddress` | text (readOnly) | Last 2 octets masked |
| `userAgent` | text (readOnly) | — |
| `isIdentified` | checkbox | True after identification modal |
| `expiresAt` | date (indexed) | 7-day rolling TTL |
| `savedSelectionIds` | array | `{mediaId, instanceId}` — in-progress selections |

### Access Rules
- create: `() => true` (anonymous clients)
- read/update/delete: `adminOnly`

---

## PortfolioClientReviews

**File:** `src/collections/PortfolioClientReviews/index.ts`  
**Slug:** `portfolio-client-reviews`

### Purpose
Formal asset selections submitted by clients. Immutable snapshot of selections at submission time. Creatives see reviews for their own portfolios; admins see all.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `portfolio` | relationship → Portfolios (indexed) | — |
| `clientSession` | relationship → PortfolioClientSessions (indexed) | Source session |
| `clientName` | text (required) | — |
| `clientEmail` | email | — |
| `status` | select (indexed) | `submitted`, `acknowledged`, `approved`, `archived` |
| `selectedItems` | array (min 1) | `{media, instanceId, instanceTitle}` |
| `itemCount` | number (readOnly) | Denormalised, set by hook |
| `clientNote` | textarea (max 1000) | Optional submission note |
| `submittedAt` | date (indexed, required) | — |
| `acknowledgedAt`, `acknowledgedBy` | date, relationship → Users | Set via dashboard acknowledge |

### Access Rules
- create: `() => true`
- read/update: admin OR `portfolio.owner === user.id`
- delete: `adminOnly`

### Hooks
- `beforeChange`: Auto-computes `itemCount = selectedItems.length`.

---

## PortfolioAssetComments

**File:** `src/collections/PortfolioAssetComments/index.ts`  
**Slug:** `portfolio-asset-comments`

### Purpose
Per-asset comments from clients during portfolio review. Visible to portfolio owner and admins only.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `portfolio` | relationship → Portfolios (indexed) | — |
| `media` | relationship → Media (indexed) | The commented asset |
| `clientSession` | relationship → PortfolioClientSessions (indexed) | — |
| `clientName` | text (required) | — |
| `clientEmail` | email | — |
| `body` | textarea (required, max 2000) | Comment text |
| `status` | select (indexed) | `visible`, `resolved`, `archived` |
| `resolvedAt`, `resolvedBy` | date, relationship → Users | — |

### Access Rules
- create: `() => true`
- read/update: admin OR `portfolio.owner === user.id`
- delete: `adminOnly`

---

## PortfolioDownloadLogs

**File:** `src/collections/PortfolioDownloadLogs/index.ts`  
**Slug:** `portfolio-download-logs`

### Purpose
Immutable audit log of every zip download event from a portfolio review. Updates are disabled at the access-control level.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `portfolio` | relationship → Portfolios (indexed) | — |
| `clientSession` | relationship → PortfolioClientSessions | — |
| `clientName` | text | — |
| `downloadedItems` | array of `{media}` | — |
| `itemCount` | number | — |
| `quality` | select | `proxy`, `original` |
| `zipFilename` | text | — |
| `downloadedAt` | date (indexed, required) | — |
| `ipAddress` | text | — |

### Access Rules
- create: `() => true`
- read: `adminOnly`
- update: `() => false` (immutable)
- delete: `adminOnly`

---

## AdminActivityLogs

**File:** `src/collections/AdminActivityLogs/index.ts`  
**Slug:** `admin-activity-logs`

### Purpose
Immutable audit trail of all administrative actions on creative accounts (inspect, diagnostic sessions, role changes, portfolio modifications, etc.). Written only by server-side hooks via `overrideAccess`.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `adminUser` | relationship → Users (indexed) | The acting admin |
| `targetUser` | relationship → Users (indexed) | Creative acted upon |
| `targetPortfolio` | relationship → Portfolios (indexed) | If action targeted a portfolio |
| `actionType` | select (indexed, required) | `inspect_account`, `launch_diagnostic`, `terminate_diagnostic`, `diagnostic_expired`, `portfolio_password_reset`, `portfolio_visibility_change`, `field_override`, `account_role_change` |
| `actionDescription` | text (required) | Human-readable summary |
| `metadata` | json | Structured context (field changes, session IDs) |
| `diagnosticSession` | relationship → AdminDiagnosticSessions | — |
| `ipAddress`, `userAgent` | text | — |

### Access Rules
- create: `() => true` (server-side only; guard is `overrideAccess: true` at call site)
- read: `adminOnly`
- update: `() => false` (immutable)
- delete: `() => false` (immutable)

---

## AdminDiagnosticSessions

**File:** `src/collections/AdminDiagnosticSessions/index.ts`  
**Slug:** `admin-diagnostic-sessions`

### Purpose
Short-lived read-only sessions allowing admins to view a creative's workspace. TTL is 15 minutes. Token is stored as a SHA-256 hash — never plaintext.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `admin` | relationship → Users (indexed) | Who launched the session |
| `targetCreative` | relationship → Users (indexed) | Workspace being viewed |
| `tokenHash` | text (unique, readOnly) | SHA-256 of raw token |
| `expiresAt` | date (indexed) | 15 minutes from creation |
| `isActive` | checkbox (indexed) | False when expired or manually terminated |
| `terminatedAt` | date | — |
| `terminatedBy` | relationship → Users | — |
| `ipAddress`, `userAgent` | text | — |

### Access Rules
All operations: `adminOnly`

---

## Waitlist

**File:** `src/collections/Waitlist.ts`  
**Slug:** `waitlist`

### Purpose
Email signups from the Coming Soon page. Pre-launch list, minimal shape.

### Key Fields

| Field | Type | Notes |
|---|---|---|
| `email` | email (required, unique) | — |
| `name` | text | Optional |

### Access Rules
- read/create: `() => true`
- update: `() => false`
- delete: `() => true`
