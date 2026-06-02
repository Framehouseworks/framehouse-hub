# Local Development Setup

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 22.x | Use `.nvmrc` or `nvm use` |
| pnpm | 9.x | `npm install -g pnpm` |
| Go | 1.22+ | Required for Go worker (media processing) |
| Docker | 24+ | Required for local Postgres |
| Git | 2.40+ | Husky hooks need recent Git |

---

## First-Time Setup

```bash
# 1. Clone and install
git clone git@github.com:your-org/framehouse-hub.git
cd framehouse-hub
pnpm install

# 2. Environment
cp .env.example .env
# Edit .env — set DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL at minimum

# 3. Start Postgres (Docker)
docker run --name frh-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=framehouse \
  -p 5432:5432 \
  -d postgres:15-alpine

# 4. Apply migrations
pnpm payload migrate

# 5. Seed the database
pnpm seed

# 6. Start dev server + worker
pnpm dev
```

App: http://localhost:3000  
Admin: http://localhost:3000/admin  
Default admin: `sys.admin@framehouseworks.com` / `password123`

---

## scripts/dev-with-worker.sh

`pnpm dev` runs this script, not `next dev` directly.

**What it does:**

1. Checks if Go is on PATH. If not, logs a warning and starts Next.js solo.
2. If the worker binary (`scripts/worker/worker`) is missing or `main.go` is newer, runs `go build -o worker .` in `scripts/worker/`.
3. Checks if `:8080` is already in use. If not, starts the worker binary with `PORT=8080` and `LOCAL_MEDIA_ROOT=./public/media`. Worker logs are prefixed `[worker]`.
4. Starts `next dev` in the background.
5. On `Ctrl+C` / exit: kills both processes and frees port 8080 via `lsof`.

**Ports:**

| Service | Port |
|---|---|
| Next.js | 3000 |
| Go worker | 8080 (default, override with `LOCAL_WORKER_PORT`) |

**Environment variable:** `LOCAL_WORKER_URL=http://localhost:8080` — this is what `triggerLocalWorker` in the Media afterChange hook uses to call the worker. Set in `.env`.

**Disable worker:** `DISABLE_WORKER=1 pnpm dev` — starts Next.js only. Used in CI for e2e tests that synthesise the worker callback directly.

---

## Go Worker

Source: `scripts/worker/main.go`

**What it does:**

1. Listens for HTTP POST from Next.js `triggerLocalWorker` (afterChange hook on Media)
2. Reads the original file from `public/media/tenants/.../original/{filename}`
3. Generates `small` and `medium` WebP variants using `cwebp`
4. POSTs to `/api/media/process-callback` with `PROCESSOR_CALLBACK_SECRET` bearer token
5. Callback updates the Media doc: sets `ingestionStatus: 'ready'`, `thumbnailUrl`, `proxyUrl`, `processingStep`

**Build manually:**

```bash
cd scripts/worker
go build -o worker .
```

The binary is gitignored. `dev-with-worker.sh` rebuilds automatically when `main.go` is newer than the binary.

**Required for local media processing.** Without the worker, uploaded files stay at `ingestionStatus: 'processing'` and no WebP variants are generated.

---

## Database: Docker Postgres

Local dev database:

```bash
# Start
docker run --name frh-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=framehouse \
  -p 5432:5432 \
  -d postgres:15-alpine

# Stop (keeps data)
docker stop frh-db

# Restart
docker start frh-db

# Destroy (lose all data)
docker rm -f frh-db
```

Connection string format:

```
DATABASE_URI=postgres://postgres:password@localhost:5432/framehouse
```

Payload uses `push: false` — the DB schema is never auto-synced. Run `pnpm payload migrate` after pulling new migrations.

---

## Blank-Slate Verification

`scripts/verify-local.sh` is the mandatory pre-PR check. It proves migrations and seed work against a completely fresh database.

**What it does, step by step:**

