# Code Review

Review the current changes for issues before committing.

## Steps

1. **List changes**: Run `git status` and `git diff` to see all modifications
2. **Check for secrets**: Scan for accidentally added secrets:
   - `.env` files (should be gitignored)
   - API keys, tokens, or credentials in code
   - Clerk keys (`pk_live_*`, `sk_live_*`)
   - Database connection strings
3. **Run typecheck**: `tsc --noEmit` to catch type errors
4. **Run tests**: `npm run test --workspace=packages/core` if core logic changed
5. **Review patterns**: Check that changes follow stack conventions:
   - ESM imports (not CommonJS)
   - Zod validation on API inputs
   - Business logic in `packages/core`, not in API routes
   - No direct DB calls in `packages/core`
6. **Summarize findings**: List potential issues, risks, or suggestions

## Checklist

- [ ] No secrets or credentials in diff
- [ ] TypeScript compiles without errors
- [ ] Tests pass (if applicable)
- [ ] Follows existing code patterns
- [ ] No TODO comments left unaddressed
- [ ] Error handling is appropriate
- [ ] API responses use proper status codes

## Output Format

```markdown
## Review Summary

### Issues Found
- [severity] Description of issue

### Suggestions
- Description of improvement

### Files Reviewed
- path/to/file.ts - brief note
```
