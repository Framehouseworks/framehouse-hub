## Release PR — `dev` → `main`

> This PR promotes the `dev` branch to `main` for deployment to production.
> The guardrail CI job will block merge if the source branch is not `dev`.

**Release summary:** _What features/fixes are included in this release?_

## Pre-Merge Checklist

**Code quality**
- [ ] All feature PRs merged to `dev` and CI green on `dev`
- [ ] No known regressions on `https://dev.framehouseworks.com`
- [ ] Migrations have been applied to dev DB without errors

**Schema / data**
- [ ] All migration `.ts` + `.json` pairs committed
- [ ] `src/payload-types.ts` and `src/payload-generated-schema.ts` up to date
- [ ] Migrations are additive / backwards-compatible (no destructive drops without deprecation window)
- [ ] `src/seed/index.ts` is consistent with the schema (verify-local.sh passes clean)

**Infrastructure** _(check if any infra changed)_
- [ ] No new env vars required on prod Cloud Run without being added to Secret Manager first
- [ ] CORS allowlist is correct for `https://hub.framehouseworks.com`
- [ ] No new GCS IAM bindings or Eventarc triggers needed before deploy

**Rollback readiness**
- [ ] Migrations are reversible OR a rollback plan is documented below
- [ ] Previous Cloud Run revision is stable (rollback target confirmed in GCP console)

## Included Tickets

| Ticket | Description | Author |
|--------|-------------|--------|
| FRH-XX | ... | @handle |

## Rollback Plan

> If this release needs to be rolled back, what steps are required?
> - Cloud Run: `Actions → Rollback Prod → select previous revision`
> - DB: _[describe if any migration would need manual reversal]_

---

**Post-merge:** `deploy-prod.yml` will trigger automatically. Monitor Cloud Run logs and `/api/healthz` after deploy. Prod is currently gated (`if: false`) — see [deployment runbook](../../docs/devops/deployment.md) if enabling prod for the first time.
