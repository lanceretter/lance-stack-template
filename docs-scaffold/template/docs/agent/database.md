---
owner: REPLACE_ME
last_verified: REPLACE_ME_DATE
dependent_paths:
  - src/db/
  - migrations/
---

# Database (current state)

<!-- TODO: 1 paragraph — what DB, what ORM, what the schema source of truth is. -->

## Schema source of truth

<!-- TODO: describe where the schema is defined -->

`src/db/schema/` — Drizzle/Prisma/raw SQL schema files per domain.

| File | Tables |
|---|---|
| `users.ts` | users, sessions, roles |
| `billing.ts` | subscriptions, invoices |

## Migration pattern

<!-- TODO: document how migrations are created + applied -->

```bash
# Generate migration
npm run db:generate

# Apply to dev
npm run db:migrate

# Apply to prod
# Describe the deploy workflow
```

## Direct DB access

```bash
# psql / mysql / turso shell / etc
./scripts/db-connect.sh
```

## Workflow: Adding a schema change

1. **Edit the schema file** in `src/db/schema/`.
2. **Generate the migration SQL.** `npm run db:generate` (or equivalent).
3. **Review the generated SQL** before committing. Name it descriptively.
4. **Apply to dev** first, spot-check.
5. **Update this doc's "Schema source of truth" table** if you added a new
   schema file. Bump `last_verified`. Add entry to `## Timeline`.
6. **Apply to prod at deploy time.** Migration MUST run BEFORE new code
   deploys, otherwise new code hits missing columns.

## Workflow: Rolling back a migration

<!-- TODO: project-specific rollback story -->

1. TODO

## Timeline

- **REPLACE_ME_DATE**: Project initialized with docs-scaffold.
