# Framehouse Hub — Engineer Onboarding

Welcome to Framehouse Hub. This guide is your starting point as a new engineer on the project.

---

## What Is Framehouse Hub?

Framehouse Hub is a **digital asset management (DAM) and portfolio platform** built for professional photographers and creative studios. It provides:

- **Archival ingest** of photo and video assets with automatic WebP derivative generation
- **Smart Collections** — rule-based dynamic groupings of media
- **Portfolio builder** — curated, section-based presentations shared with clients via review links
- **Client review portal** — stateless viewer sessions with comment and download capabilities
- **Admin oversight** — activity logs, diagnostic sessions, and system health tooling

The platform is multi-tenant at the user level: each creative's assets are isolated in their own storage enclave.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| CMS | Payload CMS v3 (embedded inside Next.js) |
| Database | PostgreSQL via Neon (serverless, cloud) / Docker (local) |
| Object Storage | Google Cloud Storage (cloud) / local disk enclave (dev) |
| Media Processing | Go 1.21+ worker service (WebP derivatives via `cwebp`) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict) |
| Package Manager | pnpm |
| CI/CD | GitHub Actions |
| Cloud Platform | GCP — Cloud Run, GCS, Eventarc, Secret Manager |

---

## Key URLs

| Environment | URL |
|---|---|
| Local app | http://localhost:3000 |
| Local admin | http://localhost:3000/admin |
| Dev cloud | https://dev.framehouseworks.com |
| Dev admin | https://dev.framehouseworks.com/admin |

Default seeded admin credentials (local and dev): `sys.admin@framehouseworks.com` / `password123`

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/framehouseworks/framehouse-hub.git
cd framehouse-hub

# 2. Install dependencies
pnpm install

# 3. Copy and configure environment
cp .env.example .env.local
# Edit .env.local — see docs/onboarding/getting-started.md for required vars

# 4. Start local development
pnpm dev
```

See [Getting Started](./getting-started.md) for the full Day 1 setup guide.

---

## Documentation Map

| Document | Description |
|---|---|
| [Getting Started](./getting-started.md) | Prerequisites, environment setup, first run, common gotchas |
| [Glossary](./glossary.md) | Platform terminology — Enclave, Accession ID, Smart Collection, etc. |
| [Architecture Overview](../architecture/README.md) | System diagram, route groups, key decisions, environment modes |
| [CI/CD Pipeline Guide](../cicd-pipeline-guide.md) | GitHub Actions workflows, branch guardrails, blank-slate verification |
| [Seed Guide](../seed-guide.md) | How seeding works, what data is created, cloud vs. local caveats |
| [FRH-52 Architecture](../FRH-52-architecture.md) | Media ingestion pipeline deep-dive (storage path contract, worker flow) |
| [Ingest Sessions](../ingest-sessions-overhaul.md) | Upload session grouping, batch tracking |
| [Portfolio Viewer Spec](../FRH-58-portfolio-viewer-spec.md) | Portfolio creation and client-facing viewer |
| [Client Review Portal](../FRH-62-client-review-portal.md) | Stateless client review session design |
| [Admin Oversight Dashboard](../FRH-admin-oversight-dashboard-spec.md) | Admin activity logs and diagnostics |
| [Smart Collections Spec](../FRH-47-smart-collections-spec.md) | Rule engine and dynamic collection behavior |

---

## Who to Ask

| Area | Team |
|---|---|
| Next.js UI, components, styling | Frontend |
| Payload collections, API routes, DB migrations | Backend |
| Cloud Run, GCS, Eventarc, CI/CD, Go worker | DevOps / Platform |
| Access control, auth, user roles | Backend |
| Portfolio UX, client review flows | Frontend + Backend |

---

## Branch & PR Flow

```
feature/your-branch → dev → main
```

- All PRs target `dev`. The `guardrail` CI job blocks direct PRs to `main` from feature branches.
- `main` only accepts PRs from `dev`.
- Pre-push hooks run lint, build, and blank-slate DB verification (`./scripts/verify-local.sh`).
