# API Reference

Custom Next.js Route Handlers live in `src/app/api/`. Payload's auto-generated REST API is at `/api/{collection}` — see the [Payload docs](https://payloadcms.com/docs/rest-api/overview) for full query syntax.

All endpoints accept and return JSON. Authentication is via HTTP-only cookie (browser) or `Authorization: JWT <token>` header (API clients).

---

## Health Check

### GET /api/healthz

Verifies database connectivity.

**Auth:** None

**Response 200:**
```json
{ "db": "ok" }
```

**Response 503:**
```json
{ "db": "error" }
```

---

## Media Ingestion

### POST /api/media/signed-url

Get a GCS v4 signed upload URL for direct browser-to-GCS upload (cloud mode only).

**Auth:** Required (any authenticated user)

**Request Body:**
```json
{
  "filename": "wedding-portraits.jpg",
  "mimeType": "image/jpeg",
  "filesize": 8388608,
  "sessionId": "abc123",
  "shootName": "Summer Wedding 2024",
  "manualTags": [{"tag": "portrait"}, {"tag": "outdoor"}],
  "uploadBatchId": "batch-uuid"
}
```

**Fields:**
- `filename` (required): Original filename
- `mimeType` (required): MIME type. Empty string is normalised to `application/octet-stream`.
- `filesize` (optional): Used for pre-flight size enforcement before issuing the URL
- `sessionId`, `shootName`, `manualTags`, `uploadBatchId`: Metadata forwarded to the media doc

**Response 200:**
```json
{
  "uploadUrl": "https://storage.googleapis.com/bucket/path?X-Goog-Signature=...",
  "storagePath": "tenants/1/images/2024/06/uuid/original/wedding-portraits.jpg",
  "signedHeaders": { "Content-Type": "image/jpeg" },
  "assetId": null
}
```

**Error Codes:**
- `400` — Missing `filename` or `mimeType`
- `401` — Unauthenticated
- `413` — File exceeds size limit for this media type

**Notes:**
- Client must PUT directly to `uploadUrl` with the `Content-Type` header from `signedHeaders`.
- After PUT completes, call `/api/media/register-gcs` with the `storagePath`.

---

### POST /api/media/register-local

Upload raw file bytes (local/dev mode only). Bypasses GCS.

**Auth:** Required

**Request:** Raw binary body. Required headers:

| Header | Value |
|---|---|
| `Content-Type` | MIME type of the file |
| `X-Filename` | Original filename |
| `X-Upload-Meta` | Base64-encoded JSON: `{sessionId?, shootName?, manualTags?, uploadBatchId?}` |

**Do not use `FormData`** — `req.formData()` is unreliable on Node 22 + Next 15 in CI.

**Response 200:**
```json
{
  "id": 42,
  "accessionId": "FRH-2024-0001",
  "ingestionStatus": "processing"
}
```

**Error Codes:**
- `400` — Missing headers
- `401` — Unauthenticated
- `413` — File exceeds size limit

---

### POST /api/media/register-gcs

Register a GCS-uploaded media doc after the signed-URL PUT completes.

**Auth:** Required

**Request Body:**
```json
{
  "filename": "wedding-portraits.jpg",
  "mimeType": "image/jpeg",
  "filesize": 8388608,
  "storagePath": "tenants/1/images/2024/06/uuid/original/wedding-portraits.jpg",
  "title": "Wedding Portraits",
  "sessionId": "abc123",
  "shootName": "Summer Wedding 2024",
  "manualTags": [{"tag": "portrait"}],
  "uploadBatchId": "batch-uuid"
}
```

**Response 200:**
```json
{
  "id": 42,
  "accessionId": "FRH-2024-0001",
  "ingestionStatus": "processing"
}
```

**Error Codes:**
- `400` — Missing required fields or domain mismatch between `storagePath` and server-derived classification
- `401` — Unauthenticated
- `413` — File exceeds size limit

**Notes:**
- Server re-classifies `mediaType` from `mimeType`+`filename` and validates that the embedded domain in `storagePath` matches. This prevents inconsistent metadata from a path issued for one type but a body claiming another.

---

### POST /api/media/process-callback

Go worker callback to update processing status on a media doc.

**Auth:** `X-Processor-Secret` header must match `PROCESSOR_CALLBACK_SECRET` env var (not JWT auth).

**Request Body:**
```json
{
  "assetId": 42,
  "status": "ready",
  "processingStep": "ready",
  "errorMessage": null,
  "dimensions": { "width": 4000, "height": 2667 },
  "technical": {
    "cameraMake": "Sony",
    "cameraModel": "A7 IV",
    "iso": 400,
    "aperture": 2.8,
    "shutterSpeed": "1/500",
    "focalLength": 85
  },
  "location": { "latitude": 51.5, "longitude": -0.1 },
  "thumbnails": {
    "small": "tenants/1/images/2024/06/uuid/small/thumb.webp",
    "medium": "tenants/1/images/2024/06/uuid/medium/proxy.webp"
  }
}
```

