# docs-scaffold

A drop-in documentation system for projects worked on with Claude Code,
Cursor, OpenClaw, or any AI agent.

Adapted from Garry Tan's gbrain pattern (`skills/RESOLVER.md` — thin router,
fat focused files, self-maintaining) and applied to team project docs instead
of personal memory.

**What you get (v1.3.1):**

Three doc surfaces, all gated, plus an AI auto-maintainer:

- **Root router** — `AGENTS.md` at repo root. Thin file pointing everywhere.
- **Cross-cutting docs** — `docs/agent/*.md` for topics spanning multiple
  apps (architecture, database, deployment, gotchas, _TIMELINE).
- **Per-app canonical docs** — `apps/<app>/AGENTS.md` and
  `packages/<pkg>/AGENTS.md`. Each is scoped to its own app/package code
  (front-matter `dependent_paths` must stay within that directory, or
  `packages/`). This is what Cursor/Codex/Claude find when agents `cd`
  into a subdirectory.

Every doc carries front-matter:

```yaml
---
owner: lance
last_verified: 2026-04-18
dependent_paths:
  - src/services/payment.ts
  - src/db/schema/billing.ts
---
```

Enforced signals (`scripts/doc-check.ts`):

- Broken `dependent_paths` → **error**.
- Missing front-matter → **error**.
- App-local doc claiming deps outside its scope → **error**.
- App-local doc not linked from root router (orphan) → **error**.
- Router link to missing cross-cutting doc → **error**.
- Broken `[text](path.md)` markdown link → **warn**.
- `README.md` > 80 lines alongside `AGENTS.md` → **warn** (soft policy).
- **PR-only:** covered code changed without `last_verified` being bumped
  to today → **error**. (The single biggest accuracy gate.)

Weekly cron (`doc-staleness.yml`):

- **Staleness:** code in `dependent_paths` modified more recently than
  `last_verified` → one GH issue per doc.
- **Ageing:** `last_verified` older than 90 days → one GH issue per doc.
- **Drift:** exported symbols in `dependent_paths` source files not
  mentioned in the doc → one combined dashboard issue.

**Why it stops rotting:** seven reinforcing layers. A PR can skip one, not all.

1. **Per-PR coherence gate** — `doc-check.ts` fails the PR if paths break
   or app docs drift out of scope.
2. **Per-PR last_verified gate** — changing covered code without
   re-verifying the doc fails CI.
3. **Push-to-main static gate** — direct commits to `main` still get
   coherence checks (no last_verified enforcement there).
4. **PR template** — checklist nudges human or agent to update docs.
5. **Weekly cron** — per-doc tracking issues for drifted/ageing docs.
6. **CLAUDE.md rule** — agents read it at session start; enforces "update
   docs in the same PR" as a non-negotiable.
7. **Post-merge auto-update (v1.2.0)** — on every merged PR,
   `doc-auto-update.yml` runs Claude Code headless with the PR diff
   and has it prepend a Timeline entry, bump `last_verified` on any
   affected doc, and add a Recent Updates row to README if user-visible
   behavior shipped. Scoped to doc files only (tool allowlist prevents
   source code edits). Requires `ANTHROPIC_API_KEY` GH secret + PR
   label `skip-docs` opt-out.

## Quick install

From your project root:

```bash
curl -fsSL https://raw.githubusercontent.com/lanceretter/lance-stack-template/main/docs-scaffold/install.sh | bash
```

Or manual install from this repo:

```bash
cd /path/to/your/repo
cp -r /path/to/lance-stack-template/docs-scaffold/template/. .
```

Then follow [`INSTALL.md`](./INSTALL.md) — takes about 15 min to customize
for your project.

## What's here

| File | Purpose |
|---|---|
| [`README.md`](./README.md) | This file — what the system is and why |
| [`INSTALL.md`](./INSTALL.md) | Step-by-step install + customize |
| [`CONVENTIONS.md`](./CONVENTIONS.md) | Front-matter format, Workflow sections, Timeline pattern |
| [`UPDATE.md`](./UPDATE.md) | How to pull updates to `doc-check.ts` / workflows into existing installs |
| [`install.sh`](./install.sh) | One-liner installer (clones or curls this repo, copies files in) |
| [`INSTALLS.md`](./INSTALLS.md) | Registry of known consumer repos — update when installing into a new repo |
| [`template/`](./template/) | The actual files to drop into your repo |
| [`examples/`](./examples/) | Real-world usage from `conquest-hub` |

## Philosophy

> "AGENTS.md gets too big and we lose things."

That's the problem this scaffold solves. One giant AGENTS.md accumulates
until nobody reads it all, stale facts pile up, and agents waste tokens on
irrelevant content.

Fix: split into focused docs, each under 200 lines, loaded by an agent only
when relevant. Add machinery that makes updates mechanical instead of
voluntary.

Written for teams of 1-5 devs building on top of Claude Code + GitHub. Scales
up to 20 devs before the assumptions start to creak.

## Version

Current: **v1.3.1** (2026-04-19 — actions/checkout@v5 + setup-node@v5).

History:
- **v1.3.1** (2026-04-19) — bump `actions/checkout@v4→v5` and
  `actions/setup-node@v4→v5` to silence Node 20 deprecation warnings.
  No migration; auto-update handles it.
- **v1.3.0** (2026-04-19) — self-updating via weekly cron
  (`docs-scaffold-update.yml`). Each consumer repo runs the workflow
  weekly, compares its `.docs-scaffold-version` against upstream, and
  opens a PR if a new release is available. Uses `GITHUB_TOKEN` — no
  PAT or secret required for the default path. Also fixes a v1.2.0
  oversight: `install.sh` now copies `doc-auto-update.yml`, and
  `update.sh` now updates it. New: upstream `INSTALLS.md` registry
  tracks which consumer repos have the scaffold installed.
- **v1.2.0** (2026-04-19) — post-merge AI auto-documentation workflow
  (`doc-auto-update.yml`). Runs Claude Code headless after every PR
  merge, has it prepend Timeline entries, bump `last_verified` on
  affected docs, and surface user-visible changes in README.
  Tool allowlist restricts to doc files only — cannot modify source.
  `ANTHROPIC_API_KEY` GH secret required. `skip-docs` PR label or
  `[skip docs]` in PR title opts out. Backwards compatible; workflow
  is additive. Proven out in `conquest-hub` (initial rollout).
- **v1.1.0** (2026-04-18) — per-app AGENTS.md scope + orphan check,
  `last_verified` bump enforcement on PRs, markdown link integrity,
  README policy lint, push-to-main trigger, per-doc tracking issues,
  absolute-age (90d) signal. Backwards-compatible with v1.0.0 consumers.
- **v1.0.0** (2026-04-18) — initial release from conquest-hub PRs #8/#9.

Bump when: breaking changes to `doc-check.ts` CLI or to the front-matter
format. Consumers running older versions see a migration note in
[`UPDATE.md`](./UPDATE.md).

## Credits

- Pattern from [`garrytan/gbrain`](https://github.com/garrytan/gbrain) —
  specifically `skills/RESOLVER.md` structure + compiled-truth-plus-timeline
  page format.
- Extracted from `conquest-solutions/conquest-hub` PRs #8 and #9 where the
  system was first built and proven.
