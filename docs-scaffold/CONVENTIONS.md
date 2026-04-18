# Conventions

The file-level conventions docs-scaffold enforces. Adopted from gbrain's
"compiled truth + timeline" format, simplified for project code docs.

## Front-matter

Every `docs/agent/*.md` starts with YAML front-matter between `---` markers:

```yaml
---
owner: lance
last_verified: 2026-04-18
dependent_paths:
  - src/services/payment.ts
  - src/db/schema/billing.ts
  - migrations/0012-add-subscription-table.sql
---
```

### Fields

| Field | Required? | Format | Purpose |
|---|---|---|---|
| `owner` | Yes | string | GitHub username or team name. Not enforced, just useful for "who do I ask about this doc." |
| `last_verified` | Yes | YYYY-MM-DD | Most recent date a human read the doc end-to-end against the current code and confirmed accuracy. |
| `dependent_paths` | Yes (except rollup docs) | list of strings | Paths the doc is responsible for. Can be files OR directories. Must exist on disk — `doc-check.ts` fails CI if not. |

### `dependent_paths` details

- Paths are repo-relative (no leading `./`)
- Directories match recursively — `src/lib/transform/` covers every file under it
- Files and directories both supported
- Used for three things:
  1. **Existence check**: if a path is missing, CI fails.
  2. **Staleness signal**: weekly cron compares git mtime of these paths to `last_verified` and flags drift.
  3. **Symbol drift**: for `.ts` files, the drift scan extracts exported symbols and warns when they're not mentioned in the doc.

### Rollup docs exempt from `dependent_paths`

Files starting with `_` (like `_TIMELINE.md`, `_GLOSSARY.md`) are roll-ups
with no single code dependency. They can omit `dependent_paths`.

## Body structure

```markdown
# Topic (current state)

<1-3 paragraph summary of how this thing works TODAY. Gets rewritten on
major changes. This is "compiled truth."ns>

## Subsections as needed

<Reference content. Tables. Commands. Data models. Whatever the topic needs.>

## Workflow: Task 1

Step-by-step playbook for a common task involving this topic. Executable
recipe, not prose. Keep it numbered, imperative, with specific file paths
and commands.

## Workflow: Task 2

Another playbook. One doc can have multiple `## Workflow:` sections.

## Timeline

Append-only. Each ship adds one bullet. Never rewrite.

- **2026-04-18**: Phase 1 shipped. Row counts live. See PR #6.
- **2026-05-01**: Added unicode-safe slugger after discovering issue.
```

### Why this structure

- **Compiled truth at top**: agents reading for context load the summary
  first. If they don't need specifics, they stop there.
- **Workflows as sections**: turns reference docs into executable recipes.
  Agents handed a workflow can just execute it. No interpretation required.
- **Timeline at bottom**: gives historical context without crowding the
  "current state" prose. Append-only so it never gets rewritten destructively.

## Router table (`AGENTS.md`)

Markdown table with two columns: code path → doc file. Example:

```markdown
| If you're touching ... | Read this doc |
|---|---|
| `src/services/payment.ts` | [`docs/agent/billing.md`](docs/agent/billing.md) |
| `src/db/schema/` | [`docs/agent/database.md`](docs/agent/database.md) |
| Deploy or `.github/workflows/` | [`docs/agent/deployment.md`](docs/agent/deployment.md) |
```

`doc-check.ts` parses the `(docs/agent/<name>.md)` links and fails CI if any
target is missing.

## `_TIMELINE.md` (roll-up)

Project-wide shipping history. Newest at top. One bullet per merged PR that
changes behavior or data model.

```markdown
---
owner: lance
last_verified: 2026-04-18
---

# Project Timeline

## 2026

### 2026-04-18
- **PR #12** — Added payment retry logic. See `docs/agent/billing.md`.
- **PR #11** — Switched from Stripe SDK v12 to v13. See `docs/agent/billing.md`.

### 2026-04-17
- **PR #10** — Database migration to split `users` into `accounts` + `profiles`.
```

Every focused doc ALSO has its own Timeline at the bottom. `_TIMELINE.md`
is the roll-up. Both are append-only.

## Gotchas (`docs/agent/gotchas.md`)

Numbered list of project-specific foot-guns. Each item is:

- One sentence stating the rule or pitfall
- Short explanation of the symptom if violated
- Cross-reference to the focused doc that covers the topic in depth

```markdown
1. **Never use `z.coerce.boolean()`.** JavaScript's `Boolean("false")` returns
   `true`. Use `z.preprocess((v) => v === "true", z.boolean())` instead. See
   `api.md`.
```

Items added when discovered. Never removed unless the underlying risk is
eliminated (and then with a note).

## Doc update rules (enforced by CI + CLAUDE.md)

1. Any PR touching code in a doc's `dependent_paths` MUST include a doc
   update in the same PR. `doc-check.ts` catches deletes/renames; humans
   catch semantic staleness.
2. Every doc update bumps `last_verified` to the PR date.
3. Every behavior/data-model change adds a `## Timeline` entry to the
   relevant focused doc AND to `_TIMELINE.md`.
4. Every new foot-gun discovered goes in `gotchas.md`.
5. Every new focused doc gets a row in the `AGENTS.md` router table.
