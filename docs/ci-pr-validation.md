# CI — PR Validation Pipeline

**File:** `.github/workflows/pr-validation.yml`
**Triggers:** PRs targeting `dev` (feature/* → dev) and `main` (dev → main)
**Constraints:** GitHub Actions 2,000 min/month · Neon 10-branch free tier · GCP free tier

---

## All issues addressed (cumulative)

| # | Problem | Fix |
|---|---------|-----|
| 1 | Serial monolith (~30 min) | Parallel jobs: quality-gate ∥ integration-tests → e2e |
| 2 | Neon branch created on every feature PR (burns 10-branch quota + 15 min) | `remote-migrations` gated to `base_ref == main` only |
| 3 | All 3 Playwright engines installed; only Chromium used | `playwright install --with-deps chromium` |
| 4 | No Next.js build cache | `actions/cache` on `.next/cache` keyed on lockfile + src hash |
| 5 | Schema drift check in lint job (no DB service) | Moved to `e2e` job which has postgres service |
| 6 | `frontend.e2e.spec.ts` silently excluded | File deleted — orphaned e-commerce template code |
| 7 | No `tsc --noEmit` fast-fail | Explicit type-check step in `quality-gate` (~30s) |
| 8 | Playwright browser binaries re-downloaded every run | `actions/cache` on `~/.cache/ms-playwright` keyed on Playwright version |
| 9 | `pnpm install -g neonctl` — no version pin | `neonctl` added as `devDependency`; invoked via `pnpm exec neonctl` |
| 10 | No PR test annotations | Playwright `github` + `html` dual reporters; Vitest JUnit artifact |
| 11 | Concurrency group collision between PR and `workflow_dispatch` | Non-PR events use `github.run_id`; PR checks use `pull_request.number` |
| 12 | `PROCESSOR_CALLBACK_SECRET` and `SEED_SECRET` hardcoded in YAML | Moved to `${{ secrets.* }}` — no plaintext secrets in version-controlled files |
| 13 | `PAYLOAD_SECRET: ci_secret` repeated 7× across jobs | Defined once at workflow `env` level; all jobs inherit it |
| 14 | `DATABASE_URI` hardcoded in 4+ steps | Defined once at workflow `env` level with a generated password via `${{ secrets.CI_DB_PASSWORD }}` |
| 15 | Neon branch creation not idempotent | Pre-flight delete (`|| true`) before create; branch name collision can no longer block a merge |
| 16 | Vitest JUnit reporter flag syntax wrong | `--outputFile.junit=test-results/junit.xml` — unqualified `--outputFile` writes verbose output, not XML |

---

## Test coverage audit

| Spec | Lines | CI? | Reason |
|------|-------|-----|--------|
| `admin.e2e.spec.ts` | 67 | ✅ | Uses seeded `sys.admin@framehouseworks.com` |
| `media-lifecycle.e2e.spec.ts` | 180 | ✅ | Synthesises worker callback; no external deps |
| `globalSearch.spec.ts` | 66 | ✅ | Depends on `creative@framehouseworks.com` from seed |

> `frontend.e2e.spec.ts` **deleted** — orphaned e-commerce template tests referencing non-existent collections and Stripe payment iframes.

---

## Job architecture

```
                ┌─────────────────────────┐   ┌────────────────────────────┐
  All PRs →     │      quality-gate        │   │     integration-tests       │
                │  tsc · lint · schema     │   │  vitest (own Docker DB)     │
                │  · build                 │   │  JUnit XML artifact         │
                │  ~4 min, no DB           │   │  ~6 min                     │
                └─────────────────────────┘   └────────────────────────────┘
                             │                            │
                             └─────────────┬──────────────┘
                                           ▼
                                    ┌────────────┐
                                    │    e2e     │
                                    │ migrate    │
                                    │ drift check│
                                    │ build      │
                                    │ playwright │
                                    │ ~15 min    │
                                    └────────────┘
                                           │
                            (only base_ref == main)
                                           ▼
                              ┌───────────────────────┐
                              │   remote-migrations   │
                              │   Neon ephemeral      │
                              │   ~15 min             │
                              └───────────────────────┘

  guardrail: 1 min · only base_ref == main · fails if head_ref != dev
```

---

## Free-tier budget

| Scenario | Billed min/run | Monthly capacity |
|----------|----------------|-----------------|
| feature→dev | ~22 min | ~90 runs |
| dev→main | ~38 min | ~52 runs |
| **Typical (20 feature + 4 dev→main)** | — | **592 min / 2,000** |

Neon: branch created only on dev→main with idempotent pre-flight delete + `if: always()` cleanup → max 1 open at a time, safe under 10-branch limit.

---

## Required secrets and variables

Add these to GitHub → Settings → Secrets and variables before deploying:

| Key | Type | Used by |
|-----|------|---------|
| `CI_DB_PASSWORD` | Secret | `DATABASE_URI` in e2e job |
| `PROCESSOR_CALLBACK_SECRET_DEV` | Secret | e2e job (media-lifecycle tests) |
| `SEED_SECRET` | Secret | e2e job (Playwright globalSetup seed) |
| `NEON_API_KEY` | Secret | remote-migrations |
| `PAYLOAD_SECRET_DEV` | Secret | remote-migrations |
| `NEON_PROJECT_ID` | Variable | remote-migrations |

`PAYLOAD_SECRET` and `DATABASE_URI` for CI are constructed from workflow-level `env` — no additional secrets needed for those.

---

## Full workflow YAML

```yaml
name: PR Validation

on:
  pull_request:
    branches: [main, dev]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/pull_request_template.md'
  workflow_dispatch:

# PR runs keyed on PR number; workflow_dispatch uses run_id so manual
# triggers never cancel each other or live PR checks.
concurrency:
  group: pr-validation-${{ github.event.pull_request.number || github.run_id }}
  cancel-in-progress: true

# Fix #12/13/14: all shared CI values defined once here.
# No plaintext secret values — PAYLOAD_SECRET is a static CI-only stub
# (no real data); DATABASE_URI password comes from a secret.
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
  NEON_PROJECT_ID: ${{ vars.NEON_PROJECT_ID }}
  PNPM_VERSION: '10'
  NODE_VERSION: '22'
  PAYLOAD_SECRET: ci_secret
  CI_DB_HOST: localhost
  CI_DB_PORT: 5432
  CI_DB_NAME: framehouse_ci
  CI_DB_USER: postgres

permissions:
  id-token: write
  contents: read
  pull-requests: write
  checks: write   # required for Playwright github reporter to write inline annotations

# ─────────────────────────────────────────────────────────────────────
# GUARDRAIL — main only accepts merges from dev
# ─────────────────────────────────────────────────────────────────────
jobs:
  guardrail:
    name: Guardrail
    runs-on: ubuntu-latest
    timeout-minutes: 1
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    steps:
      - name: Verify PR source branch
        if: github.head_ref != 'dev'
        run: |
          echo "### 🛑 Deployment Blocked" >> $GITHUB_STEP_SUMMARY
          echo "\`main\` only accepts merges from \`dev\`. Retarget your PR first." >> $GITHUB_STEP_SUMMARY
          exit 1

# ─────────────────────────────────────────────────────────────────────
# QUALITY GATE — types · lint · schema · build
# No DB. tsc fails fast on type errors (~30s) before a 4-min build.
# ─────────────────────────────────────────────────────────────────────
  quality-gate:
    name: Quality Gate
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript type check
        run: pnpm exec tsc --noEmit

      - name: Lint
        run: pnpm run lint

      - name: Verify schema integrity (importmap + types)
        run: |
          pnpm run generate:importmap
          pnpm run generate:types
          if [ -n "$(git status --porcelain)" ]; then
            echo "### 🛑 Schema Out of Sync" >> $GITHUB_STEP_SUMMARY
            echo "Run \`generate:importmap\` and \`generate:types\` locally and commit." >> $GITHUB_STEP_SUMMARY
            git status --porcelain
            exit 1
          fi
        env:
          PAYLOAD_SECRET: ${{ env.PAYLOAD_SECRET }}

      - name: Restore Next.js build cache
        uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('src/**/*.ts','src/**/*.tsx') }}
          restore-keys: nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-

      - name: Production build check
        run: pnpm run build
        env:
          IS_BUILD_PHASE: 'true'
          PAYLOAD_SECRET: ${{ env.PAYLOAD_SECRET }}
          NEXT_PUBLIC_SERVER_URL: http://localhost:3000

# ─────────────────────────────────────────────────────────────────────
# INTEGRATION TESTS — vitest, own Docker postgres (no service container)
# Fix #16: --outputFile.junit= qualifier ensures JUnit XML output, not verbose text
# ─────────────────────────────────────────────────────────────────────
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run integration tests
        run: |
          pnpm run test:int \
            --reporter=verbose \
            --reporter=junit \
            --outputFile.junit=test-results/junit.xml
        env:
          PAYLOAD_SECRET: ${{ env.PAYLOAD_SECRET }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: vitest-results-${{ github.run_id }}
          path: test-results/junit.xml
          retention-days: 7

# ─────────────────────────────────────────────────────────────────────
# E2E — postgres service, Playwright Chromium only
# Fix #12: secrets from ${{ secrets.* }}, never plaintext
# Fix #14: DATABASE_URI assembled from env + secret password
# ─────────────────────────────────────────────────────────────────────
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: [quality-gate, integration-tests]
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: ${{ env.CI_DB_USER }}
          POSTGRES_PASSWORD: ${{ secrets.CI_DB_PASSWORD }}
          POSTGRES_DB: ${{ env.CI_DB_NAME }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # Fix #14: DATABASE_URI assembled once, reused via env
      - name: Set DATABASE_URI
        run: |
          echo "DATABASE_URI=postgres://${{ env.CI_DB_USER }}:${{ secrets.CI_DB_PASSWORD }}@${{ env.CI_DB_HOST }}:${{ env.CI_DB_PORT }}/${{ env.CI_DB_NAME }}" >> $GITHUB_ENV

      - name: Apply migrations
        run: pnpm run payload migrate

      - name: Verify schema drift
        run: |
          pnpm run payload migrate:create --name check_drift
          DRIFT=$(git status --porcelain src/migrations/)
          if [ -n "$DRIFT" ]; then
            echo "### 🛑 Schema Drift Detected" >> $GITHUB_STEP_SUMMARY
            echo "Run \`pnpm payload migrate:create\` locally and commit the output." >> $GITHUB_STEP_SUMMARY
            git status --porcelain src/migrations/
            exit 1
          fi

      - name: Restore Next.js build cache
        uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('src/**/*.ts','src/**/*.tsx') }}
          restore-keys: nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-

      - name: Production build
        run: pnpm run build
        env:
          IS_BUILD_PHASE: 'true'
          NEXT_PUBLIC_SERVER_URL: http://localhost:3000

      - name: Get Playwright version
        id: pw-version
        run: echo "version=$(pnpm exec playwright --version | awk '{print $2}')" >> $GITHUB_OUTPUT

      - name: Restore Playwright browser cache
        id: playwright-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-chromium-${{ steps.pw-version.outputs.version }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: pnpm exec playwright install --with-deps chromium

      - name: Install Playwright system deps (cache hit path)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: pnpm exec playwright install-deps chromium

      # Fix #12: secrets from GitHub Secrets, not plaintext YAML values
      - name: Run E2E tests
        run: |
          pnpm exec playwright test \
            tests/e2e/admin.e2e.spec.ts \
            tests/e2e/media-lifecycle.e2e.spec.ts \
            tests/e2e/globalSearch.spec.ts \
            --reporter=github,html
        env:
          CI: 'true'
          NEXT_PUBLIC_SERVER_URL: http://localhost:3000
          SEED_SECRET: ${{ secrets.SEED_SECRET }}
          PROCESSOR_CALLBACK_SECRET: ${{ secrets.PROCESSOR_CALLBACK_SECRET_DEV }}
          DISABLE_WORKER: '1'

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ github.run_id }}
          path: playwright-report/
          retention-days: 7

