# State Providers

All providers are composed in `src/providers/index.tsx` and wrap the entire app.

## Provider Tree

```
ThemeProvider
  HeaderProvider
    AuthProvider
      HeaderThemeProvider
        UploadProvider
          SonnerProvider
          {children}
```

Add new providers inside `UploadProvider` unless they need to wrap auth or theme.

---

## UploadProvider

`src/providers/UploadProvider.tsx` — manages the full media ingestion lifecycle.

### UploadItem Interface

```ts
interface UploadItem {
  id: string
  file?: File              // present for client-originated uploads
  filename?: string        // present for server-hydrated items
  progress: number         // 0-100, raw XHR upload progress
  status: UploadStatus     // see lifecycle below
  errorMessage?: string
  mediaId?: string | number  // set after backend registration
  processingStartedAt?: number
  processingStep?: string    // granular worker stage
  source?: 'upload' | 'server'
  metadata?: {
    tags?: string[]
    title?: string
    location?: { address?: string; latitude?: number; longitude?: number }
    sessionId?: number
    shootName?: string
    uploadBatchId?: number
  }
}

type UploadStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'failed'
```

### Status Lifecycle

```
pending → uploading → processing → ready
                    ↘ failed
```

- `pending`: staged, waiting for queue slot
- `uploading`: XHR/PUT in flight (progress 0–100%)
- `processing`: bytes received by backend, Go worker running (progress 65–95%)
- `ready`: worker complete, asset available
- `failed`: any stage failure — `errorMessage` populated

### computeEffectiveProgress()

Maps status + processingStep to a display percentage:

| Condition | Progress |
|---|---|
| status: uploading | `Math.round(item.progress * 0.6)` (caps at 60%) |
| processingStep: upload_complete | 65% |
| processingStep: exif_parsing | 75% |
| processingStep: generating_webp | 85% |
| processingStep: registering_assets | 95% |
| status: ready or failed | 100% |

Import directly: `import { computeEffectiveProgress } from '@/providers/UploadProvider'`

### Context API

```ts
interface UploadContextType {
  queue: UploadItem[]
  stagedFiles: File[]
  isUploading: boolean
  isWorkbenchOpen: boolean
  addFiles(files: File[], metadata?: UploadMetadata): void
  commitStagedFiles(metadata?: UploadMetadata): void
  clearQueue(): void
  closeWorkbench(): void
  cancelUpload(id: string): void
  openPicker(): void
  retryFailed(): void
  retryItem(id: string): void
  hydrateServerProcessing(items: { mediaId: string | number; filename: string; processingStep?: string }[]): void
}
```

### addFiles()

Called to stage files into the queue. Runs a client-side pre-flight before enqueuing:

1. Derives `mediaType` from MIME + extension via `mediaTypeFromMimeAndExtension()`
2. Checks against `MAX_BYTES_BY_MEDIA_TYPE` — oversized files get a Sonner toast and are skipped
3. Deduplicates by `filename+size` key — silent skip for duplicates
4. Appends accepted files as `pending` items to `queue`

### commitStagedFiles()

Called when the user clicks "Start Archival Ingest" in the workbench:

