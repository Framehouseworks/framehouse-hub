import { execSync, spawnSync } from 'node:child_process'
import net from 'node:net'

// Ephemeral Postgres container for integration tests. Mirrors the
// blank-slate flow that scripts/verify-local.sh uses for CI, but kept in
// JS so vitest can manage lifecycle across spec files in-process. Each
// `pnpm test:int` run gets a clean DB on a randomly chosen free port.

const CONTAINER = 'frh-test-db'
const POSTGRES_PASSWORD = 'test'
const POSTGRES_DB = 'framehouse_test'

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, () => {
      const addr = srv.address()
      if (!addr || typeof addr === 'string') {
        srv.close()
        reject(new Error('Could not allocate ephemeral port'))
        return
      }
      const port = addr.port
      srv.close(() => resolve(port))
    })
  })
}

function dockerExec(args: string[]) {
  return spawnSync('docker', args, { encoding: 'utf-8' })
}

function cleanupContainer() {
  spawnSync('docker', ['rm', '-f', CONTAINER], { stdio: 'ignore' })
}

async function waitForReady(maxSeconds = 30) {
  for (let i = 0; i < maxSeconds; i++) {
    const res = dockerExec(['exec', CONTAINER, 'pg_isready', '-U', 'postgres'])
    if (res.status === 0) return
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Postgres container did not become ready in time')
}

export async function setup() {
  // Sanity: docker must be available.
  const probe = dockerExec(['version'])
  if (probe.status !== 0) {
    throw new Error('docker is required for tests:int — install Docker Desktop and retry')
  }

  cleanupContainer() // remove any stale leftover from a crashed prior run

  const port = await getFreePort()
  const start = dockerExec([
    'run',
    '--name',
    CONTAINER,
    '-e',
    `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
    '-e',
    `POSTGRES_DB=${POSTGRES_DB}`,
    '-p',
    `${port}:5432`,
    '-d',
    'postgres:15-alpine',
  ])
  if (start.status !== 0) {
    throw new Error(`Failed to start postgres container: ${start.stderr}`)
  }

  await waitForReady()

  const uri = `postgres://postgres:${POSTGRES_PASSWORD}@localhost:${port}/${POSTGRES_DB}`
  process.env.DATABASE_URI = uri
  // Skip the worker dispatch from hooks; tests assert on doc state, not on
  // an actual Go worker run.
  process.env.LOCAL_ASYNC_PROCESSING = 'false'

  // Apply migrations against the ephemeral DB. We shell out to the same
  // `pnpm payload migrate` the project uses everywhere else so test schema
  // == prod schema, no drift.
  execSync('pnpm payload migrate', {
    env: { ...process.env, DATABASE_URI: uri },
    stdio: 'inherit',
  })
}

export async function teardown() {
  cleanupContainer()
}
