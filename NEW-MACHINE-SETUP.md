# New Machine Setup

Get this Mac to where my main Mac is — Claude Code config, gstack memory, and gbrain index all wired up.

## TL;DR

Three repos to clone, one shared database to point at, one API key to drop in env. ~15 minutes.

```
claude-dotfiles            → Claude Code config (CLAUDE.md, commands/, .claude/)
gstack-brain-lanceretter   → gstack memory (checkpoints, plans, learnings, profiles)
gbrain (PlanetScale)       → searchable index of everything; shared across machines
```

## What lives where

| Layer | Source of truth | Local path | Cross-machine |
|---|---|---|---|
| Tools | `garrytan/gstack`, `garrytan/gbrain` (master, currently v0.22.8) | `~/.claude/skills/gstack`, `~/gbrain` | git clone |
| Claude config | `lanceretter/claude-dotfiles` | `~/RetterCode/claude-dotfiles/` | git pull |
| gstack memory | `lanceretter/gstack-brain-lanceretter` (private) | `~/.gstack/` | git pull (auto on skill end) |
| gbrain index | PlanetScale Postgres (`us-east-4.pg.psdb.cloud`) | `~/.gbrain/config.json` | shared DB; nothing to sync |
| OpenAI key | `~/.zshenv` | env var `OPENAI_API_KEY` | manual per-machine |

## Step-by-step

### 1. Install gstack + gbrain CLIs

```bash
# gstack
git clone https://github.com/garrytan/gstack ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup

# gbrain — master is fine; brain DB is already at schema v29.
# Do NOT use bun install -g — postinstall hook gets blocked, schema migrations skip.
git clone https://github.com/garrytan/gbrain ~/gbrain
cd ~/gbrain
chmod +x src/cli.ts                     # bun link's symlink target needs exec bit
bun install
bun link
gbrain --version                        # currently prints 0.22.8
```

> **Heads-up if you ever clone the brain DB into a fresh PlanetScale project:**
> when upgrading a pre-v0.20 schema, `gbrain apply-migrations --yes` aborts on
> `column "search_vector" does not exist` because v0.22's runtime queries columns
> that v0.20's migration adds, and the chain refuses to start. Manual prep
> (one-time): `ALTER TABLE content_chunks ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;`
> plus the other six v0.20 columns (`symbol_type`, `start_line`, `end_line`,
> `parent_symbol_path`, `doc_comment`, `symbol_name_qualified`). Then re-run
> apply-migrations. Our existing brain is past this point.

### 2. Restore Claude config

```bash
mkdir -p ~/RetterCode
git clone git@github.com:lanceretter/claude-dotfiles ~/RetterCode/claude-dotfiles
cd ~/RetterCode/claude-dotfiles
# Then in a Claude Code session, run: /lance-claude-sync
# (installs CLAUDE.md, commands/, .claude/ into the right places)
```

### 3. Restore gstack memory

```bash
echo "https://github.com/lanceretter/gstack-brain-lanceretter.git" > ~/.gstack-brain-remote.txt
~/.claude/skills/gstack/bin/gstack-brain-restore
# clones into ~/.gstack/.git, populates projects/, retros/, profiles
ls ~/.gstack/projects   # should list ~9 project dirs
```

### 4. Connect to the shared gbrain database

You want **the same PlanetScale brain**, not a fresh one. Get the Session Pooler URL from your password manager (or `~/.gbrain/config.json` on your main Mac — `database_url` field).

In a Claude Code session:

```
/setup-gbrain
```

When asked "Where should your brain live?" pick **"Supabase, I already have a connection string"** and paste the pooler URL.

**Heads-up:** the brain is hosted on PlanetScale Postgres (`us-east-4.pg.psdb.cloud`), not Supabase. The skill's `gstack-gbrain-supabase-verify` helper hardcodes a `*.pooler.supabase.com` host check and will reject the URL. Bypass it by running `gbrain init --url <pooler>` directly — gbrain itself accepts any TLS-required Postgres URL. Make sure the URL keeps its `?sslmode=verify-full` query param (PlanetScale requires it) and is trimmed of whitespace before passing.

After that:
- `gbrain doctor` should show ~90/100 health and ~531+ pages
- `gbrain stats` should show 1800+ embeddings
- `gbrain sources list` should show `default` and `gstack-brain-lanceretter`
- `claude mcp list` should include `gbrain ✓ Connected`

**Do not** pick "auto-provision a new project" — that creates a separate empty brain.

