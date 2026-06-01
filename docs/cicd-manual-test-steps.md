# CI/CD Manual Test Steps

**Caveman summary:** Run these steps after implementation to verify the pipelines work. Each test has a clear action, what to look for, and what PASS means. Do them in order — later tests depend on earlier ones passing.

---

## Prerequisites (do once before testing)

Complete these four setup steps in order. Each step builds on the previous one.

---

### Step 1 — Create GitHub Environments

Environments gate production jobs behind reviewer approval. They must exist before any deploy workflow can run.

**Navigate to:** GitHub → your repo → **Settings** → **Environments**

Create two environments:

**`dev`** — no protection rules needed.
1. Click **New environment**, name it `dev`, click **Configure environment**.
2. Leave all toggles off. Click **Save protection rules**.

**`prod`** — requires a reviewer before any prod job runs.
1. Click **New environment**, name it `prod`, click **Configure environment**.
2. Enable **Required reviewers** → add yourself (or a team lead).
3. Enable **Wait timer** → set to `120` minutes.
4. Under **Deployment branches**, select **Selected branches** → add rule `main`.
5. Click **Save protection rules**.

> Why two environments? The `dev` environment auto-proceeds. The `prod` environment pauses every deploy and rollback until a human approves it. This is the primary safety lock for prod.

---

### Step 2 — Set repository-level variables

These are non-sensitive values shared across all workflows and both environments. They live at the repository level so every job can read them.

**Navigate to:** GitHub → your repo → **Settings** → **Secrets and variables** → **Actions** → **Variables tab**

Add the following variables (click **New repository variable** for each):

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_VERSION` | `22` | Node.js version for all CI jobs |
| `PNPM_VERSION` | `10` | pnpm version for all CI jobs |
| `GCS_PROJECT_ID` | `framehouse-hub` | GCP project ID — used in image paths and bucket names |
| `GCP_RUNTIME_SA_EMAIL` | `<number>-compute@developer.gserviceaccount.com` | The SA that Cloud Run revisions run as. Find it: GCP Console → IAM → Service Accounts, look for the one named "Compute Engine default service account" or your custom SA |
| `NEON_PROJECT_ID` | *(from Neon console)* | Neon Console → your project → **Settings** → copy the Project ID string |

> **Variables are not secrets** — they appear in workflow logs. Never put connection strings or passwords here.

---

### Step 3 — Set repository-level secrets

These are sensitive values used by CI jobs that run outside of a specific environment (e.g. PR validation, migration checks). They live at the repository level because several jobs that run without an environment gate need them.

**Navigate to:** GitHub → your repo → **Settings** → **Secrets and variables** → **Actions** → **Secrets tab**

Add the following secrets (click **New repository secret** for each):

**GCP authentication** — used by every job that deploys or reads from GCP:

| Secret | Where to get the value |
|--------|------------------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | GCP Console → IAM → **Workload Identity Federation** → your pool → your provider → copy the full resource name (`projects/.../providers/...`) |
| `GCP_SERVICE_ACCOUNT_EMAIL` | GCP Console → IAM → **Service Accounts** → the SA used for GitHub Actions deploys → copy the email address |

**CI database** — used only in PR validation to spin an ephemeral Postgres container:

| Secret | Value |
|--------|-------|
| `CI_DB_PASSWORD` | Any strong random string. Generate one: `openssl rand -hex 16` |

**Neon** — used in PR validation (remote migration check) and deploy snapshots:

| Secret | Where to get the value |
|--------|------------------------|
| `NEON_API_KEY` | Neon Console → your account avatar (top right) → **Account** → **API Keys** → **Generate new API key** |

**Shared app secrets** — used in PR validation e2e tests AND mounted on Cloud Run at runtime:

| Secret | Where to get the value |
|--------|------------------------|
| `SEED_SECRET` | Any strong random string you choose. Must match the `SEED_SECRET` env var on your running Cloud Run services. Generate: `openssl rand -hex 32` |

**Per-environment app secrets** — used by deploy workflows to pass into the Cloud Run revision and to run migrations from GitHub Actions. Even though they have `_DEV` / `_PROD` suffixes, they are **repository-level secrets** (not environment-level) because the reusable deploy workflows receive them via explicit `secrets:` pass-through before the environment gate activates.

| Secret | Where to get the value |
|--------|------------------------|
| `DATABASE_URI_DEV` | Neon Console → your project → **Branches** → `dev` branch → **Connect** → copy the connection string. Append `?sslmode=require` if not already present |
| `DATABASE_URI_PROD` | Same as above but for the `prod` branch |
| `PAYLOAD_SECRET_DEV` | Any strong random string. Must match the `PAYLOAD_SECRET` secret in GCP Secret Manager for dev. Generate: `openssl rand -hex 32` |
| `PAYLOAD_SECRET_PROD` | Same, for prod |
| `PROCESSOR_CALLBACK_SECRET_DEV` | Any strong random string. Must match the value mounted on both the dev app and dev worker Cloud Run services |
| `PROCESSOR_CALLBACK_SECRET_PROD` | Same, for prod |

> **Why not environment-level secrets?** GitHub environment secrets are only accessible once a job's `environment:` gate has activated. The deploy workflows pass these secrets *into* the reusable workflow *before* the environment gate fires inside it — so the caller must have them at repo level. This is a known trade-off of the reusable-workflow architecture.

---

### Step 4 — Confirm GCP Secret Manager secrets exist

The deploy workflows mount these secrets directly onto Cloud Run revisions at deploy time. They must exist in GCP Secret Manager with the exact names below, or the Cloud Run deploy step will fail.

**Navigate to:** GCP Console → **Secret Manager** (or use the commands below)

```bash
# Verify all six secrets exist (run from any authenticated terminal)
for SECRET in \
  DATABASE_URI_DEV DATABASE_URI_PROD \
  PAYLOAD_SECRET_DEV PAYLOAD_SECRET_PROD \
  PROCESSOR_CALLBACK_SECRET_DEV PROCESSOR_CALLBACK_SECRET_PROD \
  SEED_SECRET; do
  echo -n "$SECRET: "
  gcloud secrets describe "$SECRET" --project=framehouse-hub \
    --format="value(name)" 2>/dev/null && echo "OK" || echo "MISSING"
