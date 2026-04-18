# Examples

## Real-world: `conquest-solutions/conquest-hub`

The first production install. IT Glue replacement for an MSP. Private repo,
so we can't embed the docs directly, but the structure is identical to the
scaffold:

```
conquest-hub/
├── AGENTS.md                  # router, ~50 lines
├── CLAUDE.md                  # agent rules
├── .docs-scaffold-version     # "1.0.0"
├── docs/agent/
│   ├── architecture.md        # Clerk vs client orgs, tech stack, auth flow
│   ├── database.md            # Drizzle + PlanetScale + Hyperdrive + pscale.sh
│   ├── itglue-sync.md         # Fetch → staging (project-specific)
│   ├── itglue-transform.md    # Staging → main ETL (project-specific)
│   ├── encryption.md          # AES-GCM + sensitive-key redaction
│   ├── development.md         # Adding routes, env vars, deploy
│   ├── gotchas.md             # 10 foot-guns
│   └── _TIMELINE.md           # Project-wide history
├── .github/
│   ├── pull_request_template.md
│   └── workflows/
│       ├── doc-check.yml
│       └── doc-staleness.yml
└── scripts/
    └── doc-check.ts
```

**What conquest-hub added that the scaffold doesn't ship:**

- `docs/agent/itglue-sync.md` and `docs/agent/itglue-transform.md` —
  project-specific focused docs. Not in the scaffold because every project
  has different domain docs.
- Encryption-specific workflows (key rotation, sensitive field addition).
- Rich `dependent_paths` — each doc points at 3-5 specific paths.

**Pattern adherence:**

- Router table in AGENTS.md: 12 rows mapping code paths to docs.
- Every focused doc: front-matter + "current state" intro + reference
  sections + `## Workflow:` recipes + `## Timeline` at the bottom.
- Gotchas.md: 10 items, each with cross-reference to the focused doc.
- `_TIMELINE.md`: one bullet per shipped PR since project inception.

**Evidence the system works:**

- 4 PRs shipped in a single day (2026-04-18): encryption + transform layer +
  docs update + scaffold refactor. All docs stayed in sync via the CI gate.
- Zero staleness issues after the refactor (weekly cron has nothing to flag).
- Agents running Claude Code on the repo read AGENTS.md → route → get
  context in one step. No more wading through a 450-line monolith.

## Your project

Add a link here when you install docs-scaffold. PR welcome.
