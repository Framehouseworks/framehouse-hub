## What & Why

**Ticket:** [FRH-XX](https://linear.app/framehouse/issue/FRH-XX)
**Target:** `dev` ← feature branch _(never `main` directly — see [branch rules](../docs/workflows/git-workflow.md))_

> One paragraph: what changed and why. Link the ticket for full context.

## Type of Change

- [ ] Feature
- [ ] Bug fix
- [ ] Schema change (migration required)
- [ ] DevOps / infrastructure
- [ ] Refactor / cleanup
- [ ] Docs only

## Author Checklist

**CI runs automatically** — pre-push hook already ran `verify-local.sh` + lint + build. These are the things CI cannot check for you:

- [ ] Acceptance criteria in the ticket are met
- [ ] Tested locally (happy path + at least one edge case)
- [ ] Responsive behaviour verified if UI changed
- [ ] No `console.log` / debug code left in
- [ ] No hardcoded secrets or environment values

**Schema changes** _(skip if no Payload config changed)_
- [ ] `pnpm payload migrate:create` run — both `.ts` + `.json` migration files committed
- [ ] `pnpm generate:types` run — `src/payload-types.ts` updated and committed
- [ ] `pnpm generate:importmap` run if new admin components added
- [ ] `src/seed/index.ts` updated if new collections or required fields added

**Media / storage changes** _(skip if not touching the Media collection or ingestion pipeline)_
- [ ] `buildStoragePath` used — no hand-constructed paths
- [ ] Unsigned URLs stored in DB — no signed URLs persisted
- [ ] New searchable fields added to both the GIN index migration **and** `/api/media/search`

**Design** _(skip if no UI changes)_
- [ ] No 1px borders (tonal layering only — see [design system](../docs/frontend/design-system.md))
- [ ] `ROUND_SIXTEEN`+ radii on all cards/containers
- [ ] Dark mode verified

## What to Review

> Point reviewers at the most important or risky parts. Replace this with 2–4 bullets.

- `src/path/to/key-file.ts` — [why this is the crux of the change]
- `src/migrations/YYYYMMDD_*.ts` — [what schema change this makes and why it's safe]

## Visuals

> Screenshots, Loom link, or logs. Delete section if not applicable.

---

**CI checks on this PR:** guardrail · lint · build · generate:types drift · generate:importmap drift · integration tests · E2E tests