done
```

If any show `MISSING`, create them:

```bash
# Example — replace MY_VALUE with the actual secret value
echo -n "MY_VALUE" | gcloud secrets create DATABASE_URI_DEV \
  --data-file=- \
  --project=framehouse-hub

# To update an existing secret's value (add a new version):
echo -n "MY_VALUE" | gcloud secrets versions add DATABASE_URI_DEV \
  --data-file=- \
  --project=framehouse-hub
```

> The values in GCP Secret Manager **must match** the corresponding GitHub Secrets — they are two separate stores for the same credentials. GitHub Secrets are used when migrations run from the Actions runner; Secret Manager secrets are mounted as env vars when the app boots on Cloud Run.

---

### Step 5 — Verify setup before running tests

Run this checklist. Each command should return a non-empty value or "OK".

```bash
# From your local terminal (authenticated with gcloud and gh CLI)

# 1. GitHub variables exist
gh api repos/{owner}/{repo}/actions/variables --jq '.variables[].name' | sort

# 2. GitHub secrets exist (names only — values are not readable)
gh api repos/{owner}/{repo}/actions/secrets --jq '.secrets[].name' | sort

# 3. GitHub Environments exist
gh api repos/{owner}/{repo}/environments --jq '.environments[].name'
# Expected: dev, prod

# 4. GCP Secret Manager (see Step 4 command above)

