# PROJECT_NAME — AI Agent Router

<!-- Replace this tagline with a 1-sentence description of what this project is -->
PROJECT_NAME is an application that does WHAT for WHOM.
Deployed at **https://example.com**.

**This file is a router.** Canonical per-app details live in
`apps/<app>/AGENTS.md` (where agents end up when they `cd` into an app).
Cross-cutting concerns live in `docs/agent/*.md`. Every doc carries a
`last_verified` date and a `dependent_paths` list in front-matter — if you
touch a listed path, you MUST update the matching doc in the same PR. CI
gate: `scripts/doc-check.ts`.

## If you're touching ...

### Per-app (canonical docs live *in* the app)

<!--
CUSTOMIZE: remove the example rows, keep one row per app/package in your
repo. Every app/package with its own AGENTS.md MUST be listed here —
doc-check enforces this (orphan check).
-->

| App / path | Canonical doc |
|---|---|
| `apps/api/` (backend API) | [`apps/api/AGENTS.md`](apps/api/AGENTS.md) |
| `apps/web/` (frontend) | [`apps/web/AGENTS.md`](apps/web/AGENTS.md) |
| `packages/shared/` (shared library) | [`packages/shared/AGENTS.md`](packages/shared/AGENTS.md) |

### Cross-cutting (spans multiple apps)

| Topic | Doc |
|---|---|
| Monorepo layout, tech stack, architectural decisions | [`docs/agent/architecture.md`](docs/agent/architecture.md) |
| Schema source of truth, migrations | [`docs/agent/database.md`](docs/agent/database.md) |
| Deploy, CI, env vars | [`docs/agent/deployment.md`](docs/agent/deployment.md) |

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

- `scripts/doc-check.ts` runs on every PR (and push to `main`) via GitHub
  Actions. It fails CI if:
  - Any `dependent_paths` entry (in any doc) no longer exists.
  - An `apps/*/AGENTS.md` or `packages/*/AGENTS.md` is missing front-matter
    or claims `dependent_paths` outside its own directory.
  - An app-local AGENTS.md exists but isn't linked from this router.
  - Router links to a missing `docs/agent/<name>.md`.
  - **PR only:** covered code changed without `last_verified` being bumped
    to today.
- Weekly cron (Mon 14:00 UTC) opens per-doc tracking issues for stale /
  ageing / drifted docs.
- To add a new focused doc:
  - Cross-cutting → create `docs/agent/<topic>.md` + row in the cross-cutting
    table above.
  - Per-app → create `apps/<name>/AGENTS.md` (or `packages/<name>/AGENTS.md`)
    with front-matter + row in the per-app table above.
  - Add a checkbox to `.github/pull_request_template.md`.
- See [`CLAUDE.md`](CLAUDE.md) for non-negotiable rules.
- Installed via [lance-stack-template/docs-scaffold](https://github.com/lanceretter/lance-stack-template/tree/main/docs-scaffold)
  — see `.docs-scaffold-version` for installed version.