**Response 200:**
```json
{ "ok": true }
```

**Error Codes:**
- `400` — Missing `assetId` or `status`
- `401` — Invalid or missing `X-Processor-Secret`

**Notes:**
- After a doc reaches `ready`, schedules `generateSmartCollections` for the owner with a 45-second debounce.
- On failure status, stores `errorMessage` and sets `ingestionStatus: 'failed'`.

---

### GET /api/media/status-stream

SSE stream of real-time processing status updates for a set of media IDs.

**Auth:** Required

**Query Parameters:**
- `ids` — Comma-separated media IDs to watch

**Response:** `text/event-stream`

```
data: {"id":42,"ingestionStatus":"ready","processingStep":"ready","thumbnailUrl":"..."}

data: {"id":43,"ingestionStatus":"failed","errorMessage":"cwebp failed"}
```

**Notes:**
- SSE alone has been observed to silently fail in CI. The upload UI uses a 3-second polling backstop alongside this stream — do not remove either.

---

### GET /api/media/search

Full-text search over the media library using the `media_search_idx` GIN index.

**Auth:** Required

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | — | Search query |
| `limit` | number | 20 | Max results |
| `offset` | number | 0 | Pagination offset |
| `mediaType` | string | — | Filter by media type |
| `sessionId` | string | — | Filter by session |

**Response 200:**
```json
{
  "docs": [
    {
      "id": 42,
      "title": "Wedding Portraits",
      "thumbnailUrl": "https://...",
      "mediaType": "image",
      "ingestionStatus": "ready"
    }
  ],
  "totalDocs": 1,
  "hasNextPage": false
}
```

**Notes:**
- Searches across: `title`, `filename`, `originalFilename`, `technical.cameraModel`, `technical.lensModel`, `shootName`.
- Add new searchable fields to both the GIN index migration and this route handler.

---

### GET /api/media/{id}

Get single media doc status (used for polling fallback).

**Auth:** Required

**Response 200:**
```json
{
  "id": 42,
  "ingestionStatus": "ready",
  "processingStep": "ready",
  "thumbnailUrl": "https://...",
  "proxyUrl": "https://...",
  "originalUrl": "https://..."
}
```

**Error Codes:**
- `404` — Not found or not owned by requesting user

---

### POST /api/media/reprocess

Re-trigger the Go worker for a media doc in `failed` or `stale` status.

**Auth:** Required (owner or admin)

**Request Body:**
```json
{ "id": 42 }
```

**Response 200:**
```json
{ "ok": true }
```

**Error Codes:**
- `400` — Doc not in a reprocessable state
- `403` — Not owner or admin
- `404` — Doc not found

---

## Portfolio Review

All portfolio review endpoints operate on the public portfolio by slug. No Payload JWT auth is required — client identity is managed via httpOnly session cookie.

### POST /api/portfolio-review/{slug}/session

Create or refresh a client review session.

**Auth:** None (cookie-based)

**Response 200:**
```json
{
  "sessionId": "sess_abc123",
  "isIdentified": false,
  "savedSelectionIds": []
}
```

**Notes:**
- Sets an httpOnly `frh-review-session` cookie with 7-day TTL.
- If a valid session cookie already exists, refreshes the TTL and returns current state.

---

### POST /api/portfolio-review/{slug}/session/identify

Set client name/email on an existing session.

**Auth:** Session cookie required

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response 200:**
```json
{ "ok": true, "isIdentified": true }
```

**Error Codes:**
- `400` — Missing name (required when portfolio has `requireClientIdentification: true`)
- `401` — No valid session

---

### GET /api/portfolio-review/{slug}/session/selections

Get current saved selections for the active session.

**Auth:** Session cookie required

**Response 200:**
```json
{
  "selections": [
    { "mediaId": 42, "instanceId": "grid-item-abc" }
  ]
}
```

---

### POST /api/portfolio-review/{slug}/session/selections

Save in-progress asset selections (autosave, not final submission).

**Auth:** Session cookie required

**Request Body:**
```json
{
  "selections": [
    { "mediaId": 42, "instanceId": "grid-item-abc" }
  ]
}
```

**Response 200:**
```json
{ "ok": true }
```

**Error Codes:**
- `400` — Selection exceeds `selectionLimit` set on portfolio

---

### POST /api/portfolio-review/{slug}/submit

Submit final asset selection as a formal review.

