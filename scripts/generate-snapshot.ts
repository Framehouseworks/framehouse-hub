/**
 * Generates a valid Drizzle snapshot JSON from the current Payload config schema.
 * Run this after applying all migrations when code and DB are in sync.
 * The output replaces the last migration's JSON so migrate:create detects zero drift.
 *
 * Usage:
 *   DATABASE_URI=... PAYLOAD_SECRET=... pnpm exec tsx scripts/generate-snapshot.ts <output-path>
 */
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const outputPath = process.argv[2] || path.join(repoRoot, 'src/migrations/_snapshot_output.json')

async function main() {
  const config = await configPromise
  const payload = await getPayload({ config })

  const db = payload.db as Record<string, unknown>
  if (!db.schema) throw new Error('No db.schema on Payload DB adapter')
  if (typeof db.requireDrizzleKit !== 'function') throw new Error('requireDrizzleKit not available')

  const { generateDrizzleJson } = (db.requireDrizzleKit as () => { generateDrizzleJson: (s: unknown) => Promise<unknown> })()
  const snapshot = await generateDrizzleJson(db.schema)

  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2))
  // eslint-disable-next-line no-console
  console.log(`✓ Snapshot written: ${outputPath}`)
  const s = snapshot as { version?: string; id?: string }
  // eslint-disable-next-line no-console
  console.log(`  version=${s.version}  id=${s.id}`)
  process.exit(0)
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
