# DevOps Overview

Framehouse Hub runs on GCP with local Docker mirroring the cloud topology.

---

## Infrastructure Stack

| Layer | Local | Cloud |
|---|---|---|
| App runtime | `pnpm dev` (Next.js on :3000) | Cloud Run (`framehouse-hub-dev`) |
| Media worker | Go binary on :8080 | Cloud Run (`framehouse-hub-worker-dev`) |
| Database | Docker Postgres on :5432 | Neon (serverless Postgres) |
| Object storage | `public/media/` on disk | GCS bucket (`framehouse-hub-dev`, private) |
| Event trigger | Detached `fetch` from Next.js afterChange hook | Eventarc object-finalize trigger |
| Secrets | `.env` file | GCP Secret Manager |
| Image registry | N/A | Artifact Registry (`us-central1`) |

All cloud resources are in region **`us-central1`**.

---

## Local vs Cloud Architecture

```
LOCAL
  Browser → Next.js (:3000) → register-local → writeOriginalToEnclave → public/media/
                                              → triggerLocalWorker → Go worker (:8080)
                                                                    → process-callback → Payload DB

CLOUD
  Browser → Next.js (Cloud Run) → signed-url → GCS PUT (direct from browser)
  GCS object-finalize → Eventarc → Go worker (Cloud Run) → process-callback → Payload DB (Neon)
```

Key difference: in cloud mode the browser uploads directly to GCS. Next.js never touches the bytes. In local mode, bytes go through Next.js to disk.

---

## Key Principles

**Zero idle cost**: Cloud Run services are `--min-instances=0`. No charges when idle.

**Free-tier compliance**: All resource limits are set to stay within GCP free tier:
- Cloud Run: `--max-instances=4`, `--memory=512Mi`, `--cpu=1`, `--concurrency=4`, `--timeout=300s`
- Artifact Registry: keep-10 / delete-30d cleanup policy (`scripts/infra/set-cleanup-policy.sh`)
- GCS + Cloud Run in same region (`us-central1`) — no cross-region egress charges

**Private buckets**: GCS bucket has public-access prevention enforced. Media URLs are unsigned `https://storage.googleapis.com/{bucket}/{path}` in the DB. The `signCloudUrls` afterRead hook rewrites them to v4 signed GET URLs (1h TTL) at read time. Never persist signed URLs.

**Signed uploads**: Browser-to-GCS uploads use v4 signed PUT URLs from `/api/media/signed-url`. The Cloud Run runtime SA must have `roles/iam.serviceAccountTokenCreator` (self-grant) to sign URLs.

**Schema via migrations**: Postgres adapter has `push: false`. All schema changes go through `pnpm payload migrate:create`. Never use `push: true` in any environment.

---

## Key Scripts

| Script | What it does |
|---|---|
| `scripts/dev-with-worker.sh` | Starts Next.js + Go worker together. Builds worker binary if stale. Kills worker on exit. |
| `scripts/verify-local.sh` | Spins ephemeral Postgres on :5433, migrates, seeds, tears down. Run before every PR. |
| `scripts/verify-local.sh --keep-open` | Same but leaves DB running. Prints `DATABASE_URI` to use with `pnpm dev`. |
| `scripts/verify-local.sh down` | Tears down a `--keep-open` run. |
| `scripts/cleanup-local.sh` | Alias for teardown of a keep-open verification run. |
| `scripts/reset.sh` | Core migrate + seed logic called by `verify-local.sh`. Accepts `--target`, `--database-uri`, `--skip-storage`, `--no-confirm`. |
| `scripts/infra/` | GCP setup scripts: Eventarc, CORS, cleanup policy, IAM. |
| `scripts/worker/main.go` | Go media processor source. |

---

## Environment Configuration

### Required Env Vars

| Var | Local value | Cloud value |
|---|---|---|
| `DATABASE_URI` | `postgres://postgres:password@localhost:5432/framehouse` | Neon connection string (from Secret Manager) |
| `PAYLOAD_SECRET` | Any long random string | Secret Manager: `PAYLOAD_SECRET_DEV` |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3000` | `https://dev.framehouseworks.com` |
| `GCS_BUCKET` | _(unset — enables local mode)_ | `framehouse-hub-dev` |
| `GCS_PROJECT_ID` | _(unset)_ | GCP project ID |
| `PROCESSOR_CALLBACK_SECRET` | Any shared string | Secret Manager: `PROCESSOR_CALLBACK_SECRET_DEV` |
| `LOCAL_WORKER_URL` | `http://localhost:8080` | _(unused in cloud)_ |
| `IS_BUILD_PHASE` | Set to `true` during `pnpm build` without a live DB | _(not set in runtime)_ |

Copy `.env.example` → `.env` for local setup. Never commit `.env`.

### IS_BUILD_PHASE

When `IS_BUILD_PHASE=true`, `getPayloadClient()` skips DB initialization. This allows `pnpm build` to complete without a live database — required in CI pre-push hook and any build step that runs before `verify-local.sh` provisions Postgres.

---

## CI/CD Overview

All workflows live in `.github/workflows/`.

| Workflow | Trigger | What it does |
|---|---|---|
| `pr-validation.yml` | PR to `dev` | `guardrail` (blocks `main` PRs from non-`dev`), `quality_gate` (lint + types + migration drift check), `test_and_schema` (vitest + playwright + schema freshness) |
| `deploy-dev.yml` | Push to `dev` | Builds Next.js Docker image, pushes to Artifact Registry, deploys to `framehouse-hub-dev` Cloud Run |
| `deploy-worker-dev.yml` | Push to `dev` (paths: `scripts/worker/**`) | Builds Go worker image, deploys to `framehouse-hub-worker-dev` Cloud Run |
| `deploy-prod.yml` | Gated (`if: false`) | Prod Next.js deploy — enable when prod is ready |
| `deploy-worker-prod.yml` | Gated (`if: false`) | Prod worker deploy |
| `reset-engine.yml` | Manual dispatch | Runs `reset.sh` against target environment |
| `rollback-prod.yml` | Manual dispatch | Rolls back prod Cloud Run revision |

Branch rules: `main` only accepts PRs from `dev`. Feature branches → `dev` → `main`. Enforced by the `guardrail` job.

PR validation runs `migrate:create --name check_drift` after migrating and fails if the working tree is dirty — committed migrations must fully describe the Payload config.