# ─────────────────────────────────────────────────────────────────────
# REMOTE MIGRATIONS — Neon ephemeral, dev→main only
# Fix #15: idempotent branch creation — pre-flight delete prevents
#          name collision if a previous cleanup was interrupted
# ─────────────────────────────────────────────────────────────────────
  remote-migrations:
    name: Remote Migration Check (Neon)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: [e2e]
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Create ephemeral Neon branch (idempotent)
        id: neon
        run: |
          ID="${{ github.event.pull_request.number || github.run_id }}"
          BRANCH_NAME="gh-pr-${ID}"

          # Fix #15: delete any stale branch from a previous interrupted run
          # before creating — prevents name collision errors blocking the merge
          pnpm exec neonctl branches delete "$BRANCH_NAME" \
            --project-id "${{ env.NEON_PROJECT_ID }}" \
            --force 2>/dev/null || true

          pnpm exec neonctl branches create \
            --name "$BRANCH_NAME" \
            --parent production \
            --project-id "${{ env.NEON_PROJECT_ID }}"

          CONNECTION_STRING=$(pnpm exec neonctl connection-string "$BRANCH_NAME" \
            --project-id "${{ env.NEON_PROJECT_ID }}")
          echo "::add-mask::$CONNECTION_STRING"
          echo "db_uri=$CONNECTION_STRING" >> $GITHUB_OUTPUT
          echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}

      - name: Set Neon DATABASE_URI
        run: |
          RAW="${{ steps.neon.outputs.db_uri }}"
          [[ "$RAW" != *"sslmode="* ]] && RAW="${RAW}?sslmode=require"
          echo "::add-mask::$RAW"
          echo "NEON_DATABASE_URI=$RAW" >> $GITHUB_ENV

      - name: Run migrations against ephemeral branch
        run: DATABASE_URI="$NEON_DATABASE_URI" pnpm run payload migrate
        env:
          NODE_ENV: production
          PAYLOAD_SECRET: ${{ secrets.PAYLOAD_SECRET_DEV }}

      - name: Seed ephemeral branch
        run: DATABASE_URI="$NEON_DATABASE_URI" pnpm run seed
        env:
          NODE_ENV: production
          PAYLOAD_SECRET: ${{ secrets.PAYLOAD_SECRET_DEV }}
          NEXT_PUBLIC_SERVER_URL: http://localhost:3000

      - name: Cleanup Neon branch
        if: always()
        run: |
          pnpm exec neonctl branches delete "${{ steps.neon.outputs.branch_name }}" \
            --project-id "${{ env.NEON_PROJECT_ID }}" \
            --force
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
```

---

## Required one-time setup

### 1. Add `neonctl` as devDependency
```bash
pnpm add -D neonctl
```

### 2. GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret | Value |
|--------|-------|
| `CI_DB_PASSWORD` | Any strong random string (e.g. `openssl rand -hex 16`) |
| `PROCESSOR_CALLBACK_SECRET_DEV` | Must match the value mounted on the Cloud Run worker |
| `SEED_SECRET` | Must match `SEED_SECRET` in your dev environment |
| `NEON_API_KEY` | From Neon dashboard → Account → API keys |
| `PAYLOAD_SECRET_DEV` | Same value as `PAYLOAD_SECRET_DEV` in Secret Manager |

### 3. GitHub Variables (Settings → Secrets and variables → Variables)

| Variable | Value |
|----------|-------|
| `NEON_PROJECT_ID` | From Neon dashboard → Project settings |

---

## Branch protection settings (GitHub UI)

Configure on the **`dev`** branch:

| Setting | Value |
|---------|-------|
| Required status checks | `Quality Gate`, `Integration Tests`, `E2E Tests` |
| Require branches up to date before merging | ✅ |
| Dismiss stale reviews on new commits | ✅ |
| Restrict who can push directly | Maintainers only |

`guardrail` and `remote-migrations` are **not** required checks on `dev` — they only fire on PRs targeting `main`.

Configure on the **`main`** branch:

| Setting | Value |
|---------|-------|
| Required status checks | `Guardrail`, `Quality Gate`, `Integration Tests`, `E2E Tests`, `Remote Migration Check (Neon)` |
| Require branches up to date before merging | ✅ |
| Restrict pushes | No direct pushes — PRs only |

---

## Risks

| Risk | Mitigation |
|------|------------|
| `globalSearch.spec.ts` requires `creative@framehouseworks.com` | `globalSetup.ts` runs `pnpm seed` before Playwright — verify user is in seed before enabling |
| `generate:importmap` in quality-gate has no DB | Same as existing behaviour; move step to `e2e` job if a future Payload version requires a live DB |
| Neon `production` parent branch name hardcoded | Verify with `pnpm exec neonctl branches list --project-id $NEON_PROJECT_ID` before first deploy |
| Build runs twice (quality-gate + e2e) | Acceptable; shared `.next/cache` mitigates; revisit artifact-passing if build exceeds 5 min |
| Playwright `retries: 3` in `playwright.config.ts` | Reduce to `2` — 3 retries triples E2E time on flaky tests and masks root causes |

---

## Verification checklist

1. **feature→dev PR** — `guardrail` and `remote-migrations` absent; `quality-gate` + `integration-tests` run in parallel; `e2e` runs after both pass
2. **dev→main PR** — all 5 jobs present; `guardrail` fails if head isn't `dev`; `remote-migrations` runs last
3. **docs-only PR** (`.md`/`docs/` only) — zero jobs triggered
4. **Force-push to open PR** — in-progress run cancels; simultaneous `workflow_dispatch` on same branch is unaffected
5. **TypeScript error** — `quality-gate` fails within ~30s; downstream jobs never start
6. **Failing E2E test** — inline annotation on PR diff via `github` reporter; HTML report uploaded as artifact
7. **Neon branch leaked by previous run** — pre-flight delete (`|| true`) ensures idempotent create; no collision blocks merge
8. **Secret rotation** — all secrets via `${{ secrets.* }}`; rotating `CI_DB_PASSWORD` requires no YAML changes
