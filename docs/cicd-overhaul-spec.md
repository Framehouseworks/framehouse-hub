# CI/CD Pipeline Overhaul — Specification

**Ticket:** FRH-CICD-01 
**Date:** 2026-05-31  
**Status:** Draft — awaiting approval before implementation  
**Revision:** 2 — enterprise review pass, naming conventions, critical gaps added

---

> **Onboarder summary:** This doc plans a full rebuild of the automated pipelines that test, build, and ship code. Nothing in here changes the app itself — it only changes how code gets checked and deployed. Read sections 1–3 to understand the big picture, then skim the caveman summaries in each section.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Standard Naming Conventions](#3-standard-naming-conventions)
4. [Target Architecture](#4-target-architecture)
5. [Workflow Specifications](#5-workflow-specifications)
6. [Environment Configuration](#6-environment-configuration)
7. [Cache Strategy](#7-cache-strategy)
8. [Security Posture](#8-security-posture)
9. [Free Tier Budget Analysis](#9-free-tier-budget-analysis)
10. [Edge Cases](#10-edge-cases)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Out of Scope](#12-out-of-scope-deferred)
13. [Implementation Plan](#13-implementation-plan)
14. [Appendix — GitHub Settings](#14-appendix--required-github-settings)

---

## 1. Executive Summary

> **Caveman summary:** Old pipes bad. Build new pipes. New pipes faster, safer, cheaper to run. This paper says what the new pipes should look like. Nobody touches code yet.

This document specifies a full overhaul of the Framehouse Hub GitHub Actions CI/CD pipelines. The current system works but carries compounding inefficiencies, duplication, latent security gaps, and bugs that worsen as the team grows. The goal is a modular, free-tier-safe, enterprise-grade SDLC that keeps every job purposeful, every secret safe, and every deploy auditable — without burning the 2,000 GitHub Actions minutes/month free tier or the GCP free tier.

**This document is design-only. No implementation is performed here.**

### Design Principles

These principles govern every decision in this spec:

| Principle | Definition |
|---|---|
| **Fail fast** | Cheapest checks run first. Slow jobs are gated behind fast ones. |
| **Least privilege** | Every token, SA, and permission is scoped to the minimum required for the job. |
| **Immutability** | Prod images are tagged by git SHA and never overwritten. |
| **Idempotency** | Every destructive operation (reset, branch create) can be safely re-run. |
| **Auditability** | Every deploy records who, what, when, from which SHA, with which approval. |
| **Free-tier-aware** | Every new job is costed against the budget tables in Section 9 before acceptance. |

---

## 2. Current State Analysis

> **Caveman summary:** Here is what we have now and what is broken. P1–P20 = old known bugs. P21–P28 = new bugs found during this review. Read the severity column. "Critical" means fix immediately.

### 2.1 Existing Workflows

| File | Trigger | Purpose |
|---|---|---|
| `pr-validation.yml` | PRs → `dev`, `main` | guardrail, quality-gate, int-tests, e2e, remote-migrations |
| `deploy-dev.yml` | push → `dev` | validate + Docker build + Cloud Run deploy |
| `deploy-worker-dev.yml` | push → `dev` (`scripts/worker/**`) | Worker Docker build + Cloud Run deploy |
| `deploy-prod.yml` | push → `main` | validate + Docker build + Cloud Run deploy (partially gated) |
| `deploy-worker-prod.yml` | push → `main` (`scripts/worker/**`) | Worker Docker build + Cloud Run deploy |
| `reset-engine.yml` | manual | Drop schema, empty GCS bucket, migrate, seed |

### 2.2 Identified Problems

#### Original Problems (P1–P20)

| # | Problem | Severity | Impact |
|---|---------|----------|--------|
| P1 | `deploy-dev.yml` re-runs full build + DB migration that `pr-validation.yml` already ran on the PR — ~15 min wasted per push to `dev` | High | ~300 min/month burned on redundant work |
| P2 | `deploy-prod.yml` has a comment saying "gated" but no `if: false` condition on `deploy-prod` job — prod deploys are LIVE on every `main` push | **Critical** | Unintended production deploys |
| P3 | `deploy-dev.yml` validate job uses hardcoded `POSTGRES_PASSWORD: password` — inconsistent with PR validation which uses `${{ secrets.CI_DB_PASSWORD }}` | Medium | Security hygiene gap |
| P4 | No smoke test / health check after `deploy-dev` completes — a broken deploy is silent | High | Broken dev env goes unnoticed |
| P5 | `.next/cache` and Playwright browser cache keys used in both `pr-validation.yml` and `deploy-*.yml` with the same scope key — cache collisions under concurrent runs | Medium | Stale cache served to wrong job |
| P6 | `SEED_SECRET` passed as `env_vars:` in Cloud Run deploy (plaintext in revision config) instead of `secrets:` block | Medium | Secrets exposed in Cloud Run console |
| P7 | `reset-engine.yml` health check hardcodes dev URL for both dev and prod targets — prod reset never health-checks prod | High | Reset success status is unreliable for prod |
| P8 | No GitHub Environment protection rules — anyone can trigger prod deploy manually without reviewer approval | High | Governance gap |
| P9 | `pnpm install --frozen-lockfile` runs independently in every job — no cross-job `node_modules` artifact sharing | Medium | ~2 min duplicated per job per run |
| P10 | No composite actions — setup steps (pnpm, node, gcp auth, docker login) copied verbatim across 5 workflow files | Low | Maintenance burden; drift risk |
| P11 | Worker and app deployments are fully decoupled — no coordination to prevent a new app revision racing a worker deploy mid-inflight request | Low | Transient errors during concurrent deploys |
| P12 | No Playwright test sharding — all E2E tests run serially in one job, blocking the pipeline for ~15 min | Medium | Pipeline slowness |
| P13 | No semantic versioning, image tagging beyond `:dev` / `:latest` — rollback requires re-running a prior workflow run manually | Medium | Incident recovery is slow |
| P14 | `deploy-dev.yml` does not set Cloud Run `--min-instances`, `--max-instances`, `--memory`, `--cpu`, `--concurrency`, `--timeout` flags — relying on Cloud Run defaults, which differ from the documented free-tier shape | High | Free-tier budget at risk |
| P15 | No reusable workflow for the common "deploy app to Cloud Run" pattern — dev and prod workflows are near-identical files with minor variable differences | Low | Duplication; fixes must be applied twice |
| P16 | E2E job rebuilds the Next.js app from scratch (even with cache) rather than reusing a build artifact from `quality-gate` | Medium | ~4 min duplicated per PR |
| P17 | `reset-engine.yml` has no post-reset redeploy step — after a reset the Cloud Run revision still serves the old DB state until the next natural push | Medium | Reset + redeploy is a manual two-step |
| P18 | No `workflow_dispatch` input on `deploy-dev.yml` / `deploy-prod.yml` to trigger a redeploy without pushing a commit | Medium | Hard to force a redeploy for infra-only changes |
| P19 | Playwright `--reporter=github,html` on CI — `html` reporter writes to disk and is only uploaded on failure; passing runs accumulate large uncollected artifacts | Low | Disk waste / artifact quota |
| P20 | `deploy-prod.yml` concurrency: `cancel-in-progress: false` is correct, but `deploy-dev.yml` also uses `cancel-in-progress: true` on the deploy job — a cancelled mid-deploy could leave Cloud Run in a partially-updated state | Medium | Partial deploy on rapid pushes to `dev` |

#### New Critical Gaps Found During Enterprise Review (P21–P28)

| # | Problem | Severity | Impact | Evidence |
|---|---------|----------|--------|----------|
| P21 | **`permissions:` declared at workflow level in all 6 workflows** — `id-token: write` (OIDC token) and `pull-requests: write` are granted to every job including `guardrail` and `quality-gate`, which need neither. Violates Principle of Least Privilege; expands blast radius of any supply-chain compromise in a third-party action | **Critical** | A malicious action in `quality-gate` can mint GCP credentials or write to PRs | Confirmed: all 6 workflow files declare permissions at workflow scope |
| P22 | **`persist-credentials: false` never set on `actions/checkout`** — All checkouts run with `persist-credentials: true` (default). Jobs that use OIDC/WIF for GCP auth retain the GitHub token unnecessarily, allowing any subsequent step to push to the repo or call the GitHub API without explicit intent | High | Credential leakage; unintended repo writes from deploy jobs | Confirmed: no `persist-credentials` setting in any workflow |
| P23 | **`ubuntu-latest` runner used across all 6 workflows** — `ubuntu-latest` is a floating label that GitHub advances without notice (20→22→24 transitions have historically broken tools, Node.js resolution, and shell builtins). Pins to `ubuntu-latest` are not reproducible | Medium | Silent pipeline breakage on OS transition | Confirmed: all jobs use `ubuntu-latest` |
| P24 | **No Go worker test coverage in CI** — Zero `*_test.go` files exist in `scripts/worker/`. Worker code handles binary processing (`cwebp` image encoding, GCS writes, signed URL validation) but has no CI gate. A regression in the worker only surfaces when Cloud Run crashes at runtime | High | Broken media processing deployed silently to dev/prod | Confirmed: `find scripts/worker -name '*_test.go'` returns empty |
| P25 | **`--service-account` flag absent from all Cloud Run deploy steps** — Without an explicit `--service-account`, Cloud Run revisions use the Compute Engine default SA, which is broader than intended. The custom SA grants (`iam.serviceAccountTokenCreator`, `roles/run.invoker`) should be on a narrowly-scoped SA that is explicitly assigned to the revision | Medium | Over-privileged Cloud Run identity; deviation from documented IAM model | Confirmed: no `--service-account` in any deploy step |
| P26 | **No deployment ordering between worker and app** — When a commit to `dev` or `main` modifies both app code and `scripts/worker/**`, `deploy-dev.yml` and `deploy-worker-dev.yml` trigger concurrently. The worker posts to the app's `/api/media/process-callback` endpoint; if the app deploys a breaking API version while the worker is mid-deploy, there is a window of incompatibility | Medium | Lost or failed media processing events during simultaneous deploys | Confirmed: both workflows trigger independently on push to `dev` |
| P27 | **No pre-migration database snapshot** — `pnpm payload migrate` runs directly against the live Neon dev/prod DB with no automated checkpoint beforehand. Neon supports instant branch creation (point-in-time snapshot); this is free within the 10-branch limit and provides a one-click rollback target if a destructive migration is applied | High | Irreversible data loss on bad migration | No pre-migration branch step in any deploy workflow |
| P28 | **No dedicated rollback workflow** — The spec and current pipelines have no `rollback-prod.yml`. The only rollback path is manually re-running a prior GitHub Actions workflow run. During an incident, this is slow (must locate the correct run, re-approve the environment gate), and re-running an old workflow run replays the old migration step, which can conflict with the current DB schema | High | MTTR (Mean Time to Recovery) is unacceptably high in a production incident | No rollback workflow file exists |

---

## 3. Standard Naming Conventions

> **Caveman summary:** These are the naming rules. Follow them exactly. If you name something wrong, it is hard to find and maintain. No exceptions. When in doubt, check this table.

Consistent naming is the single most important maintainability property of a CI/CD system. Every identifier here follows a pattern that can be derived from context alone, without reading implementation.

### 3.1 Workflow Files

```
Pattern: {trigger}-{target}.yml
         {verb}-{scope}.yml       (operational)
         _{verb}-{scope}.yml      (reusable, called-only — underscore prefix)
```

| File | Pattern applied |
|---|---|
| `pr-validation.yml` | trigger=`pr`, target=`validation` |
| `deploy-dev.yml` | trigger=`deploy`, target=`dev` |
| `deploy-prod.yml` | trigger=`deploy`, target=`prod` |
| `_deploy-app.yml` | reusable internal — underscore prefix |
| `_deploy-worker.yml` | reusable internal — underscore prefix |
| `reset-dev.yml` | verb=`reset`, scope=`dev` |
| `reset-engine.yml` | verb=`reset`, scope=`engine` (full multi-env) |
| `rollback-prod.yml` | verb=`rollback`, scope=`prod` |

**Rule:** Reusable workflows (called via `workflow_call`) are always prefixed with `_`. This makes them instantly identifiable as internal utilities rather than entry-point workflows.

### 3.2 Composite Action Directories

```
Pattern: .github/actions/{domain}-{function}/action.yml
```

| Directory | Domain | Function |
|---|---|---|
| `setup-node-pnpm` | setup | node-pnpm toolchain |
| `gcp-auth` | gcp | authenticate + docker login |
| `deploy-cloudrun` | deploy | build-push + Cloud Run deploy |

### 3.3 Job Names

```
Pattern: {domain}_{action}    (snake_case — used as required status check names)
```

| Job name | Rationale |
|---|---|
| `guardrail` | Single-word sentinel — always first in display |
| `quality_gate` | snake_case: appears in branch protection as `quality_gate` |
| `integration_tests` | snake_case |
| `e2e` | Short canonical form |
| `remote_migrations` | snake_case |
| `deploy_dev` / `deploy_prod` | snake_case |

**Critical:** Job names must exactly match the strings in branch protection "Required status checks". Use snake_case throughout. A mismatch silently bypasses the gate.

### 3.4 Concurrency Group Keys

```
Pattern: {workflow-slug}[-{scope}]
```

| Group key | Scope |
|---|---|
| `pr-validation-{pr_number}` | Per-PR; prevents duplicate runs |
| `deploy-dev` | Global; serialises all dev deploys + resets |
| `deploy-prod` | Global; serialises all prod deploys + rollbacks |
| `reset-dev` | Must equal `deploy-dev` (shared queue) |

### 3.5 Docker Image Tags

```
Registry: us-central1-docker.pkg.dev/{project-id}/{repo}/{service}:{tag}
```

| Image | Tag convention | Mutable? |
|---|---|---|
| App — dev | `app:dev` | Yes — latest dev build |
| App — prod | `app:sha-{7-char-sha}` | No — immutable |
| App — prod alias | `app:latest` | Yes — points to latest SHA tag |
| Worker — dev | `worker:dev` | Yes |
| Worker — prod | `worker:sha-{7-char-sha}` | No |
| Worker — prod alias | `worker:latest` | Yes |

**Rationale for 7-char SHA:** Short enough for log lines, long enough to avoid collision. Standard in Git (`--abbrev-commit`) and Docker ecosystem convention.

### 3.6 GCS Bucket Names

```
Pattern: {project-id}-{env}
```

| Bucket | Env |
|---|---|
| `framehouse-hub-dev` | dev |
| `framehouse-hub-prod` | prod |

### 3.7 Cloud Run Service Names

```
Pattern: {project-slug}-{service-type}-{env}
         {project-slug}-{env}           (for the primary app service)
```

| Service | Pattern |
|---|---|
| `framehouse-hub-dev` | primary app, dev |
| `framehouse-hub-prod` | primary app, prod |
| `framehouse-hub-worker-dev` | Go worker, dev |
| `framehouse-hub-worker-prod` | Go worker, prod |

### 3.8 Neon DB Branch Names

```
Pattern: {purpose}-{qualifier}
```

| Branch name | Purpose |
|---|---|
| `main` | Prod database (persistent) |
| `dev` | Dev database (persistent) |
| `gh-pr-{pr-number}` | Ephemeral — remote-migrations CI check |
| `pre-migration-{env}-{sha7}` | Ephemeral — pre-migration backup snapshot |

### 3.9 GitHub Secrets

```
Pattern: {SERVICE}_{QUALIFIER}_{ENV}    (all caps, underscore-delimited)
```

| Secret | Pattern |
|---|---|
| `DATABASE_URI_DEV` | service=`DATABASE_URI`, env=`DEV` |
| `PAYLOAD_SECRET_PROD` | service=`PAYLOAD_SECRET`, env=`PROD` |
| `PROCESSOR_CALLBACK_SECRET_DEV` | service=`PROCESSOR_CALLBACK_SECRET`, env=`DEV` |
| `CI_DB_PASSWORD` | No env suffix — CI-only, not environment-specific |
| `NEON_API_KEY` | No env suffix — global management key |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | No env suffix — pool is shared; attribute conditions scope per env |
| `GCP_SERVICE_ACCOUNT_EMAIL` | No env suffix — single runtime SA; WIF conditions constrain which jobs can assume it |

### 3.10 GitHub Environments

```
Pattern: lowercase, full word — no abbreviation
```

| Name | Notes |
|---|---|
| `dev` | No protection — auto-deploy |
| `production` | Not `prod` — GitHub recommends full names; required reviewers enforced here |

**Why full word?** GitHub Environments are visible in the Actions UI and deployment history. `production` is unambiguous; `prod` is an abbreviation that can be confused with other identifiers.

### 3.11 Artifact Names

```
Pattern: {content-type}-{scope}-{run-id}
```

| Artifact | Pattern |
|---|---|
| `build-pr-{run-id}` | Next.js build output from quality-gate |
| `vitest-results-{run-id}` | JUnit XML from integration tests |
| `playwright-report-{run-id}` | Merged HTML report from E2E shards |

### 3.12 Cache Keys

```
Pattern: {tool}-{scope}-{os}-{primary-hash}[-{secondary-hash}]
```

| Cache | Key |
|---|---|
| pnpm store | `pnpm-{os}-{lockfile-hash}` |
| Next.js (PR) | `nextjs-pr-{os}-{lockfile-hash}-{src-hash}` |
| Next.js (deploy dev) | `nextjs-deploy-dev-{os}-{lockfile-hash}-{src-hash}` |
| Next.js (deploy prod) | `nextjs-deploy-prod-{os}-{lockfile-hash}-{src-hash}` |
| Playwright browsers | `playwright-chromium-{playwright-version}` |
| Docker layers (app dev) | GHA scope `app-dev` |
| Docker layers (app prod) | GHA scope `app-prod` |
| Docker layers (worker dev) | GHA scope `worker-dev` |
| Docker layers (worker prod) | GHA scope `worker-prod` |

### 3.13 Step Names (Convention)

```
Pattern: Sentence case, imperative verb, no filler words
```

Good: `Apply database migrations`, `Build and push image`, `Run smoke test`  
Bad: `Step 3 - run the migrations`, `Doing the build`, `misc`

Step names appear in GitHub Actions UI, in workflow run summaries, and in support tickets. They must be immediately scannable by someone who has never seen the codebase.

---

## 4. Target Architecture

> **Caveman summary:** Code lives on branches. Branch merges trigger pipelines. Pipelines check code, build it, and push it to cloud. Two environments: dev (for testing) and production (for users). Only `dev` branch can merge to `main`. Diagrams below show the flow.

### 4.1 Branch Strategy

```
feature/* ──── PR ──▶ dev ──── PR ──▶ main
fix/*                  │                │
chore/*                │                │
hotfix/*        [RC/Dev env]     [Production env]
              deploy on merge   deploy on merge
```

Branch naming prefixes enforced by PR title check (not CI — GitHub branch protection ruleset):

| Prefix | Use case |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Dependency updates, tooling, non-functional changes |
| `hotfix/` | Emergency production patches (merges directly to `dev` first, then escalated to `main` via normal PR flow) |

Rules enforced in pipeline:
- `main` accepts PRs from `dev` only (guardrail job; exits 1 if `head_ref != 'dev'`).
- Direct pushes to `main` are blocked at GitHub branch protection level.
- Direct pushes to `dev` are blocked at GitHub branch protection level.
- `workflow_dispatch` on deploy workflows requires GitHub Environment approval for `production`.

### 4.2 New Workflow Map

```
.github/
├── actions/
│   ├── setup-node-pnpm/          # composite: checkout + pnpm + node + frozen install
│   │   └── action.yml
│   ├── gcp-auth/                  # composite: WIF OIDC + Artifact Registry docker login
│   │   └── action.yml
│   └── deploy-cloudrun/           # composite: buildx + build-push + deploy-cloudrun
│       └── action.yml
└── workflows/
    ├── pr-validation.yml          # PR → dev, PR → main — CI gate
    ├── deploy-dev.yml             # push → dev — RC deploy
    ├── deploy-prod.yml            # push → main — production deploy (env gate)
    ├── _deploy-app.yml            # reusable: called by deploy-dev + deploy-prod
    ├── _deploy-worker.yml         # reusable: called by worker callers
    ├── deploy-worker-dev.yml      # push → dev (scripts/worker/**) — worker deploy caller
    ├── deploy-worker-prod.yml     # push → main (scripts/worker/**) — worker deploy caller
    ├── rollback-prod.yml          # workflow_dispatch — emergency prod rollback
    ├── reset-dev.yml              # workflow_dispatch — fast dev reset (no storage wipe)
    └── reset-engine.yml           # workflow_dispatch — full reset (dev or prod)
```

### 4.3 Pipeline Flow — Feature PR (feature/* → dev)

```
PR opened / commit pushed to PR branch
         │
         ├──────────────────────────┬──────────────────────────────────┐
         ▼                          ▼                                  │
  ┌──────────────────────┐   ┌──────────────────────────┐             │
  │     quality-gate      │   │    integration-tests      │             │
  │  tsc · lint · schema  │   │  vitest (Docker postgres)  │             │
  │  build (cached)       │   │  JUnit XML artifact        │             │
  │  upload .next art.    │   │                            │             │
  │  ~4 min               │   │  ~6 min                    │             │
  └──────────┬────────────┘   └──────────┬─────────────────┘             │
             └──────────────┬────────────┘                               │
                            ▼                                            │
                   ┌──────────────────┐                                  │
                   │       e2e         │                                  │
                   │  download .next   │                                  │
                   │  migrate + drift  │                                  │
                   │  PW shards ×2     │                                  │
                   │  blob → HTML art  │                                  │
                   │  ~10 min wall     │                                  │
                   └──────────────────┘                                  │
                                                                         │
                   (guardrail: 1 min, only base_ref == main) ────────────┘
```

### 4.4 Pipeline Flow — Dev→Main PR

```
Same stages as feature→dev, PLUS after e2e passes:

         ▼ (needs: e2e)
  ┌────────────────────────────┐
  │    remote-migrations        │
  │  Neon ephemeral branch      │
  │  pre-flight delete          │
  │  migrate + seed + verify    │
  │  cleanup (always)           │
  │  ~15 min                    │
  └────────────────────────────┘

  + guardrail (head_ref must be 'dev', else exit 1)
```

### 4.5 Pipeline Flow — Deploy Dev (on merge to dev)

```
push → dev
    │
    └─── paths-ignore: **.md, docs/**
    │
    ▼
  ┌─────────────────────────────────────────────────────────┐
  │                   _deploy-app.yml (reusable)             │
  │  env_name: dev                                           │
  │                                                          │
  │  [gcp-auth]                                              │
  │    → [snapshot Neon dev branch: pre-migration-dev-{sha}] │
  │    → [pnpm payload migrate → Neon dev]                   │
  │    → [docker build+push app:dev]                         │
  │    → [deploy Cloud Run framehouse-hub-dev]               │
  │       flags: --service-account={runtime-sa}              │
  │              --min-instances=0 --max-instances=4         │
  │              --memory=512Mi --cpu=1 --concurrency=4      │
  │    → [smoke test /api/healthz → {"db":"ok"}]             │
  │    → [step summary: digest, URL, migration status]       │
  │    → [delete pre-migration snapshot (if success)]        │
  │                                                          │
  │  (worker: separate path-scoped trigger, sequential gate) │
  └─────────────────────────────────────────────────────────┘
```

### 4.6 Pipeline Flow — Deploy Prod (on merge to main)

```
push → main
    │
    ▼ (GitHub Environment: production — waits for reviewer approval)
  ┌──────────────────────────────────────────────────────────┐
  │                   _deploy-app.yml (reusable)              │
  │  env_name: prod                                           │
  │                                                           │
  │  [gcp-auth]                                               │
  │    → [snapshot Neon prod branch: pre-migration-prod-{sha}]│
  │    → [pnpm payload migrate → Neon prod]                   │
  │    → [docker build+push app:sha-{sha7} + app:latest]      │
  │    → [deploy Cloud Run framehouse-hub-prod]               │
  │       flags: --service-account={runtime-sa}               │
  │              --min-instances=0 --max-instances=4          │
  │              --revision-suffix={sha7}]                    │
  │    → [smoke test https://hub.framehouseworks.com/api/healthz]│
  │    → [write deploy audit record to GCS]                   │
  │    → [step summary: digest, URL, approver, SHA]           │
  │    → [delete pre-migration snapshot (if success)]         │
  └──────────────────────────────────────────────────────────┘
```

### 4.7 Pipeline Flow — Rollback Prod

```
workflow_dispatch → select SHA to rollback to
    │
    ▼ (GitHub Environment: production — requires reviewer approval)
  ┌──────────────────────────────────────────────────┐
  │              rollback-prod.yml                    │
  │                                                   │
  │  [gcp-auth]                                       │
  │    → [confirm image app:sha-{input} exists]       │
  │    → [deploy Cloud Run: image=sha-{input}]        │
  │       (NO migration step — DB schema is current)  │
  │    → [smoke test]                                 │
  │    → [write rollback audit record to GCS]         │
  └──────────────────────────────────────────────────┘
```

**Critical design note:** A rollback only re-deploys old code against the current DB schema. It does NOT reverse migrations. If a migration was destructive, a Neon pre-migration snapshot branch is the recovery path for data (separate from the code rollback).

### 4.8 Worker ↔ App Deployment Ordering

```
When both app and worker have changes in the same push to dev/main:

  deploy-dev.yml ─────────────────────── concurrency: deploy-dev
  deploy-worker-dev.yml ───────────────── concurrency: deploy-dev  ← SAME GROUP

  Result: they queue, not race. Worker always waits for app to finish.
  Rationale: app exposes the callback endpoint; worker calls it.
             App must be stable before worker starts sending callbacks.
```

Both deploy-dev and deploy-worker-dev share the `deploy-dev` concurrency group with `cancel-in-progress: false`. This guarantees ordering without an explicit `needs:` dependency between separate workflow files.

---

## 5. Workflow Specifications

> **Caveman summary:** Each pipeline file described in detail. Inputs, jobs, steps, what each step does. If you are implementing, use this as the blueprint. Do not improvise.

### 5.1 Composite Actions

#### `actions/setup-node-pnpm/action.yml`

**Purpose:** Encapsulates the 4-step Node.js + pnpm toolchain setup present in every job.  
**Industry pattern:** DRY composite action — see [GitHub Docs: Creating a composite action](https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action).

```
inputs:
  node-version  (string, required)
  pnpm-version  (string, required)
  skip-install  (boolean, default: false)  — set true in jobs that download a build artifact

steps:
  - uses: actions/checkout@v4
      with:
        persist-credentials: false    ← CRITICAL: revoke default GitHub token after checkout
        fetch-depth: 1                ← shallow clone; full history not needed in CI

  - uses: pnpm/action-setup@v4
      with: { version: ${{ inputs.pnpm-version }} }

  - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: pnpm

  - if: inputs.skip-install != 'true'
    run: pnpm install --frozen-lockfile
```

Used in: all jobs that need Node. `skip-install: true` used in the `e2e` job (which downloads the pre-built artifact instead).

#### `actions/gcp-auth/action.yml`

**Purpose:** OIDC Workload Identity Federation authentication + Artifact Registry docker login.  
**Industry pattern:** Keyless authentication — no long-lived service account keys. See [google-github-actions/auth WIF docs](https://github.com/google-github-actions/auth).

```
inputs:
  workload_identity_provider  (string, required)
  service_account             (string, required)

outputs:
  access_token  (from google-github-actions/auth)

steps:
  - uses: google-github-actions/auth@v2
      with:
        token_format: access_token
        workload_identity_provider: ${{ inputs.workload_identity_provider }}
        service_account: ${{ inputs.service_account }}

  - uses: docker/login-action@v3
      with:
        registry: us-central1-docker.pkg.dev
        username: oauth2accesstoken
        password: ${{ steps.auth.outputs.access_token }}
```

Used in: deploy-dev, deploy-prod, reset-engine, rollback-prod.

#### `actions/deploy-cloudrun/action.yml`

**Purpose:** Docker build + push + Cloud Run deploy in one reusable step.

```
inputs:
  service           (string) — Cloud Run service name
  image             (string) — Full image path
  region            (string, default: us-central1)
  build_context     (string, default: .)
  build_file        (string, default: Dockerfile)
  cache_scope       (string) — GHA cache scope key, e.g. app-dev
  additional_tags   (string, optional) — comma-separated extra tags
  service_account   (string) — explicit Cloud Run runtime SA
  min_instances     (string, default: 0)
  max_instances     (string, default: 4)
  memory            (string, default: 512Mi)
  cpu               (string, default: 1)
  concurrency       (string, default: 4)
  timeout           (string, default: 300s)
  revision_suffix   (string, optional) — for immutable prod revisions
  no_auth           (boolean, default: false) — sets --no-allow-unauthenticated

steps:
  - uses: docker/setup-buildx-action@v3
  - uses: docker/build-push-action@v5
      with:
        push: true
        tags: ${{ inputs.image }}, ${{ inputs.additional_tags }}
        cache-from: type=gha,scope=${{ inputs.cache_scope }}
        cache-to: type=gha,mode=max,scope=${{ inputs.cache_scope }}
  - uses: google-github-actions/deploy-cloudrun@v2
      with:
        service: ${{ inputs.service }}
        image: ${{ inputs.image }}
        region: ${{ inputs.region }}
        flags: |
          --service-account=${{ inputs.service_account }}
          --min-instances=${{ inputs.min_instances }}
          --max-instances=${{ inputs.max_instances }}
          --memory=${{ inputs.memory }}
          --cpu=${{ inputs.cpu }}
          --concurrency=${{ inputs.concurrency }}
          --timeout=${{ inputs.timeout }}
          ${{ inputs.revision_suffix && format('--revision-suffix={0}', inputs.revision_suffix) || '' }}
          ${{ inputs.no_auth && '--no-allow-unauthenticated' || '' }}
```

---

### 5.2 `pr-validation.yml`

**Triggers:** `pull_request` → branches `[dev, main]`; `workflow_dispatch`  
**Paths-ignore:** `**.md`, `docs/**`, `.github/pull_request_template.md`

**Concurrency:**
```yaml
group: pr-validation-${{ github.event.pull_request.number || github.run_id }}
cancel-in-progress: true
```

**Top-level `permissions`:** None declared at workflow level (default = none for all).

**Jobs and their permissions:**

| Job | Runs on | Needs | Timeout | Permissions |
|-----|---------|-------|---------|-------------|
| `guardrail` | ubuntu-24.04 | — | 1 min | `contents: read` only |
| `quality_gate` | ubuntu-24.04 | — | 8 min | `contents: read`, `checks: write` |
| `integration_tests` | ubuntu-24.04 | — | 10 min | `contents: read`, `checks: write` |
| `e2e` | ubuntu-24.04 | quality_gate, integration_tests | 20 min | `contents: read`, `checks: write`, `pull-requests: write` |
| `remote_migrations` | ubuntu-24.04 | e2e | 20 min | `contents: read` |

**`guardrail` steps:**
1. `if: github.base_ref == 'main' && github.head_ref != 'dev'` → `exit 1` with step summary message

**`quality_gate` steps (no DB):**
1. `setup-node-pnpm` composite (`persist-credentials: false`, `fetch-depth: 1`)
2. `tsc --noEmit` — fast-fail on type errors (~30 s)
3. `pnpm lint`
4. `generate:importmap && generate:types` + dirty-tree check (`git status --porcelain`)
5. Restore `.next/cache` (key: `nextjs-pr-{os}-{lockfile-hash}-{src-hash}`)
6. `pnpm build` with `IS_BUILD_PHASE=true`, `PAYLOAD_SECRET=ci_secret`
7. Upload `.next` as artifact `build-pr-{run-id}` (retention: 1 day)

**`integration_tests` steps:**
1. `setup-node-pnpm` composite
2. `pnpm test:int --reporter=verbose --reporter=junit --outputFile.junit=test-results/junit.xml`
3. Upload `test-results/junit.xml` as artifact `vitest-results-{run-id}` (always, retention: 7 days)

**`e2e` steps:**
1. `setup-node-pnpm` composite (`skip-install: true` — artifact provides the build)
2. Postgres service container: `postgres:15-alpine`
3. Assemble `DATABASE_URI` from `CI_DB_USER`/`CI_DB_PASSWORD` secret
4. Download `build-pr-{run-id}` artifact (avoids rebuild)
5. `pnpm payload migrate`
6. Schema drift check: `migrate:create --name check_drift` + dirty-tree on `src/migrations/`
7. Restore Playwright cache: `playwright-chromium-{version}`
8. Install Playwright if cache miss: `playwright install --with-deps chromium`
9. Install Playwright system deps if cache hit: `playwright install-deps chromium`
10. E2E matrix shards `[1/2, 2/2]` with `fail-fast: false`:
    ```
    playwright test --shard=${{ matrix.shard }}/2 --reporter=github,blob
    ```
11. Upload blob report per shard: `playwright-blob-{shard}-{run-id}`
12. Merge blobs → HTML report; upload `playwright-report-{run-id}` (failure only)

**`remote_migrations` steps (dev→main PRs only):**
1. `setup-node-pnpm` composite
2. Pre-flight delete: `neonctl branches delete gh-pr-{pr-number} --force 2>/dev/null || true`
3. Create ephemeral branch: `gh-pr-{pr-number}` from `main` parent
4. Capture connection string → `xargs` trim → mask → append `?sslmode=require`
5. `DATABASE_URI={uri} pnpm payload migrate`
6. `DATABASE_URI={uri} pnpm seed`
7. Cleanup: `neonctl branches delete gh-pr-{pr-number} --force` (`if: always()`)

---

### 5.3 `_deploy-app.yml` (Reusable Workflow)

**Called by:** `deploy-dev.yml`, `deploy-prod.yml`  
**Industry pattern:** Reusable workflow (`workflow_call`) — see [GitHub Docs: Reusing workflows](https://docs.github.com/en/actions/sharing-automations/reusing-workflows).

**Caller inputs:**

| Input | Type | Required | Description |
|---|---|---|---|
| `env_name` | string | yes | `dev` or `prod` |
| `docker_tag` | string | yes | Primary image tag |
| `additional_tags` | string | no | Comma-separated extra tags (e.g., `app:latest`) |
| `gcs_bucket` | string | yes | Target GCS bucket name |
| `public_url` | string | yes | `NEXT_PUBLIC_SERVER_URL` value |
| `cloud_run_service` | string | yes | Cloud Run service name |
| `cloud_run_region` | string | no | Default `us-central1` |
| `runtime_service_account` | string | yes | SA email for `--service-account` flag |
| `run_min_instances` | string | no | Default `0` |
| `run_max_instances` | string | no | Default `4` |
| `revision_suffix` | string | no | Git SHA7 for prod immutable revisions |
| `dry_run` | boolean | no | Skip destructive steps |

**Caller secrets:** `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL`, `DATABASE_URI`, `PAYLOAD_SECRET`, `PROCESSOR_CALLBACK_SECRET`, `SEED_SECRET`

**`deploy` job steps:**

1. `gcp-auth` composite — job-level `permissions: { id-token: write, contents: read }`
2. `setup-node-pnpm` composite
3. **Snapshot pre-migration (if `!dry_run`):**
   - `neonctl branches create --name pre-migration-{env}-{sha7} --parent {env}`
   - Record snapshot branch name in step output
4. **Migrate Neon DB (if `!dry_run`):**
   - Assemble `DATABASE_URI` from secret; append `?sslmode=require` if absent
   - `DATABASE_URI={uri} NODE_ENV=production pnpm payload migrate`
   - If migration fails: output error, do NOT delete snapshot, exit non-zero
5. `deploy-cloudrun` composite:
   - image: `us-central1-docker.pkg.dev/framehouse-hub/framehouse-hub/{app-or-worker}:{docker_tag}`
   - additional_tags: `{additional_tags}`
   - `--service-account={runtime_service_account}`
   - Cloud Run secrets: `DATABASE_URI`, `PAYLOAD_SECRET`, `PROCESSOR_CALLBACK_SECRET`, `SEED_SECRET`
   - Cloud Run env vars: `GCS_BUCKET`, `GCS_PROJECT_ID`, `NEXT_PUBLIC_SERVER_URL`, `EXTRA_ALLOWED_ORIGINS`
6. **Smoke test:**
   ```bash
   curl -fsS --retry 6 --retry-delay 10 --retry-all-errors \
     "{public_url}/api/healthz" | jq -e '.db == "ok"'
   ```
7. **Write deploy audit record (if `!dry_run`):**
   ```json
   {
     "event": "deploy",
     "env": "{env_name}",
     "sha": "{github.sha}",
     "actor": "{github.actor}",
     "run_id": "{github.run_id}",
     "image": "{image}:{docker_tag}",
     "timestamp": "{iso8601}",
     "smoke_test": "pass"
   }
   ```
   Written to `gs://framehouse-hub-{env}/audit/deploys/{date}/{run-id}.json`
8. **Delete pre-migration snapshot (if smoke test passes):**
   `neonctl branches delete pre-migration-{env}-{sha7} --force`
   — On smoke test failure: keep snapshot for data recovery; surface URL in step summary
9. **Step summary:** image digest, Cloud Run URL, revision name, migration status, smoke test result, approver (if env gate was triggered)

---

### 5.4 `deploy-dev.yml`

**Triggers:** `push` → `dev` (paths-ignore: `**.md`, `docs/**`); `workflow_dispatch` (input: `dry_run: bool`)  
**Concurrency:**
```yaml
group: deploy-dev
cancel-in-progress: false
```
**Permissions:** None at workflow level (job inherits from reusable workflow).

**`deploy_dev` job:**
- `environment: dev`
- Calls `_deploy-app.yml` with:
  - `env_name: dev`, `docker_tag: dev`
  - `cloud_run_service: framehouse-hub-dev`
  - `runtime_service_account: {GCP_RUNTIME_SA_EMAIL}` (from repository variable)
  - `run_min_instances: 0`, `run_max_instances: 4`
  - `public_url: https://dev.framehouseworks.com`
  - `gcs_bucket: framehouse-hub-dev`

**No validate job.** Quality was proven by the PR that produced this merge commit.

---

### 5.5 `deploy-prod.yml`

**Triggers:** `push` → `main`; `workflow_dispatch` (input: `dry_run: bool`)  
**Concurrency:**
```yaml
group: deploy-prod
cancel-in-progress: false
```

**`deploy_prod` job:**
- `environment: production` — blocks until required reviewer approves in GitHub Actions UI
- Calls `_deploy-app.yml` with:
  - `env_name: prod`, `docker_tag: sha-${{ github.sha[0:7] }}`
  - `additional_tags: app:latest`
  - `cloud_run_service: framehouse-hub-prod`
  - `revision_suffix: ${{ github.sha[0:7] }}`
  - `runtime_service_account: {GCP_RUNTIME_SA_EMAIL}`
  - `run_min_instances: 0`, `run_max_instances: 4`
  - `public_url: https://hub.framehouseworks.com`
  - `gcs_bucket: framehouse-hub-prod`

---

### 5.6 `_deploy-worker.yml` (Reusable Workflow)

**Called by:** `deploy-worker-dev.yml`, `deploy-worker-prod.yml`

**Caller inputs:** `env_name`, `gcs_bucket`, `callback_url`, `image`, `service`, `region`, `dry_run`, `runtime_service_account`

**`deploy_worker` job steps:**
1. `gcp-auth` composite — job-level `permissions: { id-token: write, contents: read }`
2. `deploy-cloudrun` composite:
   - context: `./scripts/worker`, file: `./scripts/worker/Dockerfile`
   - `no_auth: true` — `--no-allow-unauthenticated`
   - `--service-account={runtime_service_account}`
   - `min_instances: 0`, `max_instances: 2`, `memory: 512Mi`, `cpu: 1`, `concurrency: 4`, `timeout: 300s`
   - Secrets: `PROCESSOR_CALLBACK_SECRET`
   - Env vars: `GCS_BUCKET`, `NEXT_PUBLIC_SERVER_URL={callback_url}`
3. Step summary: image, service, region, callback target

**Concurrency:** Callers use `group: deploy-dev` or `group: deploy-prod` — shared with app deploy to enforce ordering.

---

### 5.7 `rollback-prod.yml`

**Triggers:** `workflow_dispatch` only  
**Concurrency:** `group: deploy-prod, cancel-in-progress: false`

**Inputs:**
- `target_sha` (string, required) — 7-char git SHA of the image to roll back to
- `reason` (string, required) — free text; written to audit log

**`rollback_prod` job:**
- `environment: production` — requires reviewer approval
- Job-level permissions: `id-token: write`, `contents: read`
- Steps:
  1. `gcp-auth` composite
  2. Verify image exists: `gcloud artifacts tags list ... --filter="tag={target_sha}"`; exit 1 if absent
  3. Deploy Cloud Run with image `app:sha-{target_sha}` — **no migration step**
  4. Smoke test
  5. Write rollback audit record to `gs://framehouse-hub-prod/audit/rollbacks/{date}/{run-id}.json`
  6. Step summary with rollback target, reason, approver

---

### 5.8 `reset-dev.yml` (Fast-Path Dev Reset)

**Triggers:** `workflow_dispatch` only  
**Concurrency:** `group: deploy-dev, cancel-in-progress: false`  
**Purpose:** Drop and reseed dev DB without wiping GCS storage. Suitable for post-demo cleanup.

**Inputs:**
- `confirm` (string) — must equal `RESET-DEV`
- `redeploy` (bool, default: true)

**Steps:**
1. Phrase guard: `confirm != 'RESET-DEV'` → exit 1
2. `gcp-auth` composite — job-level permissions
3. `setup-node-pnpm` composite
4. Resolve secrets via `google-github-actions/get-secretmanager-secrets`
5. `bash scripts/reset.sh --target dev --skip-storage --no-confirm`
6. Smoke test `https://dev.framehouseworks.com/api/healthz`
7. If `redeploy: true`: `gh workflow run deploy-dev.yml --ref dev`

---

### 5.9 `reset-engine.yml` (Full Reset)

**Triggers:** `workflow_dispatch` only  
**Concurrency:** `group: ${{ inputs.environment == 'prod' && 'deploy-prod' || 'deploy-dev' }}, cancel-in-progress: false`

**Inputs:**
- `environment` (choice: dev, prod)
- `confirm_phrase` (string: `NUKE-DEV` or `NUKE-PROD`)
- `redeploy` (bool, default: true)

**`purge` job:**
- `environment: ${{ inputs.environment == 'prod' && 'production' || 'dev' }}`
- Job-level permissions: `id-token: write`, `contents: read`

**Steps:**
1. Phrase guard
2. `gcp-auth` composite
3. `setup-node-pnpm` composite
4. Resolve secrets
5. `bash scripts/reset.sh --target ${{ inputs.environment }} --no-confirm`
6. Smoke test — URL resolved per environment:
   ```bash
   URL=${{ inputs.environment == 'prod' \
     && 'https://hub.framehouseworks.com' \
     || 'https://dev.framehouseworks.com' }}/api/healthz
   curl -fsS --retry 5 --retry-delay 5 "$URL" | jq -e '.db == "ok"'
   ```
7. If `redeploy: true`: trigger appropriate deploy workflow via `gh workflow run`
8. Step summary

---

## 6. Environment Configuration

> **Caveman summary:** Secrets are passwords. Variables are config. Both live in GitHub settings. The table below says what goes where. Do not hardcode secrets in YAML files. Ever.

### 6.1 GitHub Environments

| Environment | Protection | Required Reviewers | Notes |
|---|---|---|---|
| `dev` | None | — | Auto-deploy on merge to `dev` |
| `production` | Required reviewer(s) + 2-hour deployment wait window | 1 team lead | Approval required for every deploy and every `workflow_dispatch` |

**Deployment wait window:** Configuring a 2-hour window on `production` gives the team time to cancel an accidental trigger before it executes. Reviewers can override the wait by approving immediately.

### 6.2 Secrets Inventory

All secrets at repository level. Scope to environment where noted.

| Secret | Scope | Used by | Notes |
|---|---|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Repo | deploy-*, reset-*, rollback-prod | WIF pool URL — same pool, branch-scoped attribute conditions |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Repo | deploy-*, reset-*, rollback-prod | Runtime SA email |
| `CI_DB_PASSWORD` | Repo | pr-validation e2e | Ephemeral CI postgres only |
| `DATABASE_URI_DEV` | Repo | deploy-dev, reset-dev, reset-engine | Neon dev branch URI |
| `DATABASE_URI_PROD` | Repo | deploy-prod, reset-engine, rollback-prod | Neon prod branch URI |
| `PAYLOAD_SECRET_DEV` | Repo | deploy-dev, reset-dev, remote-migrations | CMS session secret (dev) |
| `PAYLOAD_SECRET_PROD` | Repo | deploy-prod, reset-engine | CMS session secret (prod) |
| `PROCESSOR_CALLBACK_SECRET_DEV` | Repo | deploy-dev, deploy-worker-dev, e2e | Worker↔callback shared HMAC secret |
| `PROCESSOR_CALLBACK_SECRET_PROD` | Repo | deploy-prod, deploy-worker-prod | Worker↔callback shared HMAC secret |
| `SEED_SECRET` | Repo | deploy-dev, deploy-prod, e2e | Remote seed auth token |
| `NEON_API_KEY` | Repo | remote-migrations, _deploy-app | Neon Management API — pre-migration snapshots |

### 6.3 Repository Variables (Non-Secret Config)

| Variable | Value | Used by |
|---|---|---|
| `NODE_VERSION` | `22` | All workflows via `${{ vars.NODE_VERSION }}` |
| `PNPM_VERSION` | `10` | All workflows |
| `GCS_PROJECT_ID` | `framehouse-hub` | All deploy workflows |
| `GCP_RUNTIME_SA_EMAIL` | `{sa}@{project}.iam.gserviceaccount.com` | `--service-account` flag in deploy steps |
| `NEON_PROJECT_ID` | `<neon-project-id>` | remote-migrations, pre-migration snapshots |
| `ARTIFACT_REGISTRY_HOST` | `us-central1-docker.pkg.dev` | All Docker operations |

---

## 7. Cache Strategy

> **Caveman summary:** Caching means we don't re-download the same packages every run. Faster pipelines. Each cache has a key — if the key changes (e.g. lockfile updated), cache is invalidated and rebuilt. Separate scopes per workflow to avoid poisoning.

| Cache | Key Pattern | Scope | Max age |
|---|---|---|---|
| pnpm store | `pnpm-{os}-{lockfile-hash}` | Global | 7 days |
| Next.js build (PR) | `nextjs-pr-{os}-{lockfile-hash}-{src-hash}` | PR validation only | 7 days |
| Next.js build (deploy dev) | `nextjs-deploy-dev-{os}-{lockfile-hash}-{src-hash}` | deploy-dev only | 7 days |
| Next.js build (deploy prod) | `nextjs-deploy-prod-{os}-{lockfile-hash}-{src-hash}` | deploy-prod only | 7 days |
| Playwright browsers | `playwright-chromium-{playwright-version}` | Global | Until version bump |
| Docker layers app dev | GHA scope `app-dev` | deploy-dev only | 7 days |
| Docker layers app prod | GHA scope `app-prod` | deploy-prod only | 7 days |
| Docker layers worker dev | GHA scope `worker-dev` | deploy-worker-dev only | 7 days |
| Docker layers worker prod | GHA scope `worker-prod` | deploy-worker-prod only | 7 days |

**Why separate Next.js scopes for PR vs deploy?** A cancelled PR run can produce a partial `.next` cache snapshot. If the PR and deploy workflows share a cache key, the deploy job may pick up a broken partial build from the PR job. Separate scope keys prevent cross-contamination.

**Build artifact vs cache:** The `.next` build output is uploaded as a **workflow artifact** (not a cache) within `pr-validation` so the `e2e` job can download the exact same binary that was type-checked. Artifacts are run-scoped and never stale.

---

## 8. Security Posture

> **Caveman summary:** Security rules. These exist because pipelines have access to cloud infrastructure and production secrets. Follow all of them. The ones marked CRITICAL mean "if you skip this, an attacker can own the whole cloud account."

### 8.1 Principle of Least Privilege — GitHub Token

**Pattern name:** Job-scoped permissions (GitHub Actions security hardening)  
**Reference:** [GitHub Docs: Permissions for the GITHUB_TOKEN](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)

Every workflow file must declare `permissions: {}` at the top level (denying all by default). Each job then declares only the permissions it actually uses:

| Job type | Required permissions |
|---|---|
| Build / type-check / lint | `contents: read` |
| Test result annotation | `contents: read`, `checks: write` |
| PR comment (E2E report) | `contents: read`, `checks: write`, `pull-requests: write` |
| GCP OIDC deploy | `contents: read`, `id-token: write` |
| Guardrail | `contents: read` |

**Why this matters:** `id-token: write` allows minting of OIDC tokens that can authenticate to GCP. If a malicious third-party action runs in a job with this permission, it can steal GCP credentials. Granting it only to jobs that genuinely deploy closes this attack vector.

### 8.2 Keyless Authentication (Workload Identity Federation)

**Pattern name:** OIDC-based keyless auth  
**Reference:** [google-github-actions/auth — Workload Identity Federation](https://github.com/google-github-actions/auth#workload-identity-federation)

No service account JSON keys are stored anywhere. GitHub OIDC tokens are exchanged for short-lived GCP access tokens via WIF. Token lifetime: 1 hour (Cloud Run deploy typically completes in < 10 min).

**WIF attribute condition (recommended addition — not yet implemented):**
```
attribute.ref == 'refs/heads/dev'       → allow assume for deploy-dev SA
attribute.ref == 'refs/heads/main'      → allow assume for deploy-prod SA  
attribute.ref.startswith('refs/pull/')  → deny assume entirely (CI only)
```

This prevents a compromised feature branch workflow from assuming the production SA.

### 8.3 `persist-credentials: false` on Checkout

All `actions/checkout@v4` calls within the `setup-node-pnpm` composite set:
```yaml
with:
  persist-credentials: false
  fetch-depth: 1
```

`persist-credentials: false` revokes the default `GITHUB_TOKEN` after the checkout step completes. Jobs that use OIDC/WIF authentication do not need the GitHub token after checkout; revoking it means no downstream step can accidentally or maliciously push to the repo using it.

### 8.4 Secret Classification

| Class | Examples | Storage | Rotation period |
|---|---|---|---|
| GCP credentials | `GCP_WORKLOAD_IDENTITY_PROVIDER` | GitHub Secret | On WIF pool change |
| Database URIs | `DATABASE_URI_DEV/PROD` | GitHub Secret + GCP Secret Manager | On DB password rotation |
| App secrets | `PAYLOAD_SECRET_*` | GitHub Secret + GCP Secret Manager | Quarterly (manual) |
| Shared HMAC secrets | `PROCESSOR_CALLBACK_SECRET_*` | GitHub Secret + GCP Secret Manager | Quarterly (manual) |
| CI ephemeral | `CI_DB_PASSWORD` | GitHub Secret | Annually (low risk) |

**Cloud Run mounting:** All secrets consumed by Cloud Run revisions are mounted via GCP Secret Manager (`secrets:` block), not `env_vars:`. Secret Manager provides audit logs of every access, rotation support, and version pinning.

### 8.5 Audit Trail

Every production deploy and rollback writes a structured JSON record to GCS:
```
gs://framehouse-hub-prod/audit/deploys/{YYYY-MM-DD}/{run-id}.json
gs://framehouse-hub-prod/audit/rollbacks/{YYYY-MM-DD}/{run-id}.json
```

Record schema:
```json
{
  "event": "deploy|rollback",
  "env": "prod",
  "sha": "abc1234def5678",
  "actor": "github-username",
  "approver": "github-username",
  "run_id": "123456789",
  "workflow": "deploy-prod.yml",
  "image": "app:sha-abc1234",
  "timestamp": "2026-05-31T14:32:00Z",
  "smoke_test": "pass|fail",
  "reason": "(rollback only) free text from input"
}
```

GCS bucket lifecycle: audit records retained for 90 days (free-tier: GCS Standard storage < 5 GB is free).

---

## 9. Free Tier Budget Analysis

> **Caveman summary:** GitHub Actions gives 2,000 free minutes per month. GCP gives free compute, storage, and DB within limits. Every new job costs minutes. This section shows the budget. Do not add jobs without checking this table first.

### 9.1 GitHub Actions (2,000 min/month free on public repos; Linux runners billed 1:1)

| Scenario | Est. wall-clock | Billed min | Frequency | Monthly total |
|---|---|---|---|---|
| feature→dev PR (parallel quality_gate + int_tests, sharded e2e) | ~18 min wall | ~28 min billed (3 jobs parallel) | 25/month | 700 min |
| dev→main PR (adds remote_migrations) | ~35 min wall | ~50 min billed | 5/month | 250 min |
| deploy-dev (no validate, 1 job) | ~8 min | ~8 min | 20/month | 160 min |
| deploy-worker-dev (path-scoped) | ~6 min | ~6 min | 5/month | 30 min |
| deploy-prod (1 job + env approval) | ~10 min | ~10 min | 4/month | 40 min |
| reset-dev | ~5 min | ~5 min | 4/month | 20 min |
| rollback-prod | ~6 min | ~6 min | 1/month | 6 min |
| **Total** | | | | **~1,206 min / 2,000** |

Headroom: ~794 min/month (~40%). Billed minutes are higher than wall-clock minutes when parallel jobs run on separate runners simultaneously.

**Budget alert threshold:** If monthly usage exceeds 1,600 min, review for redundant job triggers before the next billing cycle.

### 9.2 Neon DB (10 branches free, 0.5 GB storage)

| Branch | Type | Lifetime |
|---|---|---|
| `main` | Persistent (prod) | Permanent |
| `dev` | Persistent (dev) | Permanent |
| `gh-pr-{n}` | Ephemeral | ~15 min (cleaned up in CI) |
| `pre-migration-dev-{sha7}` | Ephemeral | ~10 min (deleted on success) or 24h (on failure, manual cleanup) |
| `pre-migration-prod-{sha7}` | Ephemeral | Same |

Peak simultaneous branches: 2 permanent + 2 ephemeral (worst case: PR check + deploy running at same time) = **4 of 10**. Safe.

**Neon storage budget:** Ephemeral branches share storage with parent (copy-on-write). Each dev/prod DB at MVP scale is < 50 MB. Well within 0.5 GB.

### 9.3 GCP Artifact Registry (0.5 GB free)

- Keep-10 / delete-30d policy via `set-cleanup-policy.sh` already in place.
- Worker images rebuilt only when `scripts/worker/**` changes.
- Dev app image `:dev` is mutable — always overwritten, never accumulates.
- Prod app images: SHA-tagged, keep-10 limits to ~10 images × ~200 MB compressed ≈ 2 GB raw but compression typically achieves ~80% reduction → ~400 MB. Monitor after 3 prod deploys.

### 9.4 Cloud Run (2M requests/month free, 360K vCPU-seconds/month, 180K GB-seconds/month)

| Service | Config | Monthly cost at MVP (<1K DAU) |
|---|---|---|
| `framehouse-hub-dev` | 0-4 instances, 512Mi, 1 CPU | ~0 (cold-start only) |
| `framehouse-hub-worker-dev` | 0-2 instances, 512Mi, 1 CPU | ~0 (event-driven) |
| `framehouse-hub-prod` | 0-4 instances, 512Mi, 1 CPU | ~0 (cold-start only) |
| `framehouse-hub-worker-prod` | 0-2 instances, 512Mi, 1 CPU | ~0 (event-driven) |

All services use `--min-instances=0`. No idle compute cost.

### 9.5 GCS (5 GB free storage, 1 GB egress/month free)

| Bucket | Estimated size | Contents |
|---|---|---|
| `framehouse-hub-dev` | < 500 MB | Media assets + audit logs |
| `framehouse-hub-prod` | < 1 GB | Media assets + audit logs |

Both within free tier at MVP scale.

---

## 10. Edge Cases

> **Caveman summary:** These are the "what if" scenarios. Each one says: here is the problem, here is what could go wrong, here is how the pipeline handles it. If you are building the pipeline, make sure every case here is tested manually before marking the ticket done.

### EC-01: Rapid pushes to a PR branch (force-push after review comments)
**Scenario:** Developer pushes two commits to the same PR branch within seconds.  
**Risk:** Two `pr-validation` runs racing; stale run's status check blocks merge.  
**Resolution:** `concurrency.cancel-in-progress: true` keyed on `pull_request.number` cancels the first run. Only the latest run's status is checked by branch protection.

### EC-02: Developer pushes directly to `dev` without a PR
**Scenario:** Someone bypasses the PR flow.  
**Risk:** Untested code deploys to dev.  
**Resolution:** Branch protection on `dev` requires passing `quality_gate`, `integration_tests`, `e2e` status checks before merge. Direct pushes are blocked at GitHub level.

### EC-03: Neon ephemeral branch left dangling (interrupted `remote-migrations` run)
**Scenario:** Runner dies mid-job; `if: always()` cleanup never runs.  
**Risk:** Branch quota fills; next PR cannot create branch.  
**Resolution:** Pre-flight delete (`neonctl branches delete gh-pr-{n} --force 2>/dev/null || true`) before every create. Idempotent — no manual intervention required.

### EC-04: Two dev→main PRs open simultaneously
**Scenario:** Branch protection isn't fully locked.  
**Risk:** Two `remote-migrations` runs each create a Neon branch.  
**Resolution:** Both use unique names (`gh-pr-{pr-number}`). Peak = 4 branches (2 perm + 2 ephemeral). Both clean up. Safe.

### EC-05: `pnpm payload migrate` fails on the live Neon dev DB mid-deploy
**Scenario:** Bad migration committed; deploy hits actual dev DB.  
**Risk:** Dev DB in partial migration state; Cloud Run deploy follows regardless.  
**Resolution:** Migration runs before Docker build+push. On failure: workflow exits non-zero; `deploy-cloudrun` composite never executes; old revision keeps serving. Pre-migration snapshot branch is kept for data recovery.

### EC-06: Docker build succeeds but Cloud Run deploy fails (quota/IAM error)
**Scenario:** Image pushed to AR but Cloud Run update fails.  
**Risk:** Registry accumulates unused images; service not updated.  
**Resolution:** Cleanup policy handles registry. Failure in step summary. Previous revision continues serving. Developer re-triggers via `workflow_dispatch`.

### EC-07: `SEED_SECRET` accidentally routed to `env_vars:` instead of `secrets:` block
**Scenario:** Future developer copies the old (broken) pattern.  
**Risk:** Secret visible in Cloud Run Console revision details.  
**Resolution:** `_deploy-app.yml` is the single source for all Cloud Run deploy calls. `SEED_SECRET` is hardcoded into its `secrets:` block and is never a caller input — it cannot be overridden.

### EC-08: E2E shard 1 passes but shard 2 fails
**Scenario:** Flaky or failing test in shard 2.  
**Risk:** Partial results confuse developer.  
**Resolution:** Matrix with `fail-fast: false` — both shards run to completion and upload blob reports. Merged HTML report provides full picture. Job fails if either shard fails.

### EC-09: `.next` build artifact is from a different run than the type-check
**Scenario:** Build artifact is somehow stale.  
**Risk:** E2E tests against a build that wasn't type-checked.  
**Resolution:** Artifact name includes `{run-id}`. `e2e` downloads only from the same run. Cross-run contamination is structurally impossible.

### EC-10: Prod deploy triggered via `workflow_dispatch` without approval
**Scenario:** Developer manually triggers `deploy-prod.yml`.  
**Risk:** Unreviewed prod deploy.  
**Resolution:** `environment: production` blocks the job until a required reviewer approves. Applies to both push and `workflow_dispatch` triggers.

### EC-11: Docker GHA cache fills (>10 GB limit) and starts evicting
**Scenario:** Active development with many pushes.  
**Risk:** Cache misses cause full Docker rebuilds.  
**Resolution:** Cache scoped separately per service+env (4 scopes). `mode=max` keeps only latest snapshot per scope. GitHub auto-evicts LRU beyond 10 GB. Build still succeeds; next push regenerates.

### EC-12: `reset-engine.yml` run for `prod` when `dev` was intended
**Scenario:** Operator selects wrong environment.  
**Risk:** Production data loss.  
**Resolution:** Confirmation phrase guard (`NUKE-PROD`). Environment gate requires reviewer approval for prod. Two independent guards must both pass.

### EC-13: Worker `go.mod` updated — does path trigger catch it?
**Scenario:** `go.mod` changes without `Dockerfile` changes.  
**Risk:** Stale worker deployed.  
**Resolution:** `scripts/worker/**` glob matches all files in the directory including `go.mod`, `go.sum`, `main.go`. Already handled.

### EC-14: Schema drift from Payload version bump
**Scenario:** `@payloadcms/*` bumped; generated types change.  
**Risk:** PR blocked with confusing failure.  
**Resolution:** `quality_gate` runs `generate:importmap && generate:types` and checks dirty tree. Step summary directs developer to run locally and commit. Intentional design — schema changes must be explicit.

### EC-15: Playwright browser cache stale after version bump
**Scenario:** `@playwright/test` bumped in `package.json`.  
**Risk:** Old binaries loaded; tests fail with version mismatch.  
**Resolution:** Cache key includes `{playwright-version}` extracted at runtime via `pnpm exec playwright --version`. Version bump changes key; fresh install occurs.

### EC-16: deploy-dev fires for a doc-only commit
**Scenario:** Merge commit to `dev` contains only `.md` changes.  
**Risk:** Full Docker build + deploy wasted for a no-op — ~8 min.  
**Resolution:** `paths-ignore: ['**.md', 'docs/**']` on the `push` trigger. `workflow_dispatch` always fires regardless.

### EC-17: Concurrent `deploy-dev` and `reset-dev` triggered simultaneously
**Scenario:** Developer triggers `reset-dev.yml` while `deploy-dev.yml` is mid-flight.  
**Risk:** Deploy overwrites reset; or reset wipes DB that deploy just migrated.  
**Resolution:** Both use `group: deploy-dev, cancel-in-progress: false`. Second workflow queues behind the first. No concurrent DB mutations.

### EC-18: Health check passes but app returns 5xx for real requests
**Scenario:** `/api/healthz` is shallow; underlying DB connection broken.  
**Risk:** Deploy marked successful; app is actually down.  
**Resolution:** `/api/healthz` **must** include a `SELECT 1` DB ping and return `{ "db": "ok" }`. Pipeline spec requires `jq -e '.db == "ok"'` on the response. A 200 without this key fails the smoke test.

### EC-19: `pnpm-lock.yaml` changes between jobs in the same workflow run
**Scenario:** Hypothetical — could this ever happen?  
**Risk:** Inconsistent installs across jobs.  
**Resolution:** All jobs check out the same commit SHA via `actions/checkout`. Lockfile is immutable within a workflow run. Structurally impossible.

### EC-20: Neon `connection-string` output contains leading whitespace
**Scenario:** `neonctl` prints URI with whitespace padding.  
**Risk:** `sslmode=` check fails; malformed URI passed to `migrate`.  
**Resolution:** Capture via `| xargs` to trim: `CONNECTION_STRING=$(pnpm exec neonctl connection-string ... | xargs)`. Mirrors existing fix in `setup-eventarc.sh`.

### EC-21: Worker and app both have changes in the same push — concurrent deploys race
**Scenario:** A commit to `dev` touches both `src/` and `scripts/worker/**`.  
**Risk:** Worker deploys while app is mid-deploy; callback calls a partially-deployed app revision.  
**Resolution:** Both deploy workflows share `group: deploy-dev`. They queue, not race. App deploys first (triggered by `push` with broader path match); worker queues behind it. The app's callback endpoint is stable before the worker starts sending events.

### EC-22: Pre-migration snapshot branch not cleaned up after failed deployment
**Scenario:** `_deploy-app.yml` migration fails; smoke test never runs; snapshot cleanup step is skipped.  
**Risk:** Neon branches accumulate; quota fills over time.  
**Resolution:** Snapshot is kept intentionally on migration failure (data recovery resource). A separate **branch cleanup policy** must be documented: pre-migration branches older than 48 hours should be manually deleted. Add a monthly maintenance step to the runbook.

### EC-23: `permissions: {}` at workflow level breaks `actions/checkout` in a job
**Scenario:** Setting `permissions: {}` at workflow level denies `contents: read`; checkout fails.  
**Risk:** All jobs fail to check out code.  
**Resolution:** Each job must explicitly declare `permissions: { contents: read, ... }`. The `setup-node-pnpm` composite does not declare permissions — permissions live on jobs, not composite actions. This is a common misconfiguration; document explicitly in composite action README.

### EC-24: WIF token request fails because `id-token: write` is missing from a deploy job
**Scenario:** Developer adds a new job to `_deploy-app.yml` without `id-token: write`.  
**Risk:** GCP authentication fails with `Error: google-github-actions/auth failed`.  
**Resolution:** The `gcp-auth` composite's README must document: the calling job **must** declare `permissions: { id-token: write, contents: read }`. This is enforced by code review, not by CI.

### EC-25: Rollback to a SHA whose image has been evicted by AR cleanup policy
**Scenario:** Operator tries to roll back to a deploy from 35 days ago; the image was deleted by the keep-10/delete-30d policy.  
**Risk:** Rollback fails; no recovery path.  
**Resolution:** `rollback-prod.yml` step 2 verifies the image tag exists in Artifact Registry before proceeding. On failure: step summary directs operator to rebuild from the target git commit using `workflow_dispatch` on `deploy-prod.yml` with `dry_run: false` after checking out that SHA via a hotfix branch. The AR cleanup policy should be reviewed to retain at minimum the last 5 production SHA tags.

---

## 11. Acceptance Criteria

> **Caveman summary:** These are the pass/fail tests. Spec is done when ALL these pass. If any one fails, implementation is not complete.

### 11.1 Pipeline Correctness

- [ ] `main` does not accept a PR from any branch other than `dev` — guardrail exits 1 with a meaningful step summary.
- [ ] A PR with failing `tsc --noEmit` is blocked from merging.
- [ ] A PR with uncommitted schema drift is blocked with a step summary directing the fix.
- [ ] A PR with failing integration tests is blocked.
- [ ] A PR with failing E2E (either shard) is blocked.
- [ ] A `dev→main` PR that fails `remote-migrations` is blocked.
- [ ] A prod deploy (push or `workflow_dispatch`) waits for reviewer approval before any deploy step executes.
- [ ] A rollback to a non-existent SHA tag fails at the verification step, not mid-deploy.
- [ ] `reset-engine.yml` health check uses the correct URL for each environment.

### 11.2 Performance

- [ ] Feature→dev PR completes in ≤ 22 minutes wall-clock.
- [ ] Dev→main PR completes in ≤ 40 minutes wall-clock.
- [ ] `deploy-dev` completes in ≤ 12 minutes.
- [ ] Monthly GitHub Actions usage ≤ 1,500 minutes under baseline cadence (25 feature PRs, 5 dev→main, 20 dev deploys).

### 11.3 Security

- [ ] No workflow file declares `permissions:` at workflow level (except `permissions: {}` as an explicit lockdown).
- [ ] Every job that uses `gcp-auth` declares `id-token: write` at job level only.
- [ ] Every `actions/checkout` call sets `persist-credentials: false`.
- [ ] `SEED_SECRET` appears only in `secrets:` blocks — never in `env_vars:` in any Cloud Run deploy.
- [ ] Every Cloud Run deploy step specifies `--service-account={runtime-sa-email}`.
- [ ] No hardcoded passwords in any workflow YAML (including CI postgres password — must use `${{ secrets.CI_DB_PASSWORD }}`).

### 11.4 Maintainability

- [ ] All Node.js toolchain setup uses `setup-node-pnpm` composite — no duplicated setup steps.
- [ ] All GCP auth uses `gcp-auth` composite — no duplicated auth steps.
- [ ] Both `deploy-dev.yml` and `deploy-prod.yml` call `_deploy-app.yml` — zero duplicated deploy logic.
- [ ] Cloud Run resource flags (`--min-instances`, `--memory`, etc.) are defined in `deploy-cloudrun` composite only.
- [ ] `NODE_VERSION` and `PNPM_VERSION` are GitHub repository variables, not hardcoded strings.
- [ ] All workflow files use `ubuntu-24.04` (pinned), not `ubuntu-latest`.

### 11.5 Observability

- [ ] Every deploy workflow emits a step summary: image digest, Cloud Run URL, revision name, migration status, smoke test result.
- [ ] Failed E2E runs upload a merged HTML Playwright report artifact.
- [ ] Integration test JUnit XML is uploaded on every run (not failure-only).
- [ ] Every prod deploy writes a structured JSON audit record to GCS.
- [ ] Every prod rollback writes a structured JSON audit record to GCS.

### 11.6 Resilience

- [ ] A failed migration halts the deploy; old Cloud Run revision continues serving.
- [ ] A pre-migration Neon snapshot branch exists when a migration runs against a live environment.
- [ ] `reset-dev.yml` and `reset-engine.yml` share the `deploy-dev`/`deploy-prod` concurrency group.
- [ ] Worker and app deploys triggered by the same push are serialised, not concurrent.

---

## 12. Out of Scope (Deferred)

> **Caveman summary:** This list is things we know we should do eventually but are not doing now. Mention these when planning future sprints.

| Item | Why deferred | When to revisit |
|---|---|---|
| Slack / webhook deploy notifications | Post-MVP; team is small | When team > 5 |
| Automated semantic versioning + CHANGELOG generation | Not needed until public API exists | When REST API is stable |
| Canary / traffic-split deployments | Cloud Run supports it; no traffic to split at MVP | When DAU > 1K |
| Multi-region failover | Single-region GCP is free-tier safe; multi-region adds cost | When SLA > 99% required |
| Dependabot auto-merge for patch bumps | Risk of silent regressions without human review | When test coverage > 80% |
| **Security scanning (Trivy image CVE, CodeQL SAST)** | **Addable to `quality_gate` with ~0 extra cost (free for public repos) — highest priority deferred item** | Next quarter |
| Performance regression testing (Lighthouse CI) | No baseline established yet | After first public release |
| SLSA provenance attestation | Forward-thinking; `actions/attest-build-provenance` is free | Post-MVP supply chain hardening |
| WIF attribute conditions scoped to specific branches | Requires IAM reconfiguration; low risk at current team size | Before first external contractor joins |
| Go worker unit tests (`*_test.go`) | Worker code is simple currently; risk is low | As worker complexity grows |
| Neon pre-migration snapshot automated cleanup (> 48h) | Currently manual; low frequency | When deploy frequency > 2/week |

---

## 13. Implementation Plan

> **Caveman summary:** Do these steps in order. Each step is small and testable. Do not skip steps. Mark done when actually done, not when "probably done".

| Step | Description | Effort | Fixes |
|---|---|---|---|
| 1 | Configure `ubuntu-24.04` across all existing workflow files (search + replace) | XS | P23 |
| 2 | Add `permissions: {}` at workflow level + per-job scoped permissions to all 6 existing workflows | S | P21 |
| 3 | Add `persist-credentials: false, fetch-depth: 1` to all `actions/checkout` calls | XS | P22 |
| 4 | Create `actions/setup-node-pnpm/action.yml` composite | S | P10, P9 |
| 5 | Create `actions/gcp-auth/action.yml` composite | S | P10 |
| 6 | Create `actions/deploy-cloudrun/action.yml` composite (includes `--service-account` flag) | M | P10, P25 |
| 7 | Create `_deploy-app.yml` reusable workflow (includes pre-migration snapshot, audit record) | L | P1, P4, P14, P15, P27 |
| 8 | Create `_deploy-worker.yml` reusable workflow | S | P15 |
| 9 | Refactor `deploy-dev.yml` to call `_deploy-app.yml`; remove validate job; fix concurrency; add paths-ignore | S | P1, P16, P20 |
| 10 | Refactor `deploy-prod.yml` to call `_deploy-app.yml`; add `environment: production`; fix gate | S | P2, P8 |
| 11 | Refactor `deploy-worker-dev.yml` + `deploy-worker-prod.yml` to call `_deploy-worker.yml`; align concurrency groups | S | P11, P26 |
| 12 | Refactor `pr-validation.yml`: per-job permissions, sharded E2E, build artifact, `persist-credentials: false` | M | P12, P16, P21, P22 |
| 13 | Fix `reset-engine.yml`: health check URL, redeploy input, concurrency group, per-job permissions | S | P7, P17 |
| 14 | Create `reset-dev.yml` fast-path workflow | S | — |
| 15 | Create `rollback-prod.yml` with image existence check + audit record | M | P28, P13 |
| 16 | Move `SEED_SECRET` to `secrets:` block in `_deploy-app.yml` | XS | P6 |
| 17 | Add `paths-ignore` to `deploy-dev.yml` for doc-only commits | XS | EC-16 |
| 18 | Configure GitHub repository variables: `NODE_VERSION`, `PNPM_VERSION`, `GCS_PROJECT_ID`, `GCP_RUNTIME_SA_EMAIL`, `ARTIFACT_REGISTRY_HOST`, `NEON_PROJECT_ID` | XS | — |
| 19 | Configure GitHub Environments: `dev` (no protection), `production` (1 reviewer + 2h wait window) | XS | P8 |
| 20 | Validate all 25 edge cases manually or via `workflow_dispatch` dry-run | L | all |
| 21 | Update `docs/ci-pr-validation.md` and this spec to reflect final implemented state | S | — |

Effort key: XS < 1h, S = 1–3h, M = 3–6h, L = 6–12h.

**Recommended sequence:** Steps 1–3 are pure safety fixes — apply to existing workflows immediately, before any structural refactor. Steps 4–11 are the structural refactor. Steps 12–21 are the new workflows and configuration.

---

## 14. Appendix — Required GitHub Settings

> **Caveman summary:** These are settings you click in the GitHub website. They cannot be set via code. Someone with admin access to the repo must do these manually after the pipeline files are merged.

### Branch Protection — `main`

| Setting | Value |
|---|---|
| Require pull request | Yes |
| Required approvals | 1 |
| Required status checks | `guardrail`, `quality_gate`, `integration_tests`, `e2e (1/2)`, `e2e (2/2)`, `remote_migrations` |
| Require branches up to date | Yes |
| Allow bypass | No |
| Restrict direct pushes | Yes (no one) |
| Require signed commits | Recommended (post-MVP) |

### Branch Protection — `dev`

| Setting | Value |
|---|---|
| Require pull request | Yes |
| Required approvals | 1 |
| Required status checks | `quality_gate`, `integration_tests`, `e2e (1/2)`, `e2e (2/2)` |
| Require branches up to date | Yes |
| Allow bypass | No |
| Restrict direct pushes | Yes (no one) |

### Environment Settings — `production`

| Setting | Value |
|---|---|
| Required reviewers | 1 (team lead) |
| Deployment wait timer | 120 minutes |
| Prevent self-review | Yes |
| Deployment branches | `main` only |

### WIF Attribute Conditions (GCP IAM — manual via gcloud)

Apply to the WIF pool binding for the deploy SA:
```
attribute.ref == 'refs/heads/main'    # prod deploys only
attribute.ref == 'refs/heads/dev'     # dev deploys only (separate binding)
```
This ensures feature branch CI runs cannot assume the deploy SA even if a third-party action attempts to mint GCP tokens.

---

## Glossary

> **Caveman summary:** Words used in this document explained simply.

| Term | Plain-English meaning |
|---|---|
| **CI** (Continuous Integration) | Automated checks that run every time code is submitted |
| **CD** (Continuous Delivery/Deployment) | Automated process to ship tested code to an environment |
| **WIF** (Workload Identity Federation) | A way for GitHub Actions to talk to GCP without storing passwords |
| **OIDC** | A protocol for proving identity — GitHub gives GCP a signed certificate instead of a password |
| **Composite action** | A reusable mini-workflow you can call from other workflows |
| **Reusable workflow** | A full workflow file that other workflow files can call with different inputs |
| **Concurrency group** | A rule that says "only one run of this type at a time" |
| **Smoke test** | A quick check after deploy to verify the app responds to basic requests |
| **Ephemeral branch (Neon)** | A temporary copy of the database used only for CI checks, then deleted |
| **Least privilege** | Only give a process the minimum permissions it needs — nothing extra |
| **Idempotent** | An operation you can safely repeat multiple times without different results |
| **Audit trail** | A record of who did what and when — stored permanently |
| **SLSA** | Supply-chain Levels for Software Artifacts — a standard for proving a build wasn't tampered with |
| **MTTR** | Mean Time to Recovery — how long it takes to fix an incident |
| **SHA tag** | A Docker image tagged with the git commit hash, making it uniquely identifiable and immutable |
| **Neon** | The Postgres-compatible cloud database service used for both dev and production |
| **Cloud Run** | GCP's serverless container platform — runs Docker containers, scales to zero |
