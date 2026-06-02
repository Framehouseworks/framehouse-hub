# Workflows

Team workflow overview for Framehouse Hub engineers.

## Branch Strategy

Three long-lived branches with a strict merge order:

```
feature/FRH-XX  →  dev  →  main
```

- **Feature branches** are cut from `dev`. Named `FRH-{ticket}-{short-description}` (e.g. `FRH-58-Portfolio-Creation-Wizard`).
- **`dev`** is the integration branch. All feature PRs target `dev`.
- **`main`** is the production branch. Only accepts PRs from `dev`. A `guardrail` CI job enforces this — PRs from any other source branch are rejected.

See [git-workflow.md](git-workflow.md) for the complete guide.

## PR Lifecycle

```
open PR  →  CI checks  →  peer review  →  merge
```

1. **Open PR** — use the PR template (`.github/pull_request_template.md`). Target `dev` for feature work.
2. **CI checks** — `pr-validation.yml` runs lint, build, migration drift check, integration tests, and E2E tests.
3. **Peer review** — at least one approval required. Reviewer checks correctness, test coverage, and adherence to design/arch conventions.
4. **Merge** — squash or merge commit into `dev`. When `dev` is ready for release, open a `dev → main` PR.

## Code Quality Tools

| Tool | Trigger | What it does |
|------|---------|--------------|
| **Prettier** | pre-commit (lint-staged) | Auto-formats staged JS/TS/JSON/MD/YML (100-col, single quotes, no semicolons, trailing commas) |
| **ESLint** | pre-commit (lint-staged) | Auto-fixes staged files via `next lint` (jsx-a11y, react, react-hooks) |
| **TypeScript** | CI build | Strict mode — no implicit any, no unchecked errors |
| **verify-local.sh** | pre-push | Spins ephemeral Postgres, migrates, seeds, tears down — full blank-slate check |
| **pnpm build** | pre-push | Production build with `IS_BUILD_PHASE=true` (no live DB needed) |

Pre-commit hooks auto-fix issues — you rarely need to run Prettier or ESLint manually. Pre-push hooks must pass before a push is accepted.

## Jira / Ticket Integration

Branch names embed the Jira ticket number:

```
FRH-{ticket-number}-{short-description}
```

Commit messages mirror this:

```
FRH-{ticket-number}: {description of what was done}
```

Examples:
- Branch: `FRH-63-admin-diagnostics`
- Commit: `FRH-63: added admin diagnostics`

This links commits and PRs back to Jira automatically when the project integration is configured.

## Further Reading

- [git-workflow.md](git-workflow.md) — complete git workflow, branch commands, hotfix process
- [testing.md](testing.md) — integration tests, E2E tests, CI test behavior
