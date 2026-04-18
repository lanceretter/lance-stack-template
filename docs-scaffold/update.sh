#!/usr/bin/env bash
# update.sh — pull tooling updates into an existing docs-scaffold install.
#
# Only replaces tooling files (doc-check.ts, workflows, PR template).
# Leaves your AGENTS.md, CLAUDE.md, docs/agent/*.md content alone.
#
# Usage:
#   From your project root:
#   curl -fsSL https://raw.githubusercontent.com/lanceretter/lance-stack-template/main/docs-scaffold/update.sh | bash

set -euo pipefail

RAW_BASE="https://raw.githubusercontent.com/lanceretter/lance-stack-template/main/docs-scaffold/template"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: current directory is not a git repo."
  exit 1
fi

if [[ ! -f ".docs-scaffold-version" ]]; then
  echo "No .docs-scaffold-version found. Run install.sh instead (this is for existing installs only)."
  exit 1
fi

CURRENT=$(cat .docs-scaffold-version)
LATEST=$(curl -fsSL "$RAW_BASE/.docs-scaffold-version")

echo "Current: $CURRENT"
echo "Latest:  $LATEST"
echo

if [[ "$CURRENT" == "$LATEST" ]]; then
  echo "Already up to date."
  exit 0
fi

echo "Updating tooling files (AGENTS.md, CLAUDE.md, docs/agent/*.md NOT touched)..."

update_file() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  curl -fsSL "$RAW_BASE/$dest" -o "$dest"
  echo "  updated: $dest"
}

update_file "scripts/doc-check.ts"
update_file ".github/pull_request_template.md"
update_file ".github/workflows/doc-check.yml"
update_file ".github/workflows/doc-staleness.yml"
update_file ".docs-scaffold-version"

echo
echo "Done. Review the diff (git diff) and commit."
echo "Changelog: https://github.com/lanceretter/lance-stack-template/tree/main/docs-scaffold/UPDATE.md"