# 5. Neon branch names match what the workflows expect
pnpm exec neonctl branches list --project-id <NEON_PROJECT_ID>
# Expected: branches named "dev" and "prod" exist
# Note: _deploy-app.yml creates snapshots from --parent <env_name>
```

---

## Test 1 — Guardrail blocks non-dev → main PR

**Action:**
1. Create a feature branch: `git checkout -b test/guardrail-check`
2. Push an empty commit: `git commit --allow-empty -m "test" && git push origin test/guardrail-check`
3. Open a PR targeting `main` (not `dev`)

**Expected:**
- `Guardrail` job runs and **fails** within ~30 s
- Step summary shows: "main only accepts merges from dev"
- All other jobs still run (they are not blocked by guardrail)

**PASS:** PR is blocked; guardrail job red; all other jobs green (or green on their own merit).  
**Cleanup:** Close the PR; delete the branch.

---

## Test 2 — Quality gate catches TypeScript error

**Action:**
1. On a feature branch, introduce a deliberate TS error (e.g. add `const x: string = 123` to any `.ts` file)
2. Push and open a PR → `dev`

**Expected:**
- `Quality Gate` job fails at the `TypeScript type check` step (~30 s)
- `Integration Tests` still runs in parallel (not blocked by quality_gate)
- `E2E` job does NOT start (needs quality_gate to pass)

**PASS:** quality_gate red; integration_tests green; e2e not started.  
**Cleanup:** Revert the TS error; push again; both should turn green.

---

## Test 3 — Schema drift blocks merge

**Action:**
1. On a feature branch, add a new field to a Payload collection in `src/collections/`
2. Do NOT run `pnpm generate:types` or `pnpm generate:importmap` locally
3. Push and open PR → `dev`

**Expected:**
- `Quality Gate` fails at "Verify schema integrity" step
- Step summary says: "Run generate:importmap and generate:types locally and commit the diff"

**PASS:** quality_gate red with schema drift message.  
**Fix path:** Run `pnpm generate:types && pnpm generate:importmap` locally, commit the diff, push again.

---

## Test 4 — Clean feature PR passes all checks

**Action:**
1. Create `feature/test-clean-pr` from current `dev`
2. Make a trivial safe change (e.g. add a comment to a non-type-checked file)
3. Open PR → `dev`

**Expected:**
- `quality_gate` passes (~4–5 min)
- `integration_tests` passes (~6 min, runs in parallel)
- `e2e (1)` and `e2e (2)` both pass (~10 min wall-clock)
- `merge_e2e_reports` passes
- No `remote_migrations` (only runs for dev→main)
- Total wall-clock: ≤ 22 min

**PASS:** All jobs green; PR shows "All checks passed"; wall-clock ≤ 22 min.

---

## Test 5 — deploy-dev fires after merge (no validate job)

**Action:**
1. Merge the PR from Test 4 into `dev`

**Expected:**
- `deploy-dev.yml` triggers automatically
- Only ONE job: `Deploy Dev`
- No validate / build / test jobs (those ran in the PR)
- Steps visible in order: Compute metadata → Setup Node → GCP Auth → Neon snapshot → Migrate → Build+Push → Deploy Cloud Run → Smoke test → Audit record → Delete snapshot
- Smoke test: `curl https://dev.framehouseworks.com/api/healthz` returns `{"db":"ok"}`
- Total duration: ≤ 12 min

**PASS:** Single deploy job; all steps green; smoke test passes; no validate job present.

---

## Test 6 — deploy-dev dry_run skips destructive steps

**Action:**
1. Go to Actions → Continuous Development (Dev) → Run workflow
2. Select branch `dev`; set `dry_run = true`; click Run

**Expected:**
- Neon snapshot step: **skipped**
- Apply migrations step: **skipped**
- Build+Push: **runs** (image is built and pushed to Artifact Registry)
- Deploy Cloud Run: **skipped** (`skip_deploy: 'true'` when `dry_run=true`)
- Audit record: **skipped** (`!dry_run && success()` condition)

**PASS:** Snapshot + migrate + Cloud Run deploy steps all marked "skipped"; Build+Push runs and pushes the image; audit record absent.

---

## Test 7 — reset-engine fast path: DB-only reset (preserve_storage=true)

**Action:**
1. Actions → Reset Engine → Run workflow
2. Environment: `dev`; confirmation: `RESET-DEV`; `preserve_storage = true`; `redeploy = false`

**Expected:**
- Phrase guard: passes (`RESET-DEV` accepted when `preserve_storage=true`)
- `scripts/reset.sh` called with `--skip-storage` flag
- DB schema dropped, migrated, seeded
- Smoke test: passes
- No `deploy-dev.yml` triggered (redeploy = false)
- Step summary shows "GCS Storage: Preserved (fast reset)"

**PASS:** All steps green; smoke test passes; GCS bucket still contains existing media files (verify in GCP Console).

---

## Test 8 — reset-engine fast path rejected for prod