**Auth:** Session cookie required. If `requireClientIdentification: true`, session must be identified first.

**Request Body:**
```json
{
  "clientNote": "These are my top picks!"
}
```

**Response 200:**
```json
{
  "reviewId": "rev_xyz",
  "itemCount": 5,
  "submittedAt": "2024-06-01T10:00:00Z"
}
```

**Error Codes:**
- `400` — No selections, or client not identified when required, or `allowSelection: false`
- `401` — No valid session

---

### POST /api/portfolio-review/{slug}/comments/{mediaId}

Add a comment to a specific asset.

**Auth:** Session cookie required. Portfolio must have `allowComments: true`.

**Request Body:**
```json
{
  "body": "I love the lighting on this one."
}
```

**Response 201:**
```json
{ "id": "comment_abc", "ok": true }
```

**Error Codes:**
- `400` — Empty body, body > 2000 chars, or `allowComments: false`
- `401` — No valid session

---

### POST /api/portfolio-review/{slug}/download

Download selected assets as a zip archive.

**Auth:** Session cookie required. Portfolio must have `allowDownload: true`.

**Request Body:**
```json
{
  "mediaIds": [42, 43, 44],
  "quality": "proxy"
}
```

**Response:** Binary zip file stream (`application/zip`)

**Error Codes:**
- `400` — `allowDownload: false`, or `quality: 'original'` on a public portfolio
- `401` — No valid session
- `413` — Too many items for one zip

**Notes:**
- `quality` is one of `proxy` (WebP medium) or `original` (raw original file). `original` is blocked for `visibility: 'public'` portfolios.
- Writes a `PortfolioDownloadLog` record after zip generation.

---

## Portfolios

### POST /api/portfolios/unlock

Unlock a password-protected portfolio (`visibility: 'shared'`).

**Auth:** None

**Request Body:**
```json
{
  "slug": "jane-coastal-wedding",
  "password": "secret123"
}
```

**Response 200:**
```json
{ "ok": true }
```

Sets an httpOnly `frh-portfolio-unlock-{slug}` cookie valid for 24 hours.

**Error Codes:**
- `401` — Incorrect password
- `404` — Portfolio not found

---

## Smart Collections

### GET /api/smart-collections

List all smart collections for the authenticated user.

**Auth:** Required

**Query Parameters:**
- `includeHidden=true` — Include collections with `isHidden: true`

**Response 200:**
```json
{
  "docs": [
    {
      "id": "coll_abc",
      "name": "Sony Camera Shots",
      "icon": "camera",
      "isSystemGenerated": true,
      "generatedFrom": "camera",
      "sortOrder": 0
    }
  ]
}
```

---

### POST /api/smart-collections

Create a new smart collection.

**Auth:** Required (`creativeOrAdmin`)

**Request Body:**
```json
{
  "name": "My Favourites",
  "filterQuery": { "manualTags.tag": { "equals": "favourite" } },
  "icon": "tag",
  "description": "Manually tagged favourites"
}
```

**Response 201:**
```json
{ "id": "coll_abc", "name": "My Favourites" }
```

---

### POST /api/smart-collections/generate

Auto-generate smart collections from asset metadata (sessions, camera, location, date, media type, tags).

**Auth:** Required

**Request Body:** Empty `{}`

**Response 200:**
```json
{ "generated": 12, "updated": 3, "skipped": 0 }
```

**Notes:**
- Idempotent — re-running updates existing system-generated collections rather than duplicating.
- This is also triggered automatically on a 45-second debounce after assets reach `ready` via `process-callback`.

---

### POST /api/smart-collections/preview

Preview what assets a filter query would return before saving.

**Auth:** Required

**Request Body:**
```json
{
  "filterQuery": { "mediaType": { "equals": "video" } },
  "limit": 20
}
```

**Response 200:**
```json
{
  "totalDocs": 47,
  "docs": [{ "id": 42, "title": "...", "thumbnailUrl": "..." }]
}
```

---

### GET /api/smart-collections/tag-suggestions

Tag autocomplete for the filter builder.

**Auth:** Required

**Query Parameters:**
- `q` — Partial tag string

**Response 200:**
```json
{ "tags": ["portrait", "outdoor", "golden-hour"] }
```

---

### GET /api/smart-collections/{id}

Get a single smart collection.

**Auth:** Required (owner or admin)

**Response 200:** Full smart collection doc.

---

### PUT /api/smart-collections/{id}

Update a smart collection.

**Auth:** Required (owner or admin)

**Request Body:** Partial smart collection fields.

**Notes:**
- Editing `filterQuery` on a system-generated collection clears `isSystemGenerated` (handled by `beforeChange` hook).

