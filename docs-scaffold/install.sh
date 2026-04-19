#!/usr/bin/env bash
# install.sh — install docs-scaffold into the current repo.
#
# Usage:
#   From your project root:
#   curl -fsSL https://raw.githubusercontent.com/lanceretter/lance-stack-template/main/docs-scaffold/install.sh | bash
#
# Or clone first:
#   git clone https://github.com/lanceretter/lance-stack-template.git /tmp/lst
#   /tmp/lst/docs-scaffold/install.sh

set -euo pipefail

REPO_URL="https://github.com/lanceretter/lance-stack-template"
RAW_BASE="https://raw.githubusercontent.com/lanceretter/lance-stack-template/main/docs-scaffold/template"

# Detect if run from local clone or via curl pipe
if [[ -d "$(dirname "${BASH_SOURCE[0]:-}")/template" ]] 2>/dev/null; then
  LOCAL_TEMPLATE="$(cd "$(dirname "${BASH_SOURCE[0]}")/template" && pwd)"
  MODE="local"
else
  MODE="remote"
fi

CWD="$(pwd)"
echo "Installing docs-scaffold v$(cat "${LOCAL_TEMPLATE:-}/.docs-scaffold-version" 2>/dev/null || curl -fsSL "$RAW_BASE/.docs-scaffold-version") into: $CWD"
echo

# Safety: must be in a git repo
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: current directory is not a git repo. cd into your project first."
  exit 1
fi

# Collision check
COLLISIONS=()
for f in AGENTS.md CLAUDE.md scripts/doc-check.ts .github/pull_request_template.md .github/workflows/doc-check.yml .github/workflows/doc-staleness.yml .github/workflows/doc-auto-update.yml; do
  if [[ -f "$f" ]]; then
    COLLISIONS+=("$f")
  fi
done

if (( ${#COLLISIONS[@]} > 0 )); then
  echo "The following files already exist and would be overwritten:"
  for f in "${COLLISIONS[@]}"; do echo "  $f"; done
  echo
  read -p "Overwrite them? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Backup or rename the files listed above, then re-run."
    exit 1
  fi
fi

# Create directories
mkdir -p docs/agent .github/workflows scripts

copy_file() {
  local dest="$1"
  if [[ "$MODE" == "local" ]]; then
    cp "$LOCAL_TEMPLATE/$dest" "$dest"
  else
    curl -fsSL "$RAW_BASE/$dest" -o "$dest"
  fi
  echo "  installed: $dest"
}

copy_file "AGENTS.md"
copy_file "CLAUDE.md"
copy_file ".docs-scaffold-version"
copy_file "scripts/doc-check.ts"
copy_file ".github/pull_request_template.md"
copy_file ".github/workflows/doc-check.yml"
copy_file ".github/workflows/doc-staleness.yml"
copy_file ".github/workflows/doc-auto-update.yml"
copy_file "docs/agent/architecture.md"
copy_file "docs/agent/database.md"
copy_file "docs/agent/deployment.md"
copy_file "docs/agent/gotchas.md"
copy_file "docs/agent/_TIMELINE.md"

echo
echo "Done. docs-scaffold installed."
echo
echo "Next steps:"
echo "  1. Edit AGENTS.md — replace PROJECT_NAME and customize the router table."
echo "  2. Edit each docs/agent/*.md — fill in REPLACE_ME placeholders."
echo "  3. Edit .github/pull_request_template.md — mirror your AGENTS.md rows."
echo "  4. Run: bun run scripts/doc-check.ts"
echo "     (If bun isn't installed: curl -fsSL https://bun.sh/install | bash)"
echo "  5. Commit: git add . && git commit -m 'chore: install docs-scaffold'"
echo
echo "Staying up to date:"
echo "  Lance runs $REPO_URL/blob/main/docs-scaffold/sync-consumers.sh"
echo "  after each release. It opens a PR in every registered consumer."
echo
echo "*** Don't forget *** — add this repo to INSTALLS.md + sync-consumers.sh"
echo "  so it gets rolled future releases:"
echo "  $REPO_URL/blob/main/docs-scaffold/INSTALLS.md"
echo
echo "Full install + customize guide: $REPO_URL/tree/main/docs-scaffold/INSTALL.md"
