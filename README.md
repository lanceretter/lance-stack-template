# Lance Stack Template

My preferred tech stack for building full-stack TypeScript applications.

## What's Here

- **[STACK.md](./STACK.md)** - Complete reference guide with all dependencies, configs, and patterns

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
