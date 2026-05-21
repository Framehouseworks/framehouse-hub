import type { CollectionAfterReadHook } from 'payload'

// Payload generates a `url` field for upload collections from
// `staticURL + '/' + filename`. With disableLocalStorage on the Media
// collection, that path no longer exists on disk — the canonical URL is
// `originalUrl`, populated by writeOriginalToEnclave (local) or
// register-gcs (cloud). Alias `url` to `originalUrl` here so any
// consumer reading `doc.url` gets a working URL without having to know
// about the cutover.
export const aliasUrl: CollectionAfterReadHook = ({ doc }) => {
  if (doc?.originalUrl && typeof doc.originalUrl === 'string') {
    return { ...doc, url: doc.originalUrl }
  }
  return doc
}
