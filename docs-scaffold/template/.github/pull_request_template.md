<!--
Thanks for contributing. Check the boxes that apply and update the matching
doc in this same PR. doc-check CI will fail if dependent_paths in a doc
reference files you moved or deleted without updating the doc.

Customize this template: replace the "Scope touched" rows below with rows
matching YOUR project's docs/agent/ structure (see AGENTS.md router table).
-->

## Summary

<1-3 bullets explaining what this PR does and why>

## Scope touched

Check what this PR touches. For each box checked, update the matching doc
in the same PR (see `AGENTS.md` router table).

<!-- CUSTOMIZE: these rows should mirror your AGENTS.md router table -->
- [ ] Schema or migrations → updated `docs/agent/database.md`
- [ ] API routes → updated `docs/agent/api.md` (or similar)
- [ ] Frontend pages → updated `docs/agent/frontend.md` (or similar)
- [ ] Auth flow → updated `docs/agent/architecture.md`
- [ ] Deploy / CI / env vars → updated `docs/agent/deployment.md`
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
