---
owner: REPLACE_ME
last_verified: REPLACE_ME_DATE
dependent_paths:
  - .github/workflows/
  # Add env files, deploy scripts, wrangler.toml, vercel.json, etc.
---

# Deployment (current state)

<!-- TODO: 1 paragraph — where does this deploy to, how does CI work, etc. -->

## Environment variables

<!-- TODO: list env vars, grouped by environment -->

### Production
- `DATABASE_URL` — ...
- `SECRET_KEY` — ...

### Development
- Same as production but pointing at dev resources. Stored in `.env.local`
  (gitignored).

## Deploy command

```bash
# TODO: project-specific deploy command
npm run deploy
```

## CI workflow

Described in `.github/workflows/`. Typical flow:
1. PR opened → tests + typecheck + `doc-check.ts`
2. Merge to main → deploy to staging
3. Manual promote → production

## Workflow: Post-merge checklist

When a PR with schema or infra changes merges:

1. **Apply migrations** (see `database.md`)
2. **Deploy** the new code
3. **Verify health endpoint** returns green
4. **Spot-check** a user-facing flow in production

## Workflow: Rolling back a bad deploy

<!-- TODO: project-specific rollback story -->

1. TODO

## Timeline

- **REPLACE_ME_DATE**: Project initialized with docs-scaffold.
