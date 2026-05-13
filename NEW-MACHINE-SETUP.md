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
| Tools | `garrytan/gstack`, `garrytan/gbrain` (master, currently gstack v1.33.2.0 / gbrain v0.33.1.0) | `~/.claude/skills/gstack`, `~/RetterCode/gbrain` | git clone |
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

# gbrain — master is fine; brain DB is already at schema v54.
# Do NOT use bun install -g — postinstall hook gets blocked, schema migrations skip.
git clone https://github.com/garrytan/gbrain ~/RetterCode/gbrain
cd ~/RetterCode/gbrain
chmod +x src/cli.ts                     # bun link's symlink target needs exec bit
bun install
bun link
gbrain --version                        # currently prints 0.33.1.0
```

> **Local fork:** the main Mac keeps a one-commit fork on top of upstream master
> that re-adds class-member symbol_types (`'method definition'`, `'method signature'`,
> `'field definition'`, `'public field definition'`) to `DEF_TYPES` in
> `src/commands/code-def.ts`. Without it `gbrain code-def <ClassMethod>` returns
> zero rows even when the tree-sitter chunker indexed them. Either cherry-pick
> commit `a6bb1ff` from the `fork/fix/code-def-class-methods` branch on
> `lanceretter/gbrain`, or skip it and rely on `gbrain code-refs` / search instead.

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
- `gbrain doctor` should show schema_version 54, 11,000+ pages, ~94% embedding coverage
- `gbrain stats` should show 15,000+ embeddings
- `gbrain sources list` should show `default`, `gstack-brain-lanceretter`, and the per-repo `gstack-code-*` sources
- `claude mcp list` should include `gbrain ✓ Connected`

**Do not** pick "auto-provision a new project" — that creates a separate empty brain.

**Match gbrain versions across machines.** Init on a new Mac will try to migrate the shared brain forward in place. If your new Mac is running a much newer gbrain than the one that last touched the brain, the in-place migration can fail mid-flight. Upgrade your main Mac first (`cd ~/RetterCode/gbrain && git fetch origin && git checkout origin/master && bun install && bun link`, then `gbrain apply-migrations --yes` to bring the shared brain forward), then bring the new Mac up.

**v0.30 → v0.33 upgrade quirk (encountered 2026-05-13):** all 11 schema migrations (v44 → v54) applied cleanly, but the v0.32.2 orchestrator's data-backfill phase refuses to run if *any* registered code source (`~/RetterCode/<repo>`) has uncommitted changes. The facts table is empty post-upgrade so this writes zero rows anyway, but it shows as `[FAIL] minions_migration: WEDGED v0.32.2` in `gbrain doctor`. To clear: stash/commit in the dirty repo, then `gbrain apply-migrations --force-retry 0.32.2 && gbrain apply-migrations --yes`.

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

Expected: schema_version 54, 11,000+ pages, ~94% embedded, 7+ federated sources, MCP connected, real `~/.gstack/projects` directory, OPENAI_API_KEY set, smoke search hits something.

## Daily flow (after setup)

- **Write a checkpoint via `/context-save`** → gstack-brain auto-pushes at skill end. Pulls automatically on next skill-start (`gstack-brain-sync` runs in preamble).
- **Edit a `commands/foo.md` in claude-dotfiles** → manual `git push` from there. On Mac #2: `cd ~/RetterCode/claude-dotfiles && git pull` then re-run `/lance-claude-sync`.
- **Search anywhere** → `gbrain search "X"` or `mcp__gbrain__search` from a Claude Code session. Hits the shared DB, finds content from either machine.

## Gotchas

- **PlanetScale URL is a secret.** Don't paste in chat or commit. Lives in `~/.gbrain/config.json` at mode 0600 — copy it from main Mac via `scp` or 1Password.
- **gh CLI defaults to HTTPS.** If `gstack-brain-init` ever needs to run, pass `--remote https://github.com/...` not the SSH URL. (We hit this on the main Mac.)
- **claude-dotfiles no longer tracks `gstack/`.** Don't be alarmed when it's missing from that repo on the new Mac — gstack memory is in its own canonical repo now (commit `4043c32` made the split).
- **`gbrain search --source <id>` filter is partly stale in our brain.** `gbrain doctor` flags `multi_source_drift` with ~418 page slugs sitting at `source_id='default'` instead of their intended `gstack-code-*` source — a pre-v0.30.3 putPage misroute. Searches still work; per-source scope is unreliable for those rows. Fix path: `gbrain sync --source <id> --full` to re-home, or `gbrain delete <slug>` for the default-side duplicates. A first-class `gbrain sources rehome` cleanup command is tracked upstream.
- **Don't run `bun install -g github:garrytan/gbrain`** — global postinstall hook gets blocked, schema migrations never run, CLI aborts on first PGLite open. Use `git clone + bun install + bun link`.
- **Always snapshot before upgrading gbrain.** Run `gbrain export --dir ~/gbrain-backups/$(date +%Y%m%d)` on one Mac before anyone pulls master across a major-version jump. The v0.30 → v0.33 upgrade went clean (11 additive schema migrations v44–v54, all `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`), but earlier jumps have needed manual `ALTER TABLE` prep — assume future majors could too.
- **The `chmod +x src/cli.ts` step is mandatory.** `bun link` symlinks the global `gbrain` binary to `src/cli.ts`; if the file isn't executable you get `permission denied: gbrain`. Some git checkouts strip the exec bit; this restores it.

## When to update this doc

If you change cross-machine architecture (move to a new gbrain provider, swap dotfiles structure, add a third sync repo), update this file in the same commit. Reference from your main Mac's `~/RetterCode/conquest-lpr/CLAUDE.md` (under GBrain Configuration) so you don't forget where it lives.
