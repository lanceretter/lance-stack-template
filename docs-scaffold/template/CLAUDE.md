# Claude Code Project Rules

> This file exists so Claude Code (and similar agent tools) see the project's
> agent-workflow expectations on every session start. Short on purpose —
> almost all operational docs live in [`AGENTS.md`](AGENTS.md),
> [`apps/*/AGENTS.md`](apps/), and [`docs/agent/*`](docs/agent/).

## Required reading order

1. [`AGENTS.md`](AGENTS.md) — router, 1 min
2. If your task touches one specific app: [`apps/<app>/AGENTS.md`](apps/) —
   the canonical doc for that app (workflows, conventions, gotchas scoped
   to the app)
3. If your task is cross-cutting or architectural: the matching
   [`docs/agent/*.md`](docs/agent/)
4. [`docs/agent/gotchas.md`](docs/agent/gotchas.md) — project-wide foot-guns, 2 min

## Non-negotiable rules

- **Update docs in the same PR.** Any edit to code listed in a doc's
  `dependent_paths` front-matter MUST include a matching update to that doc
  AND a bump of `last_verified` to today. Applies to BOTH `apps/*/AGENTS.md`
  (app-canonical) AND `docs/agent/*.md` (cross-cutting). CI enforces via
  `scripts/doc-check.ts --pr-base=<sha>` — broken paths, missing docs,
  orphan app docs, and missed `last_verified` bumps all fail the PR. See
  the [PR template](.github/pull_request_template.md).
- **App-scope rule.** An `apps/<app>/AGENTS.md` may only claim
  `dependent_paths` inside its own directory (or `packages/`). Don't claim
  another app's code — add a cross-reference link instead.
- **Add a `## Timeline` entry when you ship.** Every canonical doc has its
  own timeline. Append one bullet per merged behavior/data change, with
  date and PR number. Also add to `docs/agent/_TIMELINE.md`.
- **Add new gotchas to `gotchas.md` when you discover them.** If you spent
  more than 15 minutes on a bug caused by a project-specific convention, it
  belongs there.
- **Never commit plaintext credentials.** Use the project's secrets
  management (see `docs/agent/` for details).
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
# Local: router + paths + front-matter + scope (what pre-commit could run)
bun run scripts/doc-check.ts

# PR CI: adds last_verified-bump enforcement against the base branch
bun run scripts/doc-check.ts --pr-base=origin/main

# Weekly drift scan (noisy — what the staleness cron runs)
bun run scripts/doc-check.ts --drift
```
