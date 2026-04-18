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

### v1.0.0 (2026-04-18)

Initial release. Extracted from `conquest-solutions/conquest-hub` PRs #8
and #9. Includes:
- Router + focused docs structure
- `doc-check.ts` with two modes (default + `--drift`)
- GitHub Actions CI gate
- Weekly staleness + drift cron
- PR template
- `CLAUDE.md` for agent session rules
