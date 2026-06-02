# Deployment Runbook — Framehouse Hub

## Dev Environment — Normal Flow

The normal deployment path is fully automated. No manual steps required.

```
git push origin dev
  └─► deploy-dev.yml triggers (if src/**, Dockerfile, etc. changed)
        └─► _deploy-app.yml:
              1. Neon pre-migration snapshot
              2. pnpm payload migrate (live Neon dev DB)
              3. Docker build + push to Artifact Registry
              4. Cloud Run deploy (framehouse-hub-dev)
              5. Smoke test /api/healthz → {"db":"ok"}
              6. Audit record → gs://framehouse-hub-dev/audit/deploys/
              7. Snapshot deleted on success
```

Deployment completes in ~10–15 minutes. Monitor progress in the GitHub Actions tab.

Doc-only changes (`.md` files, `docs/**`) do not trigger a deploy — they are in `paths-ignore`.

---

## Manual Deploy (Outside CI)

Use `workflow_dispatch` on `deploy-dev.yml` from the GitHub Actions tab.

Options:
- `dry_run: true` (default for manual trigger) — builds and pushes the image but skips Cloud Run deploy and migrations. Use to validate the image without touching the live service.
- `dry_run: false` — full deploy (same as a push trigger).

To force a deploy without changing any source file:
```bash
gh workflow run deploy-dev.yml --ref dev --field dry_run=false
```

---

## Migrations in Deployment

Migrations run **before** the Docker image build in `_deploy-app.yml`. This ordering is intentional:

- If the migration fails, the old Cloud Run revision continues serving uninterrupted.
- No new image is pushed. Nothing changes in production.

The workflow appends `?sslmode=require` to the Neon connection string if not already present.

A Neon copy-on-write snapshot (`pre-migration-dev-{sha7}`) is created before every migration run:
- On success or cancel: snapshot is deleted automatically.
- On failure: snapshot is retained. The step summary prints the `neonctl branches delete` command to clean it up once the issue is resolved.

Neon branch limit is 10 free. Do not leave stale snapshots — they accumulate toward this limit.

To run migrations manually (e.g., after local schema changes):
```bash
pnpm payload migrate
```

To verify no drift between the committed migrations and current Payload config:
```bash
pnpm payload migrate:create --name check_drift
git status --porcelain src/migrations/
# Must be clean. If dirty, commit the generated files.
```

---

## Environment Variables

### What goes in Secret Manager

All sensitive values. Never put secrets in plain env vars on Cloud Run.

| Secret | Used by |
|---|---|
| `DATABASE_URI_DEV` | Next.js app: Payload DB connection |
| `PAYLOAD_SECRET_DEV` | Next.js app: Payload CMS signing |
| `PROCESSOR_CALLBACK_SECRET_DEV` | Next.js app + Go worker: mutual auth on process-callback |
| `SEED_SECRET` | Next.js app: `/api/seed-hub` endpoint auth |

Mounted as env vars at Cloud Run runtime via the `secrets:` block. Not visible in Cloud Run Console.

### What goes in Cloud Run plain env vars

Non-sensitive configuration only.

| Var | Value (dev) | Notes |
|---|---|---|
| `GCS_BUCKET` | `framehouse-hub-dev` | Bucket name for media storage |
| `GCS_PROJECT_ID` | `framehouse-hub` | GCP project ID — canonical name, do not use `GCP_PROJECT_ID` |
| `NEXT_PUBLIC_SERVER_URL` | `https://dev.framehouseworks.com` | Also set as Docker build arg |
| `EXTRA_ALLOWED_ORIGINS` | `https://framehouse-hub-dev-588985538639.us-central1.run.app` | Allows direct Cloud Run URL for CORS |

### Adding a new env var

1. If sensitive: create the secret in Secret Manager, add it to the `secrets:` block in `_deploy-app.yml`.
2. If non-sensitive: add it to the `env_vars:` block in `_deploy-app.yml`.
3. For the Go worker: add it to `_deploy-worker.yml` `env_vars:` block.
4. For local development: add to `.env.local` (not committed).

---

## Worker Deployment

The Go worker (`framehouse-hub-worker-dev`) deploys separately from the Next.js app. It only rebuilds when `scripts/worker/**` changes — this keeps Artifact Registry under the 0.5 GB free-tier allowance.

**When it triggers:** push to `dev` branch with changes in `scripts/worker/**`.

**Concurrency:** Shares the `deploy-dev` concurrency group with the app deploy. If both trigger at the same time (unlikely but possible), the worker queues behind the app. Rationale: the app exposes `/api/media/process-callback`; the worker must not start sending callbacks before the app is stable.

**To force a worker deploy** (e.g., config change without code change):
```bash
# Touch the workflow file to force the trigger
gh workflow run deploy-worker-dev.yml --ref dev
```

Or use `workflow_dispatch` from the GitHub Actions tab.

---

## Prod Deployment — Checklist to Enable

Prod is currently disabled. `deploy-prod.yml` exists and is fully configured, but the infrastructure does not exist yet.

### Infrastructure checklist

Complete each item before flipping the workflow gate.

**GCS bucket:**
```bash
gcloud storage buckets create gs://framehouse-hub-prod \
  --location=us-central1 \
  --uniform-bucket-level-access \
  --project=framehouse-hub
gcloud storage buckets update gs://framehouse-hub-prod \
  --no-public-access-prevention  # then enforce via IAM
```
Apply CORS:
```bash
gcloud storage buckets update gs://framehouse-hub-prod \
  --cors-file=scripts/infra/cors-prod.json
```

