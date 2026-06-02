# Git Workflow

Complete guide for branching, committing, and getting code into production.

## Branch Naming Convention

```
FRH-{ticket-number}-{short-description}
```

- Use the Jira ticket number verbatim.
- Short description: lowercase, hyphen-separated, max ~5 words.
- Examples: `FRH-58-Portfolio-Creation-Wizard`, `FRH-63-admin-diagnostics`

## Branch Strategy

```mermaid
gitGraph
   commit id: "initial"
   branch dev
   checkout dev
   commit id: "dev baseline"
   branch FRH-58-Portfolio-Creation-Wizard
   checkout FRH-58-Portfolio-Creation-Wizard
   commit id: "FRH-58: scaffold wizard"
   commit id: "FRH-58: add step validation"
   checkout dev
   merge FRH-58-Portfolio-Creation-Wizard id: "merge feature → dev"
   branch FRH-63-admin-diagnostics
   checkout FRH-63-admin-diagnostics
   commit id: "FRH-63: added admin diagnostics"
   checkout dev
   merge FRH-63-admin-diagnostics id: "merge feature → dev"
   checkout main
   merge dev id: "release: dev → main"
```

**Guardrail rule:** `main` only accepts PRs from `dev`. The `guardrail` job in `pr-validation.yml` rejects any PR targeting `main` from a branch other than `dev`. Do not open feature PRs directly against `main`.

## Starting a New Feature

Always branch from the latest `dev`:

```bash
git checkout dev
git pull origin dev
git checkout -b FRH-{ticket}-{short-description}
```

## Commit Message Format

```
FRH-{ticket-number}: {past-tense description of what was done}
```

Examples:
```
FRH-58: added portfolio creation wizard scaffold
FRH-63: added admin diagnostics
FRH-62: Download Workspace added
```

Keep the first line under 72 characters. Add a blank line + body for context if needed.

## Pre-Commit Hook (lint-staged)

On every `git commit`, lint-staged runs automatically on staged files:

| File type | Action |
|-----------|--------|
| `*.js`, `*.ts`, `*.jsx`, `*.tsx` | `eslint --fix` then `prettier --write` |
| `*.json`, `*.md`, `*.yml` | `prettier --write` |

**You do not need to run these manually.** If lint-staged rewrites a file, stage the changes and commit again. The hook will not produce errors for auto-fixable issues — only unfixable ESLint errors will block a commit.

## Pre-Push Hook (verify-local.sh + lint + build)

On every `git push`, Husky runs three checks in order:

1. **`./scripts/verify-local.sh`** — spins an ephemeral Postgres on port 5433, applies all migrations, runs the seed, then tears down. This is a full blank-slate verification. Takes ~60–90 seconds.
2. **`pnpm lint`** — full ESLint pass across the project (not just staged files).
3. **`IS_BUILD_PHASE=true pnpm build`** — production build. The `IS_BUILD_PHASE` flag lets the build skip the live DB requirement.

All three must pass. If any fails, the push is aborted.

### If the pre-push hook fails

**`verify-local.sh` fails:**
- A migration is missing or broken — run `pnpm payload migrate:create` and commit the result.
- The seed is broken — check `src/seed/index.ts` for the new collection/field.
- Postgres won't start — ensure Docker is running.

**Lint fails:**
- Run `pnpm lint` locally and fix the reported errors (auto-fixable issues would have been caught by pre-commit).

**Build fails:**
- Run `IS_BUILD_PHASE=true pnpm build` locally to reproduce.
- Most common cause: TypeScript errors in a new file, or a missing import.

To run `verify-local.sh` manually without a push:

```bash
./scripts/verify-local.sh              # ephemeral, tears down after
./scripts/verify-local.sh --keep-open  # keeps DB running, prints DATABASE_URI
./scripts/cleanup-local.sh             # tears down a --keep-open run
```

## Creating a Pull Request

1. Push your branch: `git push -u origin FRH-{ticket}-{short-description}`
2. Open a PR on GitHub targeting **`dev`** (not `main`).
3. Fill in the PR template (`.github/pull_request_template.md`). Include:
   - Jira ticket link
   - Summary of changes
   - Testing done
   - Screenshots if UI changed
4. CI (`pr-validation.yml`) will run automatically. Required checks:
   - `lint` — ESLint passes
   - `build` — production build passes
   - `migration-drift` — no uncommitted schema changes
   - `test:int` — integration tests pass
   - `test:e2e` — Playwright E2E tests pass (with `DISABLE_WORKER=1`)
   - `guardrail` — source branch is `dev` (only relevant for PRs to `main`)
5. Request review from at least one team member.

## PR Review Process

- Reviewer checks: correctness, edge cases, access control, test coverage, design token compliance, no inline access logic.
- Author responds to comments, pushes fixes (new commits — do not force-push during review).
- Once approved and CI is green, merge.

## Merge Strategy

- **Feature → dev**: squash merge or regular merge — team preference. Keep history readable.
- **dev → main**: regular merge commit to preserve the full dev history in main.

Do not force-push `dev` or `main`.

## dev → main Release

When `dev` is stable and ready for production:

```bash
# Ensure dev is up to date and CI is green
git checkout dev
git pull origin dev

# Open PR on GitHub: dev → main
# The guardrail job verifies source is dev — this will pass
# Get approval, then merge
```

## Hotfix Process

For urgent production fixes that cannot wait for the next `dev → main` cycle:

1. Branch from `main`: `git checkout main && git checkout -b FRH-{ticket}-hotfix-{description}`
2. Make the fix, commit, push, open PR targeting `main`.
3. **The guardrail will block this.** Coordinate with the team lead to temporarily bypass or use the emergency override process (documented in the CI pipeline guide).
4. After merging to `main`, immediately back-merge into `dev`: `git checkout dev && git merge main`.

> Hotfixes are rare. Prefer the normal flow unless there is a live production incident.