**Match gbrain versions across machines.** Init on a new Mac will try to migrate the shared brain forward in place. If your new Mac is running a much newer gbrain than the one that last touched the brain, the in-place migration can fail mid-flight (we hit `column "search_vector" does not exist` going from schema_version 2 to 29). Upgrade your main Mac first (`cd ~/git/gbrain && git pull && bun install && bun link`, run any `gbrain` command to trigger migrations), then bring the new Mac up.

### 5. OpenAI key for embeddings

```bash
cat > ~/.zshenv << 'EOF'
export OPENAI_API_KEY=sk-...your-key...
EOF
chmod 600 ~/.zshenv
zsh -c 'echo $OPENAI_API_KEY | head -c 11'   # sanity: should print "sk-..."
```

Without this, every new page write fails to embed and search recall on new content drops to zero.

### 6. Per-repo gbrain policies

When you `cd` into a tracked repo (conquest-lpr, conquest-hub, etc.) for the first time on this Mac and run any gstack skill, it'll prompt:

> How should `<repo-origin>` interact with gbrain?

Pick `read-write` for repos you actively work in. The choice persists in `~/.gstack/gbrain-repo-policy.json`.

## Verification checklist

After all steps, run these and check each line:

```bash
gbrain doctor --fast --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(f"doctor: {d[\"status\"]} health={d[\"health_score\"]}/100")'
gbrain stats | grep -E 'Pages|Embedded'
gbrain sources list
claude mcp list | grep gbrain
[ -d ~/.gstack/projects -a ! -L ~/.gstack/projects ] && echo "~/.gstack/projects: real dir ✓"
zsh -c '[ ${#OPENAI_API_KEY} -gt 50 ] && echo "OPENAI_API_KEY: set ✓"'
gbrain search "smoke test" | head -1
```

Expected: 90+/100 health, 500+ pages, 100% embedded, two federated sources, MCP connected, real `~/.gstack/projects` directory, OPENAI_API_KEY set, smoke search hits something.

## Daily flow (after setup)

- **Write a checkpoint via `/context-save`** → gstack-brain auto-pushes at skill end. Pulls automatically on next skill-start (`gstack-brain-sync` runs in preamble).
- **Edit a `commands/foo.md` in claude-dotfiles** → manual `git push` from there. On Mac #2: `cd ~/RetterCode/claude-dotfiles && git pull` then re-run `/lance-claude-sync`.
- **Search anywhere** → `gbrain search "X"` or `mcp__gbrain__search` from a Claude Code session. Hits the shared DB, finds content from either machine.

## Gotchas

- **PlanetScale URL is a secret.** Don't paste in chat or commit. Lives in `~/.gbrain/config.json` at mode 0600 — copy it from main Mac via `scp` or 1Password.
- **gh CLI defaults to HTTPS.** If `gstack-brain-init` ever needs to run, pass `--remote https://github.com/...` not the SSH URL. (We hit this on the main Mac.)
- **claude-dotfiles no longer tracks `gstack/`.** Don't be alarmed when it's missing from that repo on the new Mac — gstack memory is in its own canonical repo now (commit `4043c32` made the split).
- **`gbrain search --source <id>` filter looks broken in our brain.** All hits return regardless of `--source`, because every page got assigned `source_id='default'` during the original imports (the v0.22 multi-source code is fine; our data just isn't tagged). Searches still work; you just can't scope to one source. Fix on the to-do list: re-import via `gbrain sync --source <id>` after wiping the duplicate `default` rows.
- **Don't run `bun install -g github:garrytan/gbrain`** — global postinstall hook gets blocked, schema migrations never run, CLI aborts on first PGLite open. Use `git clone + bun install + bun link`.
- **Always snapshot before upgrading gbrain.** When upstream ships v0.23+, run `gbrain export --dir ~/gbrain-backups/$(date +%Y%m%d)` on one Mac before anyone pulls master. The v0.18 → v0.22 jump on this brain required a manual `ALTER TABLE` to add 7 columns before `apply-migrations` would proceed — future major versions could need similar prep.
- **The `chmod +x src/cli.ts` step is mandatory.** `bun link` symlinks the global `gbrain` binary to `src/cli.ts`; if the file isn't executable you get `permission denied: gbrain`. Some git checkouts strip the exec bit; this restores it.

## When to update this doc

If you change cross-machine architecture (move to a new gbrain provider, swap dotfiles structure, add a third sync repo), update this file in the same commit. Reference from your main Mac's `~/RetterCode/conquest-lpr/CLAUDE.md` (under GBrain Configuration) so you don't forget where it lives.
