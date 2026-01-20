# Lance Stack Rules

## Commands

### Development

- `npm run dev` — Run both API and frontend concurrently (from root)
- `npm run dev:api` — Run API only (`wrangler dev --port 8787 --persist-to .wrangler/state`)
- `npm run dev:web` — Run frontend only (`vite` on port 5173)

### Building & Testing

- `npm run build` — Build all workspaces
- `npm run test` — Run tests (prefer `npm run test --workspace=packages/core` for speed)
- `tsc --noEmit` — Typecheck without emitting (run after multi-file changes)

### Deployment

- `npm run deploy` — Deploy API and frontend
- `npm run deploy:api` — Deploy API to Cloudflare Workers (`wrangler deploy`)
- `npm run deploy:web` — Deploy frontend to Cloudflare Pages (`wrangler pages deploy dist`)

### Workspace-Targeted Commands

```bash
npm run dev --workspace=apps/api
npm run dev --workspace=apps/web
npm run build --workspace=packages/core
npm run test --workspace=packages/core
```

## Code Style

### General

- Use ES modules (`import`/`export`), never CommonJS (`require`)
- Destructure imports when possible: `import { foo } from 'bar'`
- TypeScript strict mode is enabled — no implicit `any`
- Prefer `const` over `let`; avoid `var`

### Frontend (apps/web)

- Use shadcn/ui components from `@/components/ui/`
- Follow existing component patterns in `src/components/`
- Use TanStack Query for data fetching
- Use React Hook Form + Zod for forms
- Use Sonner for toasts (`toast.success()`, `toast.error()`)

### Backend (apps/api)

- Use Hono for routing
- Validate all inputs with Zod schemas
- Type bindings in the `Env` type:
  ```typescript
  type Env = {
    MY_KV: KVNamespace;
    DB: D1Database;
    CLERK_SECRET_KEY: string;
  };
  ```
- Return JSON responses: `c.json({ data })` or `c.json({ error }, 4xx)`
- Use middleware pattern for auth: `app.use("/api/protected/*", requireAuth)`

### Shared Logic (packages/core)

- Keep this package **database-agnostic** — no direct DB calls
- Export pure functions, types, and validators
- All business logic tests go here using Vitest

## Workflow

### After Making Changes

1. Run typecheck: `tsc --noEmit` (or workspace-specific)
2. Run tests if touching `packages/core`: `npm run test --workspace=packages/core`
3. Test locally: `npm run dev` and verify in browser

### Secrets Management

- **Never commit secrets** — use `.env.local` (gitignored) for frontend
- Use `wrangler secret put SECRET_NAME` for Worker secrets
- Clerk keys go in `.env.local` (frontend) and Cloudflare secrets (API)

### Database Changes

- Add migrations to `sql/migrations/` with numbered prefixes
- Never modify existing migrations — create new ones
- Keep `sql/schema.sql` updated with full current schema
- Use `pscale shell` or D1 commands for local testing

## File Patterns

| Pattern | Location |
|---------|----------|
| API routes | `apps/api/src/routes/` or inline in `apps/api/src/index.ts` |
| React components | `apps/web/src/components/` |
| UI primitives | `apps/web/src/components/ui/` (shadcn) |
| Shared types | `packages/core/src/types.ts` |
| Validators | `packages/core/src/validators.ts` |
| Business logic | `packages/core/src/` |
| Tests | `packages/core/src/__tests__/` or `*.test.ts` |
| Migrations | `sql/migrations/` |