**Action:**
1. Actions → Reset Engine → Run workflow
2. Environment: `prod`; confirmation: `RESET-DEV`; `preserve_storage = true`

**Expected:**
- Phrase guard step fails: "preserve_storage is only allowed for dev"
- No reset runs

**PASS:** Job fails at phrase guard; no DB or storage touched.

---

## Test 9 — dev→main PR triggers remote_migrations

**Action:**
1. Ensure `dev` has something ahead of `main`
2. Open a PR from `dev` → `main`

**Expected:**
- `guardrail` passes (head_ref == 'dev')
- All PR checks run
- After `e2e` passes: `remote_migrations` starts
- A Neon branch `gh-pr-{PR_number}` is created, migrated, seeded, then deleted
- Total run: ≤ 40 min wall-clock

**PASS:** All jobs green; `remote_migrations` passes; Neon branch deleted on completion (verify in Neon console).

---

## Test 10 — deploy-prod waits for reviewer approval

**Action:**
1. Merge the `dev` → `main` PR from Test 9

**Expected:**
- `deploy-prod.yml` triggers automatically
- The `Deploy Prod` job shows status: **Waiting for approval**
- It does NOT proceed until a required reviewer approves in the GitHub Actions UI
- After approval: all steps run including Neon snapshot, migrate, build+push, deploy, smoke test, audit record

**PASS:** Job pauses at environment gate; reviewer sees approval prompt; after approval all steps complete; `https://hub.framehouseworks.com/api/healthz` returns `{"db":"ok"}`.

---

## Test 11 — rollback-prod reverts to a prior SHA

**Action:**
1. Note the SHA of a prior successful prod deploy (from step summary or `git log`)
2. Take the first 7 chars: e.g. `abc1234`
3. Actions → Rollback Prod → Run workflow
4. Enter `target_sha: abc1234`; `reason: manual test rollback`
5. Approve the environment gate

**Expected:**
- Image existence check: passes (image `app:sha-abc1234` found in AR)
- Cloud Run deployed with `app:sha-abc1234` — no migration step
- Smoke test: passes
- Audit record written to `gs://framehouse-hub-prod/audit/rollbacks/...`
- Step summary shows "DB migrations were NOT reversed — code-only rollback"

**PASS:** Rollback deploys without running migrations; smoke test green; GCS audit record present.

---

## Test 12 — rollback-prod fails on missing SHA

**Action:**
1. Actions → Rollback Prod → Run workflow
2. Enter `target_sha: 0000000` (non-existent)
3. Approve the environment gate

**Expected:**
- Step "Verify target image exists" fails with: "Image tag sha-0000000 not found in Artifact Registry"
- Step summary explains the cleanup policy and hotfix path
- No Cloud Run deployment attempted

**PASS:** Fails at image verification step; no deploy; meaningful error message in step summary.

---

## Test 13 — deploy-dev and deploy-worker-dev serialize (no concurrent mutations)

**Action:**
1. Make a simultaneous change to both `src/` and `scripts/worker/` in one commit
2. Merge to `dev`

**Expected:**
- Both `deploy-dev.yml` and `deploy-worker-dev.yml` trigger
- They share the `deploy-dev` concurrency group
- App deploy runs first; worker deploy queues behind it
- In the Actions UI: one job shows "Waiting" while the other is running

**PASS:** Worker deploy does not start until app deploy completes; no concurrent DB operations; both succeed sequentially.

---

## Test 14 — reset-engine (full reset including storage wipe)

**Action:**
1. Actions → Reset Engine → Run workflow
2. Environment: `dev`; confirmation: `NUKE-DEV`; redeploy: `true`

**Expected:**
- Phrase guard passes
- DB schema dropped + re-migrated + reseeded
- GCS bucket `framehouse-hub-dev` emptied
- Smoke test passes
- `deploy-dev.yml` triggered (redeploy = true)
- Step summary shows correct dev URL in health check

**PASS:** All steps green; GCS bucket empty (verify in GCP Console); health check URL is `https://dev.framehouseworks.com` (not the prod URL).

---

## Test 15 — Permissions are job-scoped (not workflow-level)

**Action:** Read any workflow file and verify structure.