1. Removes any stale `frh-verify-db` container from previous runs
2. Starts a new Postgres 15 container named `frh-verify-db` on port **5433** (avoids conflict with your dev DB on :5432)
3. Polls `pg_isready` up to 30 times (1s each) until the DB accepts connections
4. Calls `scripts/reset.sh` with `--target local --database-uri postgres://postgres:password@localhost:5433/framehouse_test --skip-storage --no-confirm`
   - `reset.sh` runs `pnpm payload migrate` against the blank DB
   - Then runs `pnpm seed` to populate all required base data
5. On success: prints confirmation and tears the container down (via EXIT trap)

**Run it:**

```bash
./scripts/verify-local.sh
```

**Keep the DB running for debugging:**

```bash
./scripts/verify-local.sh --keep-open
```

Output includes the exact `DATABASE_URI` to use:

```
DATABASE_URI=postgres://postgres:password@localhost:5433/framehouse_test pnpm run dev
```

This lets you start Next.js against the blank-slate data to inspect the seeded state.

**Tear down a keep-open run:**

```bash
./scripts/verify-local.sh down
# or
./scripts/cleanup-local.sh
```

Both stop and remove the `frh-verify-db` container.

---

## Git Hooks (Husky)

Hooks are installed automatically by `pnpm install` (Husky).

### Pre-commit: lint-staged

Runs on every commit. Applies ESLint autofix + Prettier formatting to staged files:

- `*.{js,jsx,ts,tsx}` → `eslint --fix` then `prettier --write`
- `*.{json,md,yml,yaml}` → `prettier --write`

Commit is blocked if ESLint reports unfixable errors.

### Pre-push: verify-local.sh + lint + build

Runs before every `git push`. Blocks the push if any step fails:

1. `IS_BUILD_PHASE=true pnpm build` — production build check (no live DB needed)
2. `pnpm lint` — full ESLint run
3. `./scripts/verify-local.sh` — blank-slate migration + seed verification

This ensures broken migrations and lint regressions never reach the remote.

**Skip (emergency only, not recommended):**

```bash
git push --no-verify
```

---

## IS_BUILD_PHASE

`IS_BUILD_PHASE=true` is an escape hatch for `pnpm build` when no live database is available.

When set, `getPayloadClient()` skips database initialization and returns a stub. This prevents Next.js static analysis from crashing on Payload collection imports during the build phase.

Use cases:
- Pre-push hook (build runs before verify-local.sh provisions Postgres)
- CI build steps that run before database is ready
- Docker image builds

Do not set this in development or production runtime — it disables Payload entirely.

---

## Common Issues

### Port 5432 already in use

Your dev DB container is already running. Either:
- Start it: `docker start frh-db`
- Or check what's on the port: `lsof -i :5432`

The verify script uses :5433 — safe to run alongside the dev DB.

### Port 8080 already in use

A stale worker process is running. Kill it:

```bash
kill $(lsof -ti :8080)
```

`dev-with-worker.sh` also handles this: if :8080 is occupied it logs "assuming worker is already running" and skips startup.

### Migration drift (CI fails with dirty tree)

After pulling new code, apply pending migrations before pushing:

```bash
pnpm payload migrate
pnpm generate:types
```

Commit any regenerated files. The CI `check_drift` step will fail if `src/payload-types.ts` or migration files are out of sync with the current config.

### Missing .env variables

`verify-local.sh` requires a `.env` file in the repo root. If it's missing:

```bash
cp .env.example .env
# Fill in at minimum: PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL
# DATABASE_URI is overridden by verify-local.sh; the value in .env is for pnpm dev
```

### Go worker not processing

Check:
1. Go is installed: `go version`
2. Worker binary exists: `ls scripts/worker/worker`
3. Worker is running: `lsof -i :8080`
4. `LOCAL_WORKER_URL=http://localhost:8080` is set in `.env`
5. `PROCESSOR_CALLBACK_SECRET` matches between `.env` and whatever the worker reads

Worker logs appear prefixed `[worker]` in the terminal running `pnpm dev`.