1. POSTs to `/api/upload-batches` to mint an `UploadBatch` doc — non-blocking (failures don't abort)
2. Calls `addFiles(stagedFiles, { ...metadata, uploadBatchId })` to move staged files into the queue
3. Closes the workbench

The `uploadBatchId` is stamped on every Media doc in the batch for timeline/history surfaces.

### Upload Flow: Local Mode

When `/api/media/signed-url` returns `{ localMode: true }`:

1. Build `X-Upload-Meta` header: `btoa(unescape(encodeURIComponent(JSON.stringify(meta))))`
2. XHR `POST` to `/api/media/register-local` with:
   - `Content-Type`: file MIME type
   - `X-Filename`: original filename
   - `X-Upload-Meta`: base64-encoded JSON metadata
   - Body: raw file bytes (no FormData — unreliable on Node 22 + Next 15 in CI)
3. Progress tracked via `xhr.upload.onprogress`
4. On success: extract `mediaId` from response, transition to `processing`

### Upload Flow: Cloud Mode

When signed-url returns a GCS signed URL:

1. XHR `PUT` directly to GCS signed URL with raw file bytes + `Content-Type`
2. Progress tracked via `xhr.upload.onprogress`
3. On GCS success (status 200): POST to `/api/media/register-gcs` with filename, mimeType, filesize, storagePath, metadata
4. Extract `mediaId` from register response, transition to `processing`

### SSE Connection

While any item has status `processing`, a single `EventSource` connects to `/api/media/status-stream?mediaIds=` (unfiltered — client filters by `mediaId`). Events:

```json
{ "mediaId": "123", "ingestionStatus": "ready", "processingStep": "registering_assets" }
```

The SSE connection is keyed on the sorted set of processing mediaIds (`processingIdsKey`). It only reconnects when the set changes — not on every queue render.

### 3-Second Polling Backstop

SSE can silently fail in CI (events emitted on a different module instance). Always-on polling runs alongside SSE while items are processing:

- Every 3s: GET `/api/media/{id}` for each processing mediaId
- Calls `handleProcessingEvent()` with the response — same handler as SSE
- Both mechanisms are idempotent; whichever fires first wins

**Do not remove the polling backstop.**

### Consuming UploadProvider

```tsx
'use client'
import { useUpload } from '@/providers/UploadProvider'

export function MyComponent() {
  const { queue, addFiles, openPicker, isUploading } = useUpload()

  return (
    <button onClick={openPicker} disabled={isUploading}>
      Add Files
    </button>
  )
}
```

`useUpload()` throws if called outside `UploadProvider`. It is only available in client components.

### hydrateServerProcessing()

Used on dashboard load to rehydrate any in-flight items from a previous session:

```tsx
// In a dashboard page component (server side fetches items with ingestionStatus: 'processing')
hydrateServerProcessing([
  { mediaId: 42, filename: 'photo.dng', processingStep: 'generating_webp' }
])
```

These items enter the queue with `source: 'server'` and status `processing`, and are tracked by the SSE/polling system. Stale `processing` docs (from failed worker runs) can block the "Archival Complete" state — assert on per-doc state via `/api/media/{id}` when writing tests.

---

## AuthProvider

`src/providers/Auth/index.tsx` — wraps Payload's auth REST endpoints.

### Consuming Auth

```tsx
'use client'
import { useAuth } from '@/providers/Auth'

export function MyComponent() {
  const { user, status, login, logout } = useAuth()

  if (status === undefined) return <Spinner />   // initial fetch in flight
  if (!user) return <LoginPrompt />

  return <div>Welcome, {user.email}</div>
}
```

### Auth Context

```ts
type AuthContext = {
  user?: User | null        // null = logged out, undefined = loading
  status: 'loggedIn' | 'loggedOut' | undefined
  login(args: { email: string; password: string }): Promise<User>
  logout(): Promise<void>
  create(args: { email: string; password: string; passwordConfirm: string }): Promise<void>
  forgotPassword(args: { email: string }): Promise<void>
  resetPassword(args: { password: string; passwordConfirm: string; token: string }): Promise<void>
  setUser(user: User | null): void
}
```

### Role Checks

The `User` type (from `@/payload-types`) includes a `role` field. Access control for admin-only routes:

```tsx
const { user } = useAuth()
const isAdmin = user?.role === 'admin'
```

Server-side access control uses `src/access/*` modules — never inline access logic in components.

---

## Toast Notifications (Sonner)

`SonnerProvider` (`src/providers/Sonner.tsx`) mounts the Sonner `<Toaster>` globally.

Usage anywhere in the app:

```tsx
import { toast } from 'sonner'

toast.success('Asset ingested successfully.')
toast.error('Upload failed: file too large.')
toast.loading('Processing...')
toast.dismiss()
```

UploadProvider already fires toasts for upload errors and batch completion. Do not fire duplicate toasts for the same lifecycle event.

---

## Theme Provider

`ThemeProvider` wraps `next-themes` with `attribute="class"` so Tailwind `dark:` variants respond to the `dark` class on `<html>`.

```tsx
import { useTheme } from 'next-themes'

const { resolvedTheme, setTheme } = useTheme()
// resolvedTheme resolves 'system' → actual 'dark' or 'light'
setTheme('dark')
```

Theme is persisted via cookie for SSR consistency. Always use `resolvedTheme` (not `theme`) when reading the current value.

---

## Server Actions

`src/app/(dashboard)/actions/` contains Next.js Server Actions for dashboard mutations:

| File | Exports | Use for |
|---|---|---|
| `media.ts` | `revalidateDashboardAction()` | Trigger ISR revalidation after ingest completes |
| `portfolios.ts` | Portfolio CRUD actions | Creating/updating portfolio docs |
| `collections.ts` | SmartCollection actions | Collection management mutations |
| `revalidate.ts` | Generic revalidation helpers | Cache busting after mutations |

### When to Use Server Actions vs Direct API Calls

- **Server Actions**: mutations that require cache revalidation or need to run with server-side Payload client access
- **Direct API calls** (`fetch('/api/...')`): streaming endpoints (SSE, upload progress), client-driven queries, anything needing XHR progress events
- **Payload REST API** (`/api/collections/*`): read-only queries from server components or when Payload's access control must be enforced via cookies

Never call Server Actions from within `useEffect` for data fetching — use `fetch` or SWR for that pattern.
