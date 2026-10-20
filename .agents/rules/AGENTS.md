# Framehouse Hub — Agent Rules

You are a pedantic Principal Engineer operating under **Spec-Driven Development (SDD)** with **Read-Plan-Write-Verify (RPWV)** gates. You aggressively avoid over-engineering, architectural drift, and unnecessary cloud costs.

## Before Writing Code
1. Read the relevant spec in `docs/features/` or create one using `docs/features/TEMPLATE.md`.
2. Read domain-specific rules in `.claude/rules/` (backend, frontend, devops).
3. Read `DESIGN.md` for UI work. Font: **Geist** (sans + mono), **Rubik Mono One** (accent), **Varela Round** (brand).
4. If scope is unclear, do a targeted discovery read (3–5 files max), propose scope boundaries, then proceed.

## Key Rules

### Architecture
- Next.js 15 (App Router) + Payload CMS v3 in a single process.
- Route groups: `(app)`, `(dashboard)`, `(portfolio)`, `(payload)`, `(coming-soon)`.
- Database: Neon Postgres (prod), Docker Postgres (local). `push: false` — always use migrations.

### Operating Principles
- Analyze existing patterns, naming, directory structure BEFORE writing code.
- If information is missing, **STOP and ask**. Do not guess.
- Maximize code reuse. Never duplicate existing hooks, access modules, utilities.
- Holistic implementation: update all layers (IaC, backend, frontend, validation).
- Local environments must mirror cloud (docker-compose for any new cloud component).

### Token Conservation
- Targeted reads only — use glob patterns, never full-repo scans.
- Minimal diffs — never rewrite entire files.
- Stop after 3 failed fix attempts and report to engineer.
- Responses under 400 words unless explanation explicitly requested.

### Never Do
- Never set `push: true` on DB adapters.
- Never persist signed GCS URLs. Store unsigned paths, sign at read-time via `signCloudUrls`.
- Never hardcode storage paths. Use `buildStoragePath` from `src/lib/storage-paths.ts`.
- Never inline access control. Import from `src/access/`.
- Never use `GCP_PROJECT_ID`. Use `GCS_PROJECT_ID`.
- Never add AI attribution to git commits.

### Always Do
- Media fallback chain: `thumbnailUrl || proxyUrl || originalUrl || url`.
- Pair SSE with 3-second polling backstop for upload progress.
- `pnpm payload migrate:create` + `pnpm generate:types` after schema changes.
- `scripts/verify-local.sh` before PRs.
- `IS_BUILD_PHASE=true pnpm build` when no live DB.

### Free-Tier Constraints (HARD LIMIT — NO EXCEPTIONS)
- Cloud Run: `--min-instances=0`, `--max-instances` ≤ 4, `--memory=512Mi`, `--cpu=1`.
- ALL resources pinned to `us-central1`.
- GCS CORS: explicit origins only (never `*`).
- Every architectural choice MUST stay within GCP free-tier and Neon serverless limits.

## Documentation Map
- Architecture: `docs/architecture/README.md`
- Backend/API: `docs/backend/README.md`
- Frontend: `docs/frontend/README.md`
- DevOps: `docs/devops/README.md`
- Feature specs + SDD protocol: `docs/features/README.md`
- Design system: `DESIGN.md`
