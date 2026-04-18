# Install

How to install `docs-scaffold` into a new or existing repo. 15 min.

## Prerequisites

- GitHub repo (the CI workflows assume GitHub Actions)
- Bun installed on your dev machine (`curl -fsSL https://bun.sh/install | bash`)

CI runs Bun too (via `oven-sh/setup-bun@v2`) — no setup needed on GitHub's end.

## Option 1: install.sh (recommended)

From your project root:

```bash
curl -fsSL https://raw.githubusercontent.com/lanceretter/lance-stack-template/main/docs-scaffold/install.sh | bash
```

The script:
1. Copies `template/` files into your repo root
2. Detects pre-existing `AGENTS.md` or `CLAUDE.md` and prompts before overwriting
3. Writes `.docs-scaffold-version` with the current version
4. Prints next-step customization instructions

## Option 2: manual copy

```bash
# From your repo root:
DOCS_SCAFFOLD=/path/to/lance-stack-template/docs-scaffold

# Copy the template files
cp -r "$DOCS_SCAFFOLD/template/." .

# Record the version
cat "$DOCS_SCAFFOLD/template/.docs-scaffold-version" > .docs-scaffold-version
```

## Customize

The template ships with placeholders. Fill them in:

### 1. `AGENTS.md` (router)

Open [`AGENTS.md`](../template/AGENTS.md). Edit:
- Line 1: replace `PROJECT_NAME` with your actual project name
- Line 3-4: replace the tagline with a one-sentence description
- The **"If you're touching ..."** table: replace the example rows with
  entries matching your project's actual code layout. Typical starting rows:
  ```
  | `src/db/` or `schema/`       | docs/agent/database.md         |
  | `src/routes/` or API handlers | docs/agent/api.md              |
  | Frontend pages                | docs/agent/frontend.md         |
  | Deploy / CI                  | docs/agent/deployment.md       |
  ```

### 2. `docs/agent/*.md` (focused docs)

The template includes three scaffolds:
- `architecture.md` — overall shape, tech stack, critical decisions
- `database.md` — schema, migrations, DB ops
- `deployment.md` — env vars, deploy workflow, post-merge checklist

Each has `TODO` markers and placeholder `dependent_paths`. Edit to match your
project. Add additional focused docs as you need them.

Delete any scaffold doc that doesn't apply — just remove it from `AGENTS.md`
table too.

### 3. `CLAUDE.md`

Project-agnostic as shipped. Review the "Non-negotiable rules" section and
adjust. You might want to remove "Never commit plaintext credentials" if your
project doesn't handle sensitive data (rare).

### 4. `.github/pull_request_template.md`

Edit the "Scope touched" checklist to match the rows in your `AGENTS.md`
router.

### 5. `docs/agent/_TIMELINE.md`

Add your first entry documenting the installation itself. Every subsequent
behavior-changing merge gets one bullet.

### 6. `docs/agent/gotchas.md`

Start empty or with 2-3 known foot-guns from your project. Grows organically.

## Verify

From your repo root:

```bash
bun run scripts/doc-check.ts
```

Expect `0 error(s)` — if there are errors, the script tells you exactly
which file references a missing path.

```bash
bun run scripts/doc-check.ts --drift
```

Expect warnings for any TypeScript files in your `dependent_paths` that
export symbols not mentioned in the doc. Some noise is expected; genuine
gaps are hints for doc improvements.

## Commit

Open a PR titled "chore: install docs-scaffold v1.0.0". After merge, the CI
gate runs on every subsequent PR automatically.

## Next sessions

Your agents (Claude Code, Cursor, OpenClaw) will pick up `CLAUDE.md` and
`AGENTS.md` at session start and follow the structure automatically. Tell
them: "read CLAUDE.md then AGENTS.md before starting" — once. After that
it's in the session context.

## Troubleshooting

- **`bun: command not found`**: install bun at https://bun.sh
- **CI workflow fails on first PR**: if `scripts/doc-check.ts` exits non-zero,
  check the error message — it names the specific file with the problem.
  Almost always a `dependent_paths` entry that doesn't exist yet.
- **Weekly cron doesn't open issues**: check `.github/workflows/doc-staleness.yml`
  has `issues: write` permission and that `GITHUB_TOKEN` is available in the
  workflow (both are in the template by default).
