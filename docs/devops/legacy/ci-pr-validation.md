> **SUPERSEDED** — This document has been superseded by [`docs/devops/ci-cd.md`](../ci-cd.md). It is retained for historical reference only. Do not update this file.

# CI — PR Validation Pipeline

**Workflow:** `.github/workflows/pr-validation.yml`  
**Triggers:** PRs targeting `dev` or `main` · `workflow_dispatch`  
**Constraints:** GitHub Actions 2,000 min/month · Neon 10-branch cap · GCP free tier

---

## Job architecture

```
                ┌──────────────────┐   ┌─────────────────────┐
  All PRs →     │   quality_gate    │   │  integration_tests   │  ← parallel
                │ tsc · lint        │   │ vitest + Docker DB   │
                │ schema integrity  │   │ JUnit XML artifact   │
                │ build + artifact  │   │ ~6 min               │
                │ ~5–7 min          │   └─────────────────────┘
                └────────┬─────────┘            │
                         └──────────┬───────────┘
                                    ▼
                      ┌──────────────────────────┐
                      │   e2e (matrix: 1 and 2)   │
                      │ postgres svc · migrate     │
                      │ schema drift check         │
                      │ download .next artifact    │
                      │ playwright sharded         │
                      │ ~15 min · 2 parallel shards│
                      └──────────┬───────────────┘
               ┌─────────────────┴──────────────────┐
               ▼                                     ▼
    ┌──────────────────────┐           ┌─────────────────────────┐
    │  merge_e2e_reports    │           │    remote_migrations     │
    │  failure only         │           │    dev→main PRs only     │
    │  HTML report artifact │           │    Neon ephemeral branch │
    │  ~3 min               │           │    ~15 min               │
    └──────────────────────┘           └─────────────────────────┘

  guardrail: ~1 min · only fires when base_ref == main · fails if head_ref != dev
```

---

## Jobs

### `guardrail`

- Fires only on PRs targeting `main`.
- Fails immediately if `head_ref != dev`. All other jobs run in parallel regardless.
- Enforces the `feature → dev → main` branch model — `main` only accepts merges from `dev`.

---

### `quality_gate`

Runs in parallel with `integration_tests`. No database required.

| Step | Detail |
|------|--------|
| TypeScript type check | `tsc --noEmit` — fails fast (~30 s) before a 4-min build |
| Lint | `pnpm run lint` |
| Schema integrity | `generate:importmap` + `generate:types` — fails if working tree is dirty |
| Next.js build cache | `actions/cache` on `.next/cache` keyed on lockfile hash + src hash |
| Production build | `IS_BUILD_PHASE=true pnpm build` — no DB, no live secrets |
| Upload `.next` artifact | Uploaded for reuse by `e2e` shards (1-day retention) |

---

### `integration_tests`

Runs in parallel with `quality_gate`.

- Runs `pnpm test:int` (vitest). Docker Postgres managed by vitest `globalSetup`.
- Uploads JUnit XML artifact (7-day retention).

---

### `e2e` (matrix shards 1 and 2)

Runs after both `quality_gate` and `integration_tests` pass. Two shards run in parallel — each gets half the Playwright spec files.

| Step | Detail |
|------|--------|
| Postgres service | `postgres:15-alpine` health-checked on port 5432 |
| `DATABASE_URI` assembly | Masked, written to `$GITHUB_ENV` for all downstream steps |
| Apply migrations | `pnpm payload migrate` |
| Schema drift check | `migrate:create --name check_drift` — fails if any migration file is generated |
| Download `.next` artifact | Reuses the build from `quality_gate` — skips ~4 min rebuild |
| Playwright browser cache | Keyed on Playwright version — cache hit skips download |
| Run E2E tests | 3 spec files, `--shard=N/2 --reporter=github,blob` |
| Upload blob report | Combined later by `merge_e2e_reports` (1-day retention) |

Env vars passed to the run step (including the `pnpm start` webServer spawned by Playwright):

