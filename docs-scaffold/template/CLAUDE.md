# Claude Code Project Rules

> This file exists so Claude Code (and similar agent tools) see the project's
> agent-workflow expectations on every session start. Short on purpose —
> almost all operational docs live in [`AGENTS.md`](AGENTS.md) and
> [`docs/agent/*`](docs/agent/).

## Required reading order

1. [`AGENTS.md`](AGENTS.md) — router, 1 min
2. The specific `docs/agent/*.md` matching your task (see AGENTS.md table)
3. [`docs/agent/gotchas.md`](docs/agent/gotchas.md) — project-specific foot-guns, 2 min

## Non-negotiable rules

- **Update docs in the same PR.** Any edit to code listed in a doc's
  `dependent_paths` front-matter MUST include a matching update to that doc.
  CI enforces this via `scripts/doc-check.ts` — broken paths and missing docs
  fail the PR. See the [PR template](.github/pull_request_template.md).
- **Add a `## Timeline` entry when you ship.** Every `docs/agent/*.md` has
  its own timeline. Append one bullet per merged behavior/data change, with
  date and PR number.
- **Add new gotchas to `gotchas.md` when you discover them.** If you spent
  more than 15 minutes on a bug caused by a project-specific convention, it
  belongs there.
- **Never commit plaintext credentials.** Use the project's encryption /
  secrets management (see `docs/agent/` for details).
- **Never skip hooks or checks with `--no-verify`.** If a hook fails,
  investigate. The hook exists because something broke before.

## Test expectations

- Any new function with a clear input/output boundary gets a unit test
  alongside it (`foo.ts` → `foo.test.ts`).
- Any new conditional branch gets a test covering BOTH paths.
- Any new error handler gets a test that triggers it.
- Typecheck must pass on every PR.
- Tests must pass on every PR.

## Verification standard

Claims of completion require evidence.
- "The feature works" → name the command you ran and the output you saw.
- "Tests pass" → paste the count.
- "Docs are updated" → list the files.
- "Deploy was verified" → show the URL + status code or query result.

Rationalization is not evidence. "Should work" / "probably fine" / "I'm
confident" — run it.

## Doc-check commands

```bash
# Per-PR gate (fast, what CI runs)
bun run scripts/doc-check.ts

# Weekly drift scan (noisy, what the staleness cron runs)
bun run scripts/doc-check.ts --drift
```
