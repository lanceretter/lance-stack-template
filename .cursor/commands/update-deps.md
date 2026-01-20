# Update Dependencies

Update project dependencies incrementally, running tests between updates.

## Steps

1. **Check outdated packages**: Run `npm outdated` to see what needs updating
2. **Prioritize updates**:
   - Security vulnerabilities first
   - Patch versions (safe)
   - Minor versions (usually safe)
   - Major versions (may have breaking changes — check changelogs)
3. **Update one at a time**: For each package:
   - Run `npm install package@latest` (or specific version)
   - Run `tsc --noEmit` to check for type errors
   - Run tests: `npm run test --workspace=packages/core`
   - If tests fail, investigate or rollback
4. **Test the app**: Run `npm run dev` and verify everything works
5. **Commit**: Group related updates or commit individually for major changes

## Package Categories

### Safe to Update (patch/minor)
- `zod`, `hono`, `date-fns`, `clsx`, `tailwind-merge`
- `@tanstack/react-query`, `react-hook-form`
- `lucide-react`, `sonner`

### Check Changelogs First (minor/major)
- `react`, `react-dom` — check for breaking changes
- `vite` — check migration guide
- `tailwindcss` — check for config changes
- `drizzle-orm`, `drizzle-kit` — check migration guide
- `wrangler` — check Cloudflare changelog

### Be Careful With
- `@clerk/clerk-react`, `@clerk/backend` — auth changes can break login
- `typescript` — may introduce new strictness
- `@cloudflare/workers-types` — must match wrangler version

## Commands

```bash
# Check what's outdated
npm outdated

# Update specific package
npm install hono@latest

# Update all patch versions (safer)
npm update

# Check for security issues
npm audit

# Fix security issues automatically (when safe)
npm audit fix
```

## Commit Message Format

```
chore(deps): update [package] to [version]

- Brief note on why or any changes needed
```

## Example Workflow

```bash
npm outdated
# hono: 4.10.0 -> 4.11.0 (minor)

npm install hono@4.11.0
tsc --noEmit
npm run test --workspace=packages/core
npm run dev
# Test API endpoints manually

git add package.json package-lock.json
git commit -m "chore(deps): update hono to 4.11.0"
```
