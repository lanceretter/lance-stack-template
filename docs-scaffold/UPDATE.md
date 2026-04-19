# Updating an existing install

As docs-scaffold evolves, existing installs can pull updates without
clobbering project-specific content. The tooling (`scripts/doc-check.ts`,
workflows) is the thing that changes. Project-specific docs
(`docs/agent/*.md`, `AGENTS.md` router rows) are yours and never touched.

## Check your installed version

```bash
cat .docs-scaffold-version
```

If the file doesn't exist, you installed before versioning landed. Treat as
`v0.0.0`.

## Update tooling

```bash
# From your project root
curl -fsSL https://raw.githubusercontent.com/lanceretter/lance-stack-template/main/docs-scaffold/update.sh | bash
```

The update script:
1. Fetches the latest version from the upstream repo
2. Replaces ONLY the tooling files (`scripts/doc-check.ts`,
   `.github/workflows/doc-check.yml`, `.github/workflows/doc-staleness.yml`,
   `.github/pull_request_template.md`)
3. Leaves `AGENTS.md`, `CLAUDE.md`, `docs/agent/*`, and your content alone
4. Bumps `.docs-scaffold-version`
5. Prints the CHANGELOG entries since your previous version

## Manual update

If you prefer to see the diff first:

```bash
cd /path/to/lance-stack-template/docs-scaffold
git pull

# Copy only the tooling files
cp template/scripts/doc-check.ts /path/to/your-project/scripts/
cp template/.github/workflows/*.yml /path/to/your-project/.github/workflows/
cp template/.github/pull_request_template.md /path/to/your-project/.github/

# Update version marker
cp template/.docs-scaffold-version /path/to/your-project/
```

Then `git diff` in your project to review, commit with title
`chore: update docs-scaffold to vX.Y.Z`.

## Breaking changes

Version bumps follow semver:
- **MAJOR** (1.x → 2.0): front-matter format change, or `doc-check.ts`
  CLI change that breaks existing consumers. Read the CHANGELOG entry for
  migration steps.
- **MINOR** (1.0 → 1.1): new feature, backwards compatible. Safe to auto-update.
- **PATCH** (1.0.0 → 1.0.1): bug fix. Safe to auto-update.

## Versions

### v1.3.0 (2026-04-19)

Self-updating via weekly cron + install registry. **Backwards compatible** —
existing v1.2.0 consumers can auto-update.

- **New file: `.github/workflows/docs-scaffold-update.yml`.** Runs every
  Monday at 14:00 UTC (and on demand). Reads local `.docs-scaffold-version`,
  compares against upstream, and if they differ, runs `update.sh` and opens
  a PR titled `chore: update docs-scaffold to vX.Y.Z`. Uses the built-in
  `GITHUB_TOKEN` — no PAT or secret needed. Dedup: if a branch already
  exists for the target version, the workflow skips opening a duplicate.
- **`install.sh` now copies `doc-auto-update.yml`** (oversight from v1.2.0 —
  previously you had to copy it by hand). Fresh installs at v1.3.0 get all
  four workflows automatically.
- **`update.sh` now updates `doc-auto-update.yml`** as well (same oversight —
  previously its updates were silently skipped on existing installs).
- **New file: `docs-scaffold/INSTALLS.md`** (upstream only, not in template).
  Manual registry of known consumer repos. `install.sh` prints a reminder
  at the end to add your repo there.

**Known limitation.** PRs opened by the default `GITHUB_TOKEN` don't trigger
other workflows, so `doc-check.yml` won't run on the auto-update PR itself.
After merge, `doc-check.yml` runs on the push to main as normal. This is
fine because `update.sh` only touches tooling files. If you want CI on the
auto-PR, switch to a PAT (stored as `DOCS_SCAFFOLD_UPDATE_TOKEN` secret) —
workflow accepts that override, see the commented block inside the file.

Migration (v1.2.0 → v1.3.0):
1. Run the update script: `curl -fsSL https://raw.githubusercontent.com/lanceretter/lance-stack-template/main/docs-scaffold/update.sh | bash`
2. Commit the new `.github/workflows/docs-scaffold-update.yml` and bumped
   `.docs-scaffold-version`.
3. Next Monday at 14:00 UTC, the workflow runs and will find you're
   already current — no action. First real use is when v1.4.0 ships.
4. To test immediately: Actions tab → "docs-scaffold update check" →
   "Run workflow" (only works after a future version is pushed upstream).

### v1.2.0 (2026-04-19)

Post-merge AI auto-documentation. **Backwards compatible** —
existing v1.1.0 consumers can auto-update. New workflow is opt-in
(requires the `ANTHROPIC_API_KEY` secret to actually run anything).

