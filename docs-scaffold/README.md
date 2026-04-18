# docs-scaffold

A drop-in documentation system for projects worked on with Claude Code,
Cursor, OpenClaw, or any AI agent.

Adapted from Garry Tan's gbrain pattern (`skills/RESOLVER.md` — thin router,
fat focused files, self-maintaining) and applied to team project docs instead
of personal memory.

**What you get:**

- `AGENTS.md` router + focused `docs/agent/*.md` per topic (architecture,
  database, deployment, whatever applies to your project)
- Front-matter on every doc with `last_verified` date and `dependent_paths`
  list — the paths the doc is responsible for
- `scripts/doc-check.ts` — CI-enforced coherence gate that fails PRs when
  docs reference paths that no longer exist
- Weekly GitHub Actions cron that opens a tracking issue when docs drift
  (code modified more recently than `last_verified` OR new exported symbols
  not mentioned in the doc)
- `CLAUDE.md` with explicit non-negotiable rules for agents
- PR template that ties scope changes to doc updates

**Why it stops rotting:** four reinforcing layers. A PR can skip one, not all.

1. **CI gate** — `doc-check.ts` fails the PR if paths break.
2. **PR template** — checklist nudges human or agent to update docs.
3. **Weekly cron** — opens a tracking issue for aging/drifted docs.
4. **CLAUDE.md rule** — agents read it at session start; enforces "update
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

Current: **v1.0.0** (2026-04-18 — conquest-hub ship).

Bump when: breaking changes to `doc-check.ts` CLI or to the front-matter
format. Consumers running older versions see a migration note in
[`UPDATE.md`](./UPDATE.md).

## Credits

- Pattern from [`garrytan/gbrain`](https://github.com/garrytan/gbrain) —
  specifically `skills/RESOLVER.md` structure + compiled-truth-plus-timeline
  page format.
- Extracted from `conquest-solutions/conquest-hub` PRs #8 and #9 where the
  system was first built and proven.
