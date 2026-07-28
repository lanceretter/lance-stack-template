# Lance Stack Template

My preferred tech stack for building full-stack TypeScript applications.

## What's Here

- **[STACK.md](./STACK.md)** - Complete reference guide with all dependencies, configs, and patterns
- **[BETTER-AUTH.md](./BETTER-AUTH.md)** - Self-hosted auth on Cloudflare Workers. Pattern + the `pg.Client` vs `pg.Pool` Hyperdrive footgun.
- **[MOBILE-APP.md](./MOBILE-APP.md)** - Native iOS/Android via Expo + EAS. Standalone repo layout, plain-fetch auth, TestFlight pipeline, footguns from real builds.
- **[NEW-MACHINE-SETUP.md](./NEW-MACHINE-SETUP.md)** - Reproduce my full Claude Code + gstack + gbrain setup on a fresh Mac (~15 min)
- **[docs-scaffold/](./docs-scaffold/)** - Drop-in agent documentation system for new projects. Router + focused docs + CI coherence gate + weekly staleness cron. Adapted from [gbrain](https://github.com/garrytan/gbrain)'s skill pattern.
- **[.cursor/](./.cursor/)** - Optional Cursor agent rules, commands, and hooks (see [Agent Workflow](#cursor-agent-workflow-optional) below)
- **[brand/](./brand/)** - Conquest Solutions logo kit (true-vector SVGs + PNG renders + print-master PDF, all lockups/variants). Use for any CS logo request. See [brand/README.md](./brand/README.md).

## Quick Summary

| Layer | Tech |
|-------|------|
| **Frontend (web)** | React + Vite + TypeScript + TailwindCSS + shadcn/ui |
| **Mobile (native)** | Expo SDK 54 + React Native + MapLibre + CARTO. See MOBILE-APP.md. |
| **Backend** | Cloudflare Workers + Hono + Zod |
| **Database** | Supabase / PlanetScale / D1 + Drizzle ORM |
| **Auth** | better-auth (recommended for new builds, see BETTER-AUTH.md) or Clerk |
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
