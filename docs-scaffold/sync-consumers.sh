#!/usr/bin/env bash
# sync-consumers.sh — push the latest docs-scaffold release to every
# consumer repo listed below. Run after bumping the upstream version.
#
# For each repo: switch to its default branch, cut a new branch, delete any
# orphan `docs-scaffold-update.yml` workflow left by v1.3.x, run update.sh,
# commit, push, open PR via gh. Leaves unrelated uncommitted work alone.
#
# Usage:  ./docs-scaffold/sync-consumers.sh
#
# Requires: gh (authenticated), curl, git. Local clones at the paths below.
#
# If a repo is not on its default branch locally, we switch to it, run the
# sync, and switch back. If the working tree is dirty, only scaffold files
# are staged — any pre-existing uncommitted work rides through untouched.

set -euo pipefail

# --- edit these when registering new consumers (also update INSTALLS.md) ---
REPOS=(
  "$HOME/RetterCode/conquest-hub"
  "$HOME/RetterCode/conquest-lpr"
  "$HOME/RetterCode/trashtastic-website-beta"
)
# ---------------------------------------------------------------------------

UPSTREAM_RAW="https://raw.githubusercontent.com/lanceretter/lance-stack-template/main/docs-scaffold"

UPSTREAM_VERSION=$(curl -fsSL "$UPSTREAM_RAW/template/.docs-scaffold-version" | tr -d '[:space:]')
echo "Upstream docs-scaffold: v$UPSTREAM_VERSION"
echo

PRS_OPENED=()
SKIPPED=()
FAILED=()

sync_one() {
  local repo="$1"
  local name
  name="$(basename "$repo")"

  if [[ ! -d "$repo/.git" ]]; then
    echo "  $name: not a git repo at $repo — skipping"
    SKIPPED+=("$name (missing)")
    return 0
  fi

  cd "$repo"

  local original_branch
  original_branch=$(git rev-parse --abbrev-ref HEAD)

  local default_branch
  default_branch=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name 2>/dev/null || echo "main")

  local current_version="v0.0.0"
  if [[ -f .docs-scaffold-version ]]; then
    current_version="v$(tr -d '[:space:]' < .docs-scaffold-version)"
  fi

  if [[ "$current_version" == "v$UPSTREAM_VERSION" && ! -f ".github/workflows/docs-scaffold-update.yml" ]]; then
    echo "  $name: already at $current_version, no orphan — skipping"
    SKIPPED+=("$name (current)")
    return 0
  fi

  echo "  $name: $current_version → v$UPSTREAM_VERSION"

  git fetch origin --quiet

  # Switch to default branch, pulling fast-forward. If we had a different
  # branch checked out, remember it so we can return.
  if [[ "$original_branch" != "$default_branch" ]]; then
    git checkout "$default_branch" --quiet
  fi
  git pull --ff-only origin "$default_branch" --quiet

  local branch="chore/docs-scaffold-v${UPSTREAM_VERSION}"
  if git rev-parse --verify --quiet "$branch" >/dev/null; then
    git branch -D "$branch" >/dev/null
  fi
  git checkout -b "$branch" --quiet

  # Delete v1.3.x cron orphan if present. Harmless no-op otherwise.
  rm -f .github/workflows/docs-scaffold-update.yml

  # Run update.sh (pulls latest tooling from upstream into this repo).
  curl -fsSL "$UPSTREAM_RAW/update.sh" | bash

  # Stage only docs-scaffold-owned paths. Anything else in the working tree
  # (user's in-progress work) is left alone.
  git add .docs-scaffold-version .github scripts 2>/dev/null || true
  # Ensure the orphan deletion gets staged.
  git add -u .github/workflows/docs-scaffold-update.yml 2>/dev/null || true

  if git diff --cached --quiet; then
    echo "    nothing to commit — skipping PR"
    git checkout "$original_branch" --quiet
    git branch -D "$branch" --quiet
    SKIPPED+=("$name (no diff)")
    return 0
  fi

  git commit -m "chore: update docs-scaffold to v${UPSTREAM_VERSION}" --quiet

  git push -u origin "$branch" --quiet

  local pr_title="chore: update docs-scaffold to v${UPSTREAM_VERSION}"
  # trashtastic-website-production has no ANTHROPIC_API_KEY — opt out of
  # doc-auto-update.yml so the merge doesn't fail loud.
  if [[ "$name" == "trashtastic-website-beta" ]]; then
    pr_title="[skip docs] $pr_title"
  fi

  local pr_url
  pr_url=$(gh pr create \
    --base "$default_branch" \
    --head "$branch" \
    --title "$pr_title" \
    --body "Synced via \`docs-scaffold/sync-consumers.sh\` from lance-stack-template.

Changelog: https://github.com/lanceretter/lance-stack-template/blob/main/docs-scaffold/UPDATE.md")

  echo "    PR: $pr_url"
  PRS_OPENED+=("$name: $pr_url")

  git checkout "$original_branch" --quiet 2>/dev/null || git checkout "$default_branch" --quiet
}

for repo in "${REPOS[@]}"; do
  if ! ( sync_one "$repo" ); then
    FAILED+=("$(basename "$repo")")
    echo "  FAILED — continuing"
  fi
done

echo
echo "=== Summary ==="
if (( ${#PRS_OPENED[@]} > 0 )); then
  echo "Opened:"
  for pr in "${PRS_OPENED[@]}"; do echo "  $pr"; done
fi
if (( ${#SKIPPED[@]} > 0 )); then
  echo "Skipped:"
  for s in "${SKIPPED[@]}"; do echo "  $s"; done
fi
if (( ${#FAILED[@]} > 0 )); then
  echo "Failed:"
  for f in "${FAILED[@]}"; do echo "  $f"; done
  exit 1
fi
