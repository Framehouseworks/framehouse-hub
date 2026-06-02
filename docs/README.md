# Framehouse Hub — Documentation

Welcome to the Framehouse Hub engineering documentation. This is the authoritative reference for all engineers joining the project, covering architecture, backend, frontend, DevOps, team workflows, and feature specifications.

## Quick Start

```bash
git clone <repo>
cd framehouse-hub
pnpm install
cp .env.example .env.local   # fill in required vars
pnpm dev                     # starts Next.js (port 3000) + Go worker (port 8080)
pnpm seed                    # seeds DB with users, media, pages
# → http://localhost:3000/admin  |  sys.admin@framehouseworks.com / password123
```

## Documentation Map

| Section | Description | Start Here |
|---------|-------------|------------|
| **[Onboarding](onboarding/README.md)** | Platform overview, day 1 setup, glossary | New joiners |
| **[Architecture](architecture/README.md)** | System design decisions, data model, media pipeline | Everyone |
| **[Backend](backend/README.md)** | Collections, APIs, access control, database migrations | Backend engineers |
| **[Frontend](frontend/README.md)** | Routing, components, design system, state management | Frontend engineers |
| **[DevOps](devops/README.md)** | Local dev setup, CI/CD pipelines, GCP infrastructure, deployments | DevOps / all engineers |
| **[Workflows](workflows/README.md)** | Git branching, PR process, testing strategy | All engineers |
| **[Features](features/README.md)** | Product & engineering specs for each major feature | Product / feature work |

---

## Section Summaries

### [Onboarding](onboarding/README.md)
- [Getting Started](onboarding/getting-started.md) — Prerequisites, environment setup, first run
- [Glossary](onboarding/glossary.md) — Platform terminology (Enclave, Accession ID, Smart Collection, etc.)

### [Architecture](architecture/README.md)
- [Data Model](architecture/data-model.md) — All 20 collections, relations, ER diagram
- [Media Pipeline](architecture/media-pipeline.md) — Local and cloud ingestion flows, sequence diagrams

### [Backend](backend/README.md)
- [Collections](backend/collections.md) — Every collection: fields, hooks, access, admin config
- [API Reference](backend/api-reference.md) — All 40+ API endpoints with request/response shapes
- [Access Control](backend/access-control.md) — Role system, access modules, document-level rules
- [Database](backend/database.md) — Migration workflow, indices, seeding, Neon/Docker setup

### [Frontend](frontend/README.md)
- [Routing](frontend/routing.md) — Route groups, all pages, middleware, dynamic segments
- [Components](frontend/components.md) — UI primitives, feature components, blocks system
- [Design System](frontend/design-system.md) — "The Curated Gallery" — tokens, rules, animations
- [State & Providers](frontend/state-providers.md) — UploadProvider, AuthProvider, Server Actions

### [DevOps](devops/README.md)
- [Local Development](devops/local-development.md) — Full local setup, Go worker, verify scripts
- [CI/CD](devops/ci-cd.md) — All GitHub Actions workflows, PR validation, deploy pipelines
- [GCP Infrastructure](devops/gcp-infrastructure.md) — Cloud Run, GCS, Eventarc, IAM, Secret Manager
- [Deployment](devops/deployment.md) — Deploy runbook, prod enable checklist, rollback
- [Seed Guide](devops/seed-guide.md) — Seeded users, fixture media, orphan cleanup
- [Reset Engine](devops/reset-engine.md) — DB/storage reset workflow (dev and prod)

### [Workflows](workflows/README.md)
- [Git Workflow](workflows/git-workflow.md) — Branch naming, commit format, PR process, guardrail
- [Testing](workflows/testing.md) — Integration tests (Vitest), E2E tests (Playwright), CI behaviour

### [Features](features/README.md)
All feature specs are audited against the current codebase — each has an **IMPLEMENTATION STATUS** banner at the top.

| Feature | Status |
|---------|--------|
| [Smart Collections](features/FRH-47-smart-collections.md) | Implemented |
| [Expanded Collection View](features/FRH-49-expanded-collection-view.md) | Implemented |
| [Asset Viewer](features/FRH-56-asset-viewer.md) | Implemented |
| [Portfolio Viewer](features/FRH-58-portfolio-viewer.md) | Implemented |
| [Client Review Portal](features/FRH-62-client-review-portal.md) | Implemented |
| [Admin Oversight](features/FRH-admin-oversight.md) | Implemented |
| [Portfolio Creation Engine](features/FRH-portfolio-creation-engine.md) | Implemented |
| [Section Layout Builder](features/FRH-section-layout-builder.md) | Implemented |
| [Global Search](features/global-search.md) | Implemented |
| [Ingest Sessions](features/ingest-sessions.md) | Implemented |
| [Manual Collections](features/manual-collections.md) | Implemented |
| [Media Showcase](features/media-showcase.md) | Partially Implemented |

---

## Before You Open Your First PR

1. Read **[Architecture Overview](architecture/README.md)** — understand the system before touching it
2. Run `./scripts/verify-local.sh` — confirm your local setup is green
3. Understand the **branch rules**: feature branches → `dev` → `main` (never feature → `main` directly)
4. Run `pnpm test` — integration + E2E must pass
5. Check that `pnpm generate:types` is clean after any schema changes
6. Review the **[PR template](../.github/pull_request_template.md)** before submitting

---

## Key Contacts

| Role | Responsibility |
|------|---------------|
| Platform Lead | Architecture decisions, Payload config, GCP infrastructure |
| Frontend Lead | Component standards, design system, routing |
| Backend Lead | Collections, API routes, migrations, Go worker |
| DevOps | CI/CD pipelines, Cloud Run, GCS, Secret Manager |

> Update this table with actual names and Slack handles when onboarding new team members.
