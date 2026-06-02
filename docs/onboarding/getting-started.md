# Getting Started — Day 1 Setup Guide

This guide gets you from zero to a running local Framehouse Hub instance.

---

## Prerequisites

Install the following before cloning:

| Tool | Required Version | Notes |
|---|---|---|
| Node.js | >= 20.9.0 | Use `nvm` or `fnm` to manage versions |
| pnpm | Latest stable | `npm install -g pnpm` |
| Go | >= 1.21 | Required to run the local media worker |
| Docker | Latest stable | Used to spin up a local Postgres container |
| gcloud CLI | Latest stable | Optional — only needed for cloud GCS work |

> **Important:** This project uses `pnpm` exclusively. Do not use `npm` or `yarn` — the lockfile will drift.

Check your versions:

```bash
node --version   # must be >= 20.9.0
pnpm --version
go version       # must be >= 1.21
docker --version
```

---

## Clone and Install

```bash
git clone https://github.com/framehouseworks/framehouse-hub.git
cd framehouse-hub
pnpm install
```

The install step resolves all dependencies including Payload CMS, Next.js, and all TypeScript tooling. It uses `--legacy-peer-deps` automatically via `.npmrc`.

---

## Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure the following variables:

### Required — Always

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URI` | `postgresql://user:pass@localhost:5432/framehouse` | Postgres connection string. For local Docker, use the container address. |
| `PAYLOAD_SECRET` | `your-random-secret-string` | JWT signing secret for Payload auth. Use any long random string (min 32 chars). |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3000` | Public base URL of the app. Used for internal API calls and media URL construction. |
| `PROCESSOR_CALLBACK_SECRET` | `another-random-secret` | Shared secret between the Go worker and the `/api/media/process-callback` endpoint. Must match the worker's config. |

### Required — Local Mode (default)

| Variable | Example | Description |
|---|---|---|
| `LOCAL_WORKER_URL` | `http://localhost:8080` | URL of the local Go worker. Defaults to port 8080. Leave as-is unless you change the worker port. |

### Cloud Mode Only (leave empty for local dev)

| Variable | Example | Description |
|---|---|---|
| `GCS_BUCKET` | `framehouse-hub-dev` | GCS bucket name. When set, the app switches to cloud storage mode. Leave blank for local disk mode. |
| `GCS_PROJECT_ID` | `my-gcp-project` | GCP project ID. Required when `GCS_BUCKET` is set. Do not use `GCP_PROJECT_ID` — this is the canonical name. |

> **Tip:** For local development, leave `GCS_BUCKET` and `GCS_PROJECT_ID` blank. The app will use the local disk enclave under `public/media/tenants/`.

---

## Starting Local Development

### Standard (Next.js only, no Go worker)

```bash
pnpm dev
```

Starts Next.js on port 3000. Media processing will not complete without the worker, but ingest, admin, and browsing all work.

### Full Stack (Next.js + Go worker)

```bash
./scripts/dev-with-worker.sh
```

This script starts both the Next.js dev server and the Go worker on port 8080. Use this when testing the full media ingest pipeline (upload → WebP derivatives → status stream).

---

## Seeding the Database

After starting the app for the first time, seed the database with initial data:

```bash
pnpm seed
```

This creates:
- The default system admin account: `sys.admin@framehouseworks.com` / `password123`
- Sample pages, categories, and placeholder media documents
- Initial pricing global data

> **Note:** The seed script runs against `DATABASE_URI`. Ensure Postgres is running before seeding. If you're using Docker, start the container first.

---

## Running Migrations

Framehouse Hub uses explicit Postgres migrations — the DB adapter has `push: false`, meaning schema changes are never auto-applied. Always run migrations before seeding on a fresh database:

```bash
pnpm payload migrate
```

If you've pulled new code that includes migration files, run this command before starting the dev server to avoid schema mismatch errors.

To generate a new migration after making schema changes:

```bash
pnpm payload migrate:create
```

Commit both the generated `.ts` and `.json` files in `src/migrations/`.

---

## Blank-Slate Verification

Before submitting a PR, run the blank-slate verification script. This spins up an ephemeral Postgres container, runs all migrations, seeds, and tears everything down:

```bash
./scripts/verify-local.sh
```

To keep the DB running after verification (useful for local debugging):

```bash
./scripts/verify-local.sh --keep-open
# Prints DATABASE_URI — copy into .env.local and run pnpm dev

# When done:
./scripts/cleanup-local.sh
```

> This script is also run automatically by the pre-push Husky hook, so it must pass before you can push.

---

## Accessing the Admin Panel

With the app running and the DB seeded, open:

```
http://localhost:3000/admin
```

Log in with:
- **Email:** `sys.admin@framehouseworks.com`
- **Password:** `password123`

From the admin panel you can manage all collections: Users, Media, Portfolios, Pages, Categories, Smart Collections, and more.

---

## Common First-Day Tasks

| Task | Command |
|---|---|
| Regenerate TypeScript types after schema change | `pnpm generate:types` |
| Regenerate Payload admin import map | `pnpm generate:importmap` |
| Run linter | `pnpm lint` |
| Run linter with auto-fix | `pnpm lint:fix` |
| Run all tests | `pnpm test` |
| Run integration tests only | `pnpm test:int` |
| Run E2E tests only | `pnpm test:e2e` |
| Run a single E2E test | `pnpm exec playwright test tests/e2e/admin.e2e.spec.ts -g "test name"` |

---

## Common Gotchas

**Wrong Node version**
Payload CMS v3 requires Node >= 20.9.0. If you see unexpected build errors, check `node --version`. Use `nvm use` if you have an `.nvmrc` or `fnm use` to switch.

**Using npm or yarn instead of pnpm**
The `pnpm-lock.yaml` is committed and CI uses `--frozen-lockfile`. Running `npm install` will create a `package-lock.json` and break CI. Always use `pnpm`.

**Skipping migrations before seed**
The seed script assumes the schema is already applied. Running `pnpm seed` on an empty database without first running `pnpm payload migrate` will fail with schema errors.

**Missing PAYLOAD_SECRET**
If `PAYLOAD_SECRET` is not set, Payload will throw a startup error. Provide any non-empty string for local development.

**Media not processing**
Without the Go worker running, uploaded assets will remain in `processing` state indefinitely. Run `./scripts/dev-with-worker.sh` to get the full pipeline, or use `pnpm dev` and manually call the process-callback endpoint in testing.

**Generated files out of date**
`src/payload-types.ts` and `src/payload-generated-schema.ts` are generated artifacts. If you change a collection schema, regenerate them with `pnpm generate:types`. CI will fail if these are stale.