**IAM (same pattern as dev — see `docs/devops/gcp-infrastructure.md`):**
- GCS service agent → `roles/pubsub.publisher`
- Eventarc service agent → `roles/storage.legacyBucketReader` on the prod bucket
- Runtime SA → `roles/eventarc.eventReceiver`, `roles/run.invoker` (prod worker), `roles/iam.serviceAccountTokenCreator` (self-grant)

**Eventarc trigger:**
```bash
bash scripts/infra/setup-eventarc.sh --env prod --bucket framehouse-hub-prod
```

**Cloud Run services:** The first deploy via `deploy-prod.yml` creates them automatically. The workflow handles `--allow-create` on first run.

**Secret Manager:**
```bash
echo -n "$DB_URI" | gcloud secrets create DATABASE_URI_PROD --data-file=- --project=framehouse-hub
echo -n "$PAYLOAD_SECRET" | gcloud secrets create PAYLOAD_SECRET_PROD --data-file=- --project=framehouse-hub
echo -n "$CB_SECRET" | gcloud secrets create PROCESSOR_CALLBACK_SECRET_PROD --data-file=- --project=framehouse-hub
```

**GitHub secrets:** Add `DATABASE_URI_PROD`, `PAYLOAD_SECRET_PROD`, `PROCESSOR_CALLBACK_SECRET_PROD` in the repository's Secrets settings.

**GitHub Environment `prod`:** Configure in Settings → Environments:
- Required reviewers (at least 1)
- Wait timer: 2 hours (prevents accidental immediate deploy)

**Custom domain mapping:**
```bash
gcloud run domain-mappings create \
  --service=framehouse-hub-prod \
  --domain=hub.framehouseworks.com \
  --region=us-central1 \
  --project=framehouse-hub
```
Then add the DNS records output by the command to your DNS provider.

**Neon:** Create a `production` branch in the Neon project (used as snapshot parent in `_deploy-app.yml`).

### Flip the gate

`deploy-prod.yml` has no `if: false` gate at the workflow level — it is active by definition once merged to `main`. The protection is the GitHub Environment `prod` gate inside `_deploy-app.yml`. Once the environment is configured with required reviewers, merges to `main` will trigger the workflow but block at the environment gate pending approval.

Prod images are tagged `sha-{full_sha}` (immutable) + `:latest`. Revisions are named `sha-{sha7}` for direct Cloud Run traffic targeting.

---

## Rollback

### Via `rollback-prod.yml` workflow (recommended)

1. Find the target 7-char SHA from audit records or git log:
   ```bash
   gsutil ls gs://framehouse-hub-prod/audit/deploys/
   ```
2. Trigger from GitHub Actions tab → `rollback-prod.yml`:
   - `target_sha`: 7-char git SHA
   - `reason`: human-readable reason (written to audit record)
3. A `validate` job checks SHA format before the prod environment gate fires.
4. After reviewer approval + 2h wait: verifies image in Artifact Registry, redeploys with `skip_build: true`, smoke tests, writes audit record.

**Note:** Does NOT reverse migrations. Code-only rollback. If the schema was destructively altered, use the Neon pre-migration snapshot branch for data recovery (separate operation).

### Via gcloud directly (emergency, bypasses workflow)

```bash
# List available revisions
gcloud run revisions list \
  --service=framehouse-hub-prod \
  --region=us-central1

# Route 100% traffic to a specific revision
gcloud run services update-traffic framehouse-hub-prod \
  --to-revisions=sha-{sha7}=100 \
  --region=us-central1 \
  --project=framehouse-hub
```

This does not write an audit record. Document the rollback manually.

### If target image was evicted (older than keep-10 / 30d)

Create a hotfix branch from the target commit and trigger `deploy-prod.yml` via `workflow_dispatch`. The workflow rebuilds the image from that commit's code.

---

## Post-Deployment Verification

The `_deploy-app.yml` smoke test already runs automatically:
```bash
curl -fsS "{public_url}/api/healthz" | jq -e '.db == "ok"'
```

Manual verification steps after deploy:
1. Open `https://dev.framehouseworks.com` and confirm the app loads.
2. Log in as `sys.admin@framehouseworks.com` / `password123` (dev seed user).
3. Upload a test media file — confirm it processes and thumbnails appear.
4. Check audit record in GCS: `gsutil ls gs://framehouse-hub-dev/audit/deploys/`

---

## Domain and CORS

| Environment | Public domain | CORS origins |
|---|---|---|
| Dev | `https://dev.framehouseworks.com` | `https://dev.framehouseworks.com`, `https://framehouse-hub-dev-588985538639.us-central1.run.app` |
| Prod | `https://hub.framehouseworks.com` | `https://hub.framehouseworks.com` (plus `www.` if used) |

CORS for the GCS bucket is set via `gcloud storage buckets update --cors-file=`. There is no Console UI.

`EXTRA_ALLOWED_ORIGINS` on the Cloud Run service adds the direct Cloud Run URL to the app's CORS allowlist. This is needed because the upload flow in dev uses the direct URL for callback.

To add a new allowed origin:
1. Update the `cors-{env}.json` file and re-apply to the bucket.
2. Update `extra_allowed_origins` in `deploy-dev.yml` or `deploy-prod.yml`.
3. Update the `CORS` setting in the GCS bucket.

All origins must match exactly: scheme + host, no trailing slash.

---

## Zero-Downtime Deploys

Cloud Run provides zero-downtime rolling deployments by default:
- New revision is deployed alongside the old one.
- Traffic is shifted to the new revision only after it passes the startup health check.
- `--min-instances=0` means the old revision scales down after traffic shifts.

No blue/green or canary configuration is needed for dev. For prod, Cloud Run's default rolling behavior is sufficient given the low concurrency targets.

The `--timeout=300s` ensures in-flight requests on the old revision complete before it is terminated.
