import type { Payload } from 'payload'
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest'
import { getTestPayload } from '../helpers/payload'
import { signCloudUrls } from '@/collections/Media/hooks/signCloudUrls'

// Direct hook-level tests. We don't exercise the full Payload afterRead
// pipeline because that's covered by other media specs; here we want to
// pin the hook's contract: cloud mode rewrites URLs, local mode no-ops,
// per-request cache avoids redundant signing.

const FAKE_BUCKET = 'frh-int-fake'

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    storagePath: `tenants/1/visual-media/2026/05/abc/original/x.jpg`,
    originalUrl: `https://storage.googleapis.com/${FAKE_BUCKET}/tenants/1/visual-media/2026/05/abc/original/x.jpg`,
    thumbnailUrl: `https://storage.googleapis.com/${FAKE_BUCKET}/tenants/1/visual-media/2026/05/abc/derivatives/small.webp`,
    proxyUrl: `https://storage.googleapis.com/${FAKE_BUCKET}/tenants/1/visual-media/2026/05/abc/derivatives/medium.webp`,
    ...overrides,
  }
}

function makeReq(payload: Payload) {
  // Minimal PayloadRequest shape — the hook only reads `payload.logger`
  // and the cache attached to the request object.
  return { payload } as unknown as Parameters<typeof signCloudUrls>[0]['req']
}

describe('signCloudUrls afterRead hook', () => {
  let payload: Payload
  beforeAll(async () => {
    payload = await getTestPayload()
  })

  afterEach(() => {
    delete process.env.GCS_BUCKET
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('is a no-op when GCS_BUCKET is unset (local mode)', async () => {
    const doc = makeDoc({
      originalUrl: '/media/tenants/1/visual-media/2026/05/abc/original/x.jpg',
      thumbnailUrl: '/media/tenants/1/visual-media/2026/05/abc/derivatives/small.webp',
      proxyUrl: '/media/tenants/1/visual-media/2026/05/abc/derivatives/medium.webp',
    })
    const result = await signCloudUrls({
      doc,
      req: makeReq(payload),
      collection: undefined as never,
      context: {},
      findMany: false,
      query: {} as never,
    })
    expect(result.originalUrl).toBe(doc.originalUrl)
    expect(result.thumbnailUrl).toBe(doc.thumbnailUrl)
    expect(result.proxyUrl).toBe(doc.proxyUrl)
  })

  it('rewrites cloud URLs to signed variants and caches per-request', async () => {
    process.env.GCS_BUCKET = FAKE_BUCKET

    // Stub @google-cloud/storage at the module level. The hook
    // dynamic-imports it, so vi.doMock + resetModules is the way.
    const signedUrlFor = (path: string) =>
      `https://storage.googleapis.com/${FAKE_BUCKET}/${path}?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Signature=stub`
    const calls: string[] = []
    vi.doMock('@google-cloud/storage', () => ({
      Storage: vi.fn().mockImplementation(() => ({
        bucket: () => ({
          file: (path: string) => {
            calls.push(path)
            return {
              getSignedUrl: async () => [signedUrlFor(path)],
            }
          },
        }),
      })),
    }))

    // Re-import the hook so the dynamic Storage import resolves the stub.
    const { signCloudUrls: hook } = await import('@/collections/Media/hooks/signCloudUrls')

    const doc = makeDoc()
    const req = makeReq(payload)

    // First read: 3 distinct paths → 3 stub calls.
    const result = await hook({
      doc,
      req,
      collection: undefined as never,
      context: {},
      findMany: false,
      query: {} as never,
    })
    expect(result.originalUrl).toMatch(/X-Goog-Algorithm=GOOG4-RSA-SHA256/)
    expect(result.thumbnailUrl).toMatch(/X-Goog-Algorithm=GOOG4-RSA-SHA256/)
    expect(result.proxyUrl).toMatch(/X-Goog-Algorithm=GOOG4-RSA-SHA256/)
    expect(calls.length).toBe(3)

    // Second read on the same req → cache hit, no additional stub calls.
    await hook({
      doc,
      req,
      collection: undefined as never,
      context: {},
      findMany: false,
      query: {} as never,
    })
    expect(calls.length).toBe(3)
  })

  it('leaves non-GCS URLs untouched even in cloud mode', async () => {
    process.env.GCS_BUCKET = FAKE_BUCKET
    const doc = makeDoc({
      // Mixed shape: an external URL the hook should ignore.
      originalUrl: 'https://cdn.example.com/x.jpg',
    })
    const result = await signCloudUrls({
      doc,
      req: makeReq(payload),
      collection: undefined as never,
      context: {},
      findMany: false,
      query: {} as never,
    })
    expect(result.originalUrl).toBe('https://cdn.example.com/x.jpg')
  })
})