```
CI=true
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
PAYLOAD_SECRET=ci_secret
SEED_SECRET=${{ secrets.SEED_SECRET }}
PROCESSOR_CALLBACK_SECRET=${{ secrets.PROCESSOR_CALLBACK_SECRET_DEV }}
DISABLE_WORKER=1
```

---

### `merge_e2e_reports`

- Runs **only if `e2e` failed** (`if: needs.e2e.result == 'failure'`).
- Merges shard blob reports into a single HTML report; uploads it (7-day retention).
- Skipped on passing PRs to save runner minutes.

---

### `remote_migrations`

- Runs **only on dev→main PRs**, after `e2e` passes.
- Creates a Neon ephemeral branch named `gh-pr-{PR_number}`, runs `pnpm payload migrate` + `pnpm seed` against it, then deletes it.
- Pre-flight delete before create makes the step idempotent on re-runs.
- `if: always()` on the cleanup step — branch is deleted even if migrate or seed fails.

---

## Required status checks

Set in **GitHub → Settings → Branches → Branch protection rules**.

**`dev` branch:**
```
quality_gate
integration_tests
E2E (1)
E2E (2)
```

**`main` branch (all of the above plus):**
```
guardrail
remote_migrations
```

> The matrix with `shard: [1, 2]` produces the exact names `E2E (1)` and `E2E (2)`. These strings must match what GitHub registers when the workflow first runs — copy from the Actions UI if unsure.

---

## Security posture

| Control | How it is applied |
|---------|-------------------|
| Minimal permissions | `permissions: {}` at workflow level; each job declares only what it needs |
| `id-token: write` | Scoped to `e2e` and `remote_migrations` jobs only |
| No credential leakage | `persist-credentials: false` in the `setup-node-pnpm` composite action |
| No plaintext secrets | All sensitive values via `${{ secrets.* }}` |

---

## Secrets and variables

| Key | Type | Used by |
|-----|------|---------|
| `CI_DB_PASSWORD` | Secret | `e2e` postgres service + `DATABASE_URI` |
| `PROCESSOR_CALLBACK_SECRET_DEV` | Secret | `e2e` run step (media-lifecycle tests) |
| `SEED_SECRET` | Secret | `e2e` run step (Playwright `globalSetup`) |
| `NEON_API_KEY` | Secret | `remote_migrations` |
| `PAYLOAD_SECRET_DEV` | Secret | `remote_migrations` |
| `NODE_VERSION` | Variable | All jobs via `setup-node-pnpm` composite |
| `PNPM_VERSION` | Variable | All jobs via `setup-node-pnpm` composite |
| `NEON_PROJECT_ID` | Variable | `remote_migrations` |

---

## Free-tier budget

| Scenario | ~min / run | Sustainable monthly |
|----------|------------|---------------------|
| feature → dev PR | ~22 min | ~90 runs |
| dev → main PR | ~38 min | ~52 runs |
| **Typical (20 feature + 4 dev→main)** | — | **~592 min / 2,000** |

Neon: max 2 branches open simultaneously (`gh-pr-{N}` from `remote_migrations` + up to 1 `pre-migration-*` from `_deploy-app.yml`). Well under the 10-branch cap.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `E2E (1)` / `E2E (2)` not in branch protection options | Workflow hasn't run against this branch yet | Trigger a draft PR; the check names appear once the first run fires |
| Schema drift fails in `e2e` | Migration files not committed | `pnpm payload migrate:create` locally → commit the output |
| `merge_e2e_reports` never appears | Gated on `e2e` failure — this is intentional | Download individual shard blob artifacts to inspect a passing-run report manually |
| Neon branch collision on re-run | Stale branch from previous interrupted run | Pre-flight delete handles this automatically; if it persists, delete manually via Neon console |
| `PAYLOAD_SECRET` not available in webServer | Missing from `Run E2E tests` step env | Verify `PAYLOAD_SECRET: ci_secret` is in that step's `env:` block |
| `remote_migrations` runs on a feature → dev PR | `if:` condition should filter `base_ref == main` | Check `if: github.event_name == 'pull_request' && github.base_ref == 'main'` on the job |
