<!--
Thanks for contributing. Check the boxes that apply and update the matching
doc in this same PR. doc-check CI will fail if:
  - Any dependent_paths reference a file you moved or deleted without
    updating the doc.
  - You touched code covered by a doc's dependent_paths without bumping
    that doc's `last_verified` to today.

Customize this template: replace the per-app rows below with rows matching
YOUR project's docs/agent/ + apps/*/AGENTS.md structure.
-->

## Summary

<1-3 bullets explaining what this PR does and why>

## Scope touched

Check what this PR touches. For each box checked, update the matching doc
in the same PR and bump its `last_verified` to today.

### Per-app

<!-- CUSTOMIZE: one row per app / package with its own AGENTS.md -->
- [ ] `apps/api/` → updated `apps/api/AGENTS.md`
- [ ] `apps/web/` → updated `apps/web/AGENTS.md`
- [ ] `packages/shared/` → updated `packages/shared/AGENTS.md`

### Cross-cutting

- [ ] Schema or migrations → updated `docs/agent/database.md`
- [ ] Deploy / CI / env vars → updated `docs/agent/deployment.md`
- [ ] Architecture-wide change → updated `docs/agent/architecture.md`
- [ ] New foot-gun discovered → added to `docs/agent/gotchas.md`
- [ ] Added an entry to `docs/agent/_TIMELINE.md`
- [ ] None of the above (infra/tests/refactor only)

## Test plan

- [ ] Typecheck passes (project-specific command)
- [ ] Tests pass (project-specific command)
- [ ] `bun run scripts/doc-check.ts` passes (runs in CI automatically)
- [ ] Manual verification steps (list them):

## Breaking changes

<None / or describe migration path>
