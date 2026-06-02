# Testing Guide

## Philosophy

Integration tests run against a **real Postgres database** — no mocks. This is intentional. Mocking the DB creates a false sense of safety: query bugs, constraint violations, and migration drift all go undetected. The ephemeral DB setup is fast enough that the cost of real DB tests is low relative to the confidence gained.

E2E tests run the full Next.js app against a real DB and simulate real browser interactions. The Go media worker is disabled in CI (`DISABLE_WORKER=1`); the E2E suite synthesises the worker callback directly so tests are not blocked by worker infrastructure.

**When to mock:** only external services you do not own (e.g. third-party APIs, GCS in some unit tests). Never mock the database.

---

## Integration Tests (Vitest)

### Location

```
tests/int/**/*.int.spec.ts
```

### How They Work

Each test run connects to a real Postgres instance. The blank-slate setup (`vitest.globalSetup.ts`) provisions an ephemeral database, applies all migrations, and seeds baseline data. Tests run against this clean state. The DB is torn down after the run.

This means:
- Tests are order-independent (each suite gets a clean slate or uses transactions that roll back).
- Schema changes that break migrations will surface in the test run.
- No query mocking — if a query is wrong, the test fails.

### Setup Files

| File | Purpose |
|------|---------|
| `vitest.config.mts` | Vitest configuration (test match pattern, environment, timeouts) |
| `vitest.globalSetup.ts` | Spins up ephemeral Postgres, runs migrations, tears down after suite |
| `vitest.setup.ts` | Per-test setup (e.g. resetting state between tests) |
| `tests/helpers/payload.ts` | Payload client helper — use this to call Payload local API in tests |

### Running

```bash
pnpm test:int          # all integration tests
```

### Key Test Files and Coverage

| File | Covers |
|------|--------|
| `admin-oversight.int.spec.ts` | Admin dashboard queries, oversight metrics |
| `api.int.spec.ts` | Next.js API route behaviour (media routes, etc.) |
| `media-sign-cloud-urls.int.spec.ts` | `signCloudUrls` afterRead hook, signed URL generation |
| `media.int.spec.ts` | Media collection CRUD, hooks (accession ID, enclave write, dedup) |
| `mediaSearch.int.spec.ts` | Full-text search via `media_search_idx` GIN index |
| `portfolio-review.int.spec.ts` | Portfolio creation, section layout, client review state |
| `sessions.int.spec.ts` | Auth sessions, access control enforcement |

### Writing a New Integration Test

1. Create `tests/int/my-feature.int.spec.ts`.
2. Import the Payload helper:
   ```ts
   import { getTestPayload } from '../helpers/payload'
   ```
3. Use `beforeAll` / `afterAll` for any fixture data; use the Payload local API (not REST) for DB operations.
4. Follow existing test files as patterns — especially how they handle auth context and user scoping.
5. Do not import or instantiate a DB client directly. Go through Payload.

Example skeleton:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { getTestPayload } from '../helpers/payload'

describe('my feature', () => {
  let payload: Awaited<ReturnType<typeof getTestPayload>>

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  it('does the thing', async () => {
    const result = await payload.find({ collection: 'media', limit: 1 })
    expect(result.docs).toHaveLength(1)
  })
})
```

---

## E2E Tests (Playwright)

### Location

```
tests/e2e/*.spec.ts
```

### Running

```bash
pnpm test:e2e                                                          # all E2E tests
pnpm exec playwright test tests/e2e/admin.e2e.spec.ts -g "test name"  # single test by name
```

### DISABLE_WORKER=1

In CI, the Go media worker is not running. Setting `DISABLE_WORKER=1` tells the app to skip the `triggerLocalWorker` afterChange hook. The E2E tests that exercise the media lifecycle synthesise the worker callback themselves by directly calling `/api/media/process-callback` with the `PROCESSOR_CALLBACK_SECRET` — this simulates what the worker would do after processing.

**Do not remove the 3-second polling backstop** in `UploadProvider`. SSE alone has been observed to silently fail in CI; the polling backstop is the safety net that ensures the UI eventually reflects completed state.

### Setup Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright config (browsers, base URL, retries, reporter) |
| `tests/e2e/globalSetup.ts` | Runs once before all E2E tests — seeds the DB, starts the Next.js server |

### Key Test Files and Coverage

| File | Covers |
|------|--------|
| `admin.e2e.spec.ts` | Admin UI flows: user management, media oversight, diagnostics |
| `client-review-portal.e2e.spec.ts` | Client-facing portfolio review, approval/rejection flows |
| `globalSearch.e2e.spec.ts` | Global search UX, result ranking, empty states |
| `media-lifecycle.e2e.spec.ts` | Full upload → process → display cycle, worker callback synthesis |

### Writing a New E2E Test

1. Create `tests/e2e/my-feature.spec.ts`.
2. Use `globalSetup.ts`'s seeded state as the baseline — do not assume a clean DB, but do not depend on test ordering.
3. For media-related tests: synthesise the worker callback instead of waiting for a real worker.
4. Use Playwright's `page.waitForSelector` / `page.waitForResponse` rather than fixed sleeps.
5. Run locally first with `pnpm test:e2e` before pushing — E2E failures in CI are expensive to debug.

---

## CI Test Behaviour

CI (`pr-validation.yml`) runs tests in this order:

1. `pnpm test:int` — integration tests against ephemeral Neon branch
2. `pnpm test:e2e` — Playwright E2E with `DISABLE_WORKER=1`

Both must pass for the PR to be mergeable. CI also runs a `migration-drift` check after migrating: it runs `pnpm payload migrate:create --name check_drift` and fails if the working tree is dirty. This ensures committed migrations fully describe the current Payload config.

---

## Test Database

The blank-slate DB is managed by `./scripts/verify-local.sh` (pre-push) and `vitest.globalSetup.ts` (integration tests). Both use an ephemeral Postgres container on port 5433 (separate from any dev DB on 5432).

To run the blank-slate check manually:

```bash
./scripts/verify-local.sh              # migrate + seed, then tear down
./scripts/verify-local.sh --keep-open  # keep DB running; prints DATABASE_URI
./scripts/cleanup-local.sh             # tear down a --keep-open run
```

---

## Writing Testable Code

- **Access control**: use the access modules in `src/access/*` — they are independently testable. Never inline access logic in collection configs.
- **Side effects**: hooks like `triggerLocalWorker` check `DISABLE_WORKER` — new hooks should follow the same guard pattern so CI can skip external calls.
- **Determinism**: seed data in `src/seed/index.ts` must produce the same result on every run. If a new collection is added, update the seed.
- **API routes**: keep business logic out of the route handler itself — move it to a testable function that integration tests can call directly.