---

### DELETE /api/smart-collections/{id}

Delete a smart collection.

**Auth:** Required (owner or admin)

**Response 200:** `{ "ok": true }`

---

### POST /api/smart-collections/{id}/duplicate

Clone a smart collection.

**Auth:** Required (owner or admin)

**Response 201:**
```json
{ "id": "coll_new", "name": "Sony Camera Shots (copy)" }
```

---

## Admin

### GET /api/admin/creative-metrics/{userId}

Get oversight stats for a creative account.

**Auth:** `adminOnly`

**Response 200:**
```json
{
  "totalAssets": 342,
  "totalPortfolios": 8,
  "totalSessions": 12,
  "recentUploads": 24,
  "failedAssets": 1,
  "storageBytes": 1073741824
}
```

---

### POST /api/admin/diagnostic-sessions

Create a diagnostic session to view a creative's workspace.

**Auth:** `adminOnly`

**Request Body:**
```json
{ "targetUserId": "user_abc" }
```

**Response 201:**
```json
{
  "token": "raw-session-token",
  "expiresAt": "2024-06-01T10:15:00Z"
}
```

**Notes:**
- Token is returned once in plaintext. Only the SHA-256 hash is stored in the DB.
- Session expires in 15 minutes.
- Creates an `AdminActivityLog` entry of type `launch_diagnostic`.

---

### GET /api/admin/diagnostic-sessions/{token}

Get a diagnostic session by raw token.

**Auth:** `adminOnly`

**Response 200:**
```json
{
  "id": "diag_abc",
  "targetCreative": { "id": "user_abc", "name": "Jane" },
  "isActive": true,
  "expiresAt": "2024-06-01T10:15:00Z"
}
```

**Error Codes:**
- `401` — Token does not match any active session
- `410` — Session expired

---

### POST /api/admin/media/force-fail

Force a media doc to `failed` state (testing/diagnostics only).

**Auth:** `adminOnly`

**Request Body:**
```json
{ "id": 42, "errorMessage": "Forced failure for testing" }
```

**Response 200:** `{ "ok": true }`

---

## Dashboard

### POST /api/dashboard/reviews

List client reviews visible to the authenticated creative.

**Auth:** Required

**Request Body:**
```json
{
  "status": "submitted",
  "portfolioId": "port_abc",
  "limit": 20,
  "page": 1
}
```

**Response 200:**
```json
{
  "docs": [
    {
      "id": "rev_abc",
      "clientName": "Jane Doe",
      "portfolio": { "id": "port_abc", "name": "Wedding 2024" },
      "itemCount": 5,
      "status": "submitted",
      "submittedAt": "2024-06-01T10:00:00Z"
    }
  ],
  "totalDocs": 1
}
```

---

### POST /api/dashboard/reviews/{reviewId}/acknowledge

Mark a client review as acknowledged.

**Auth:** Required (portfolio owner or admin)

**Response 200:**
```json
{ "ok": true, "acknowledgedAt": "2024-06-01T11:00:00Z" }
```

---

## Public

### POST /api/coming-soon/waitlist

Join the pre-launch waitlist.

**Auth:** None

**Request Body:**
```json
{ "email": "jane@example.com", "name": "Jane Doe" }
```

**Response 201:**
```json
{ "ok": true }
```

**Error Codes:**
- `409` — Email already on waitlist

---

### GET /api/seed-hub

Remote seeding endpoint. Runs the full seed script against the live database.

**Auth:** `SEED_SECRET` header must match env var `SEED_SECRET`.

**Response 200:** `{ "ok": true }`

**Error Codes:**
- `401` — Invalid or missing secret
- `500` — Seed error (check logs)

**Notes:**
- Only used for remote environments where `pnpm seed` cannot run directly. Never expose without the secret gate.

---

## Payload REST API

Standard Payload CRUD for all collections. Full documentation at https://payloadcms.com/docs/rest-api/overview.

```
POST   /api/users/login              # Authenticate, receive JWT + set cookie
POST   /api/users/logout             # Clear session
POST   /api/users/refresh-token      # Refresh JWT
GET    /api/users/me                 # Current user
POST   /api/users/forgot-password    # Trigger password reset email
POST   /api/users/reset-password     # Complete password reset

GET    /api/{collection}             # List
POST   /api/{collection}             # Create
GET    /api/{collection}/{id}        # Read
PATCH  /api/{collection}/{id}        # Update
DELETE /api/{collection}/{id}        # Delete

GET    /api/globals/{slug}           # Read global
POST   /api/globals/{slug}           # Update global
```

Payload's auto-generated endpoints respect all collection-level access control. Pass `depth=N` to control relationship population depth (default varies by collection).
