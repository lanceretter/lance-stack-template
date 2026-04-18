# docs-scaffold

A drop-in documentation system for projects worked on with Claude Code,
Cursor, OpenClaw, or any AI agent.

Adapted from Garry Tan's gbrain pattern (`skills/RESOLVER.md` — thin router,
fat focused files, self-maintaining) and applied to team project docs instead
of personal memory.

**What you get (v1.1.0):**

Three doc surfaces, all gated:

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

**Why it stops rotting:** six reinforcing layers. A PR can skip one, not all.

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

Current: **v1.1.0** (2026-04-18 — conquest-lpr hierarchical rollout).

History:
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