- **New file: `.github/workflows/doc-auto-update.yml`.** Triggers on
  `pull_request.closed` when merged to `main`. Installs Claude Code
  in the runner, feeds it the PR diff + title + body, asks it to
  update `docs/agent/_TIMELINE.md`, bump `last_verified` on any
  `docs/agent/*.md` whose `dependent_paths` overlap the diff, and
  add a Recent Updates row to `README.md` when user-visible behavior
  shipped. Commits directly to `main` as `docs-bot` with `[skip ci]`
  so doc-check doesn't recursively run on the bot commit.
- **Safety.** Tool allowlist restricts Claude to `Read / Edit / Write /
  Glob / Grep` and read-only shell commands. `git add` in the commit
  step is path-scoped to doc files — if Claude accidentally touched
  source, those changes are left unstaged.
- **Opt-out.** Add the `skip-docs` label to a PR, or put `[skip docs]`
  in the PR title, or prefix the title with `docs-bot:`.
- **Cost.** Each merge triggers one Claude run (~10-30s, a few cents).
  Trivial compared to the reviewer time saved.

Migration (v1.1.0 → v1.2.0):
1. Add the `ANTHROPIC_API_KEY` secret to your repo under
   Settings → Secrets → Actions. Without it, the workflow fails loud
   with a clear error message (doesn't silently no-op).
2. Run the update script (or copy `.github/workflows/doc-auto-update.yml`
   manually).
3. Merge your next PR and watch the `Auto-Document on Merge` job run.
   First run takes ~1-2 min (npm install + Claude startup); subsequent
   runs are faster due to node_modules caching.
4. If you want to preview what Claude would write without running it on
   a real merge, open a draft PR and inspect the prompt locally
   (\`cat .github/workflows/doc-auto-update.yml | grep -A50 'prompt.md'\`).

### v1.1.0 (2026-04-18)

Hierarchical coverage + accuracy gates. Proven out in `conquest-lpr`.
**Backwards compatible** — existing v1.0.0 consumers can auto-update.

- **App-local docs gated.** `doc-check.ts` now scans
  `apps/*/AGENTS.md` and `packages/*/AGENTS.md` with the same rules as
  `docs/agent/*.md`, plus:
  - **Scope check:** app-local docs may only claim `dependent_paths`
    inside their own directory (or `packages/`).
  - **Orphan check:** every app-local AGENTS.md must be linked from the
    root `AGENTS.md` router.
- **last_verified bump enforcement** (`--pr-base=<sha>`). If any file in
  a doc's `dependent_paths` changed between base and HEAD, the doc
  itself must be in the diff and `last_verified` must be today (UTC) or
  later. Closes the "changed the code but forgot to re-read the doc"
  accuracy gap.
- **Markdown link integrity.** `[text](path.md)` relative links are
  validated across all canonical docs. Anchors and external URLs are
  skipped. Already caught real drift in first rollout.
- **README policy lint.** When an app has both `README.md` and
  `AGENTS.md`, and README > 80 lines, `doc-check.ts` warns (soft
  signal). Intent: READMEs stay human-onboarding-only, AGENTS.md is
  canonical agent-facing truth.
- **Push-to-main trigger.** `doc-check.yml` now also runs on direct
  pushes to `main` (static coherence only — no `last_verified`
  enforcement since there's no meaningful base). Catches broken paths,
  missing front-matter, orphans on ad-hoc commits.
- **Weekly cron covers app-local + absolute-age signal.** The staleness
  workflow's inline TS now scans `apps/*/AGENTS.md` and
  `packages/*/AGENTS.md` as well as `docs/agent/`. New **"ageing"**
  signal flags any doc whose `last_verified` is over 90 days old, even
  if no dependent_paths code changed. Safety net for docs in quiet
  areas.
- **Per-doc tracking issues.** Weekly cron now creates one GH issue per
  stale doc + one per ageing doc (actionable per owner), plus ONE
  combined drift dashboard (noisy, informational). Labels:
  `doc-staleness` / `doc-ageing` / `doc-drift`. Previous issues with
  the same labels close first so the set stays fresh.

Migration (v1.0.0 → v1.1.0):
1. Run the update script (or manual copy per the section above).
2. Your first PR after update will fail if any doc has broken
   `dependent_paths` (always did, but worth re-checking after path
   tweaks).
3. If you have `apps/*/AGENTS.md` without front-matter, either add
   front-matter and a router row, or rename them to `NOTES.md` to
   signal they're not canonical. See the example migration in
   `examples/`.

### v1.0.0 (2026-04-18)

Initial release. Extracted from `conquest-solutions/conquest-hub` PRs #8
and #9. Includes:
- Router + focused docs structure
- `doc-check.ts` with two modes (default + `--drift`)
- GitHub Actions CI gate
- Weekly staleness + drift cron
- PR template
- `CLAUDE.md` for agent session rules
