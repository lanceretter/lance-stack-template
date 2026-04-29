# Lance Stack Template

My preferred tech stack for building full-stack TypeScript applications.

## What's Here

- **[STACK.md](./STACK.md)** - Complete reference guide with all dependencies, configs, and patterns
- **[NEW-MACHINE-SETUP.md](./NEW-MACHINE-SETUP.md)** - Reproduce my full Claude Code + gstack + gbrain setup on a fresh Mac (~15 min)
- **[docs-scaffold/](./docs-scaffold/)** - Drop-in agent documentation system for new projects. Router + focused docs + CI coherence gate + weekly staleness cron. Adapted from [gbrain](https://github.com/garrytan/gbrain)'s skill pattern.
- **[.cursor/](./.cursor/)** - Optional Cursor agent rules, commands, and hooks (see [Agent Workflow](#cursor-agent-workflow-optional) below)

## Quick Summary

| Layer | Tech |
|-------|------|
| **Frontend** | React + Vite + TypeScript + TailwindCSS + shadcn/ui |
| **Backend** | Cloudflare Workers + Hono + Zod |
| **Database** | Supabase / PlanetScale / D1 + Drizzle ORM |
| **Auth** | Clerk or Supabase Auth |
| **Deploy** | Cloudflare Pages + Workers |

## Usage

Reference `STACK.md` when starting a new project, or push this to GitHub as a gist/repo for access anywhere.

### Create a Gist

```bash
gh gist create STACK.md --public -d "Lance's preferred tech stack"
```

### Or Push to GitHub

```bash
cd /Users/lanceretter/RetterCode/lance-stack-template
git init
git add .
git commit -m "Initial commit"
gh repo create lance-stack-template --public --source=. --push
```

## Cursor Agent Workflow (optional)

This template includes optional Cursor agent configuration in `.cursor/`:

- **Rules** (`.cursor/rules/`) — Stack-specific commands and coding patterns the agent follows
- **Commands** (`.cursor/commands/`) — Reusable workflows like `/pr`, `/review`, `/fix-issue`
- **Hooks** (`.cursor/hooks/`) — Optional automation for long-running agent loops

See the **Cursor Agent Best Practices** section in [STACK.md](./STACK.md) for detailed guidance on working with agents in this stack.

**Requirements:** Some commands use `gh` (GitHub CLI). Install with `brew install gh` and authenticate with `gh auth login`.
