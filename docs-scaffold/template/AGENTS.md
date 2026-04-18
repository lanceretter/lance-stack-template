# PROJECT_NAME — AI Agent Router

<!-- Replace this tagline with a 1-sentence description of what this project is -->
PROJECT_NAME is an application that does WHAT for WHOM.
Deployed at **https://example.com**.

**This file is a router.** Full details live in `docs/agent/*.md`. Read the
focused doc before editing. Every doc carries a `last_verified` date and a
`dependent_paths` list in front-matter — if you touch a listed path, you
MUST update the matching doc in the same PR (enforced by
`scripts/doc-check.ts` in CI).

## If you're touching ...

<!--
CUSTOMIZE this table for your project. Every row pairs a code location with
the doc that describes it. doc-check.ts verifies every linked doc exists.
-->

| This area | Read this doc |
|---|---|
| `src/db/` or `schema/` | [`docs/agent/database.md`](docs/agent/database.md) |
| `migrations/` | [`docs/agent/database.md`](docs/agent/database.md) |
| `src/routes/` or API handlers | [`docs/agent/api.md`](docs/agent/api.md) |
| Frontend pages | [`docs/agent/frontend.md`](docs/agent/frontend.md) |
| `src/middleware/auth.ts` or auth flow | [`docs/agent/architecture.md`](docs/agent/architecture.md) |
| Environment variables | [`docs/agent/deployment.md`](docs/agent/deployment.md) |
| Deploying | [`docs/agent/deployment.md`](docs/agent/deployment.md) |

## Before you start

Skim [`docs/agent/gotchas.md`](docs/agent/gotchas.md) once per session —
project-specific foot-guns most likely to bite.

## Project-wide shipping history

See [`docs/agent/_TIMELINE.md`](docs/agent/_TIMELINE.md).
Each focused doc also carries its own `## Timeline` section at the bottom.

## Canonical references (outside `docs/agent/`)

<!-- Link your stakeholder-facing docs here -->
- [`README.md`](README.md) — project overview

## Doc health

- `doc-check.ts` runs on every PR via GitHub Actions. It fails CI if any
  `dependent_paths` entry no longer exists or if a router target is missing.
- Weekly cron surfaces docs that may be stale (code in `dependent_paths`
  modified more recently than `last_verified`, or exported symbols not
  mentioned in prose).
- To add a new focused doc: create `docs/agent/<topic>.md` with front-matter,
  add a row to the router table above.
- See [`CLAUDE.md`](CLAUDE.md) for non-negotiable rules.
- Installed via [lance-stack-template/docs-scaffold](https://github.com/lanceretter/lance-stack-template/tree/main/docs-scaffold)
  — see `.docs-scaffold-version` for installed version.
