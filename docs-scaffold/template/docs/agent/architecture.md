---
owner: REPLACE_ME
last_verified: REPLACE_ME_DATE
dependent_paths:
  # Paths this doc is responsible for. Edit to match your project.
  # Can be files or directories.
  - src/index.ts
  - src/middleware/
---

# Architecture (current state)

<!-- TODO: one paragraph describing what this project is, who uses it, where it's deployed. -->

PROJECT_NAME is a WHAT for WHOM. Deployed at WHERE. Written in LANGUAGE on
FRAMEWORK with DATABASE.

## Monorepo layout

<!-- TODO: replace with your actual layout -->

```
project-root/
├── src/              # Application source
├── tests/            # Test suites
├── docs/             # Stakeholder + agent documentation
├── migrations/       # Schema migrations (if applicable)
└── scripts/          # Tooling
```

## Tech stack

<!-- TODO: list tech choices -->

- **Language**: TypeScript / Python / Go / etc.
- **Frontend**: React / Vue / Svelte / none
- **Backend**: Node / Cloudflare Workers / Django / Rails / etc.
- **Database**: Postgres / MySQL / SQLite / etc.
- **Auth**: Clerk / Auth0 / custom / none
- **Storage**: S3 / R2 / local / etc.
- **Deploy**: Vercel / Cloudflare / AWS / etc.

## URLs

- Production: https://example.com
- Staging: https://staging.example.com
- API: https://api.example.com

## Critical architectural decisions

<!--
Document the 2-5 decisions most likely to confuse a new contributor or
agent. What's non-obvious about how this project is built? Examples:

- Is there a multi-tenancy model? How are tenants isolated?
- Is there an auth flow that works differently than the default?
- Are there sync/async split patterns?
- Are there any "this is unusual because..." choices?
-->

### Decision 1: TODO

<Short explanation of the decision, why it was made, what the alternative was.>

### Decision 2: TODO

## Authentication flow

<!-- TODO: step-by-step of how a user gets authenticated, if applicable -->

1. Step 1
2. Step 2
3. Step 3

## Workflow: Onboarding a new team member

<!-- TODO: step-by-step for granting access, if applicable -->

1. TODO

## Workflow: Debugging common auth errors

1. TODO

## Timeline

- **REPLACE_ME_DATE**: Project initialized with docs-scaffold.