```bash
# Check no workflow-level permissions beyond {}
grep -A2 "^permissions:" .github/workflows/pr-validation.yml
# Expected: permissions: {}

# Verify each job has its own permissions block
grep -B2 "id-token: write" .github/workflows/pr-validation.yml
# Expected: only under specific job blocks (e2e, remote_migrations), not at top level

# Verify persist-credentials: false in composite action
grep "persist-credentials" .github/actions/setup-node-pnpm/action.yml
# Expected: persist-credentials: false
```

**PASS:** `permissions: {}` at workflow top-level; `id-token: write` only in deploy/auth jobs; `persist-credentials: false` in checkout.

---

## Test 16 — Cloud Run revision has explicit service account

**Action (after a dev deploy completes):**
```bash
gcloud run revisions describe $(gcloud run revisions list \
  --service=framehouse-hub-dev \
  --region=us-central1 \
  --format='value(metadata.name)' \
  --limit=1) \
  --region=us-central1 \
  --format='value(spec.template.spec.serviceAccountName)'
```

**Expected:** Returns the custom runtime SA email (from `GCP_RUNTIME_SA_EMAIL`), NOT `{project-number}-compute@developer.gserviceaccount.com`

**PASS:** Custom SA shown, not Compute Engine default SA.

---

## Test 17 — Free tier budget check (monthly estimate)

**Action:** After 1 week of normal development, check GitHub Actions usage.

1. GitHub → Settings → Billing → Actions
2. Note minutes consumed in current billing period

**Expected:** Projected monthly usage ≤ 1,500 min (per spec Section 9.1)

**PASS:** On track to finish the month under 1,500 min.

---

## Test 18 — GCS audit records are written

**Action (after any prod deploy):**
```bash
gcloud storage ls "gs://framehouse-hub-prod/audit/deploys/$(date +%Y-%m-%d)/"
gcloud storage cat "gs://framehouse-hub-prod/audit/deploys/$(date +%Y-%m-%d)/<run-id>.json"
```

**Expected:**
```json
{
  "event": "deploy",
  "env": "prod",
  "sha": "...",
  "actor": "...",
  "smoke_test": "pass"
}
```

**PASS:** JSON record present with correct structure; `smoke_test: "pass"`.

---

## Test 19 — Neon pre-migration snapshot lifecycle

**Action:**
1. Trigger a `deploy-dev.yml` (any merge to `dev`)
2. During the deploy, check Neon console for a `pre-migration-dev-{sha7}` branch
3. After deploy succeeds, check again

**Expected:**
- Branch `pre-migration-dev-{sha7}` appears during the deploy.
- After smoke test passes: branch is **deleted** (success path).
- If you cancel the job mid-deploy: branch is also **deleted** (the `Snapshot lifecycle` step runs on `always()`, so cancellation cleans up — no quota leak).
- If migrate or smoke test **fails**: branch is **retained** for data recovery. Step summary includes a `pnpm exec neonctl branches delete …` command to clean up manually.

**PASS:** No `pre-migration-*` branches left in Neon console after a successful or cancelled deploy. Branch present only after a failure.

---

## Test 20 — deploy-dev ignores doc-only commits

**Action:**
1. Merge a PR to `dev` that changes only `.md` files (e.g. update `README.md`)

**Expected:**
- `deploy-dev.yml` does NOT trigger (paths-ignore matches)
- No Actions run is created for the push

**PASS:** No deploy run visible in Actions for that commit.

---

## Test 21 — deploy-worker-prod waits for reviewer approval

**Action:**
1. Push a change to `scripts/worker/**` on a branch and merge it to `main`

**Expected:**
- `deploy-worker-prod.yml` triggers automatically
- The `Deploy Worker Prod` job shows status: **Waiting for approval**
- It does NOT proceed until a required reviewer approves in the GitHub Actions UI
- After approval: build, push, deploy, and `Verify worker service health` step all pass

**PASS:** Job pauses at environment gate; after approval, worker revision is active; `gcloud run services describe` returns `status.conditions[0].status = True`.

---

## Quick Reference: Expected Job Names in Branch Protection

These exact strings must be set as Required Status Checks in GitHub branch protection settings.

For `dev` branch:
```
quality_gate
integration_tests
E2E (1)
E2E (2)
```

For `main` branch (all of the above plus):
```
guardrail
remote_migrations
```
