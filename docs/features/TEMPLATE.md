# Specification: [Feature / Ticket Name]

> **IMPLEMENTATION STATUS:** [SPECCED — NOT STARTED | PARTIALLY IMPLEMENTED | IMPLEMENTED]

**Spec Version:** 1.0
**Branch Convention:** `FRH-{ticket}-{Short-Description}`
**Base Branch:** `dev`
**Date:** YYYY-MM-DD

---

## 1. Core Objective & Scope
- **Objective:** [2-3 sentences defining the goal]
- **Ticket Reference:** [Ticket ID/Name]
- **In-Scope Files/Modules:** [Explicit list of file patterns the agent is permitted to touch]
- **Explicit Non-Goals:** [What NOT to build or refactor]

## 2. Platform & Free-Tier Impact Check

| Area | Impact | Details |
|------|--------|---------|
| **Payload Schema** | Yes / No | [Schema changes in `src/collections/` or `src/globals/`] |
| **Route Groups** | Yes / No | [Changes in `(app)`, `(dashboard)`, `(portfolio)`, `(payload)`, `(coming-soon)`] |
| **Migrations** | Yes / No | [New migration required? GIN index update?] |
| **Worker / GCP** | Yes / No | [Go worker or Cloud Run changes; verify `us-central1` and `--memory=512Mi`] |
| **Access Control** | Yes / No | [New or modified access modules in `src/access/`] |
| **Storage Paths** | Yes / No | [New path segments via `buildStoragePath`?] |
| **Free-Tier Risk** | Yes / No | [Could this breach Cloud Run / GCS / Neon free-tier limits?] |

## 3. User Flows & Acceptance Criteria
- [ ] **AC-1:** Given [state/role], When [action], Then [expected result].
- [ ] **AC-2:** ...
- [ ] **AC-3:** ...

## 4. Adversarial Review & Self-Correction Log
*(Agent MUST populate this section with ≥ 5 issues found during codebase cross-examination)*

| # | Category | Issue Found | Remediation |
|---|----------|-------------|-------------|
| 1 | [Edge Case / Migration / Path / Free-Tier / UI] | [Description] | [How spec was adjusted] |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

## 5. Phased Implementation Plan
*(Each phase must be independently runnable, reviewable, and manually testable)*

### Phase 1: Database / Schema Layer
- **Target Files:** `src/collections/...`, `src/migrations/...`
- **Agent Tasks:**
  1. ...
- **Manual Infrastructure / Setup Steps:** [Any out-of-agent tasks, e.g., secret creation, gcloud rules, or `None`]
- **Verification Steps:**
  1. Run `pnpm payload migrate:create` and `pnpm generate:types`.
  2. Run `scripts/verify-local.sh` to confirm zero schema drift.
  3. Confirm `pnpm build` passes with `IS_BUILD_PHASE=true`.

### Phase 2: API & Service Layer
- **Target Files:** `src/app/api/...`, `scripts/worker/...`
- **Agent Tasks:**
  1. ...
- **Manual Infrastructure / Setup Steps:** [e.g., `None`]
- **Verification Steps:**
  1. ...

### Phase 3: UI & Frontend Integration Layer
- **Target Files:** `src/app/(dashboard)/...`, `src/components/...`
- **Agent Tasks:**
  1. ...
- **Manual Infrastructure / Setup Steps:** [e.g., `None`]
- **Verification Steps:**
  1. ...

---

## 6. Rollback Plan
- [How to revert if this feature causes issues in production]
- [Migration rollback strategy if applicable]