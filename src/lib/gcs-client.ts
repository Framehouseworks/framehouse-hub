import { Storage } from '@google-cloud/storage'

let cachedClient: Storage | null = null

export async function getStorageClient(): Promise<Storage> {
  if (cachedClient) return cachedClient

  const projectId = process.env.GCS_PROJECT_ID
  const rawKey = process.env.GCP_SERVICE_ACCOUNT_KEY

  if (rawKey) {
    try {
      const credentials = JSON.parse(rawKey)
      cachedClient = new Storage({ credentials, projectId })
      return cachedClient
    } catch {
      // Fallback to ADC if key string is malformed or invalid JSON
    }
  }

  cachedClient = new Storage({ projectId })
  return cachedClient
}

export function resetStorageClientCache(): void {
  cachedClient = null
}
