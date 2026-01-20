# Create Pull Request

Create a pull request for the current changes.

## Steps

1. **Review changes**: Run `git diff` to see staged and unstaged changes
2. **Run checks**: Execute `tsc --noEmit` and `npm run test --workspace=packages/core` if core was modified
3. **Stage files**: Add relevant files with `git add` (exclude `.env*`, secrets, `.wrangler/`)
4. **Write commit message**: Based on what changed, write a clear commit message focused on "why"
5. **Commit**: `git commit -m "message"`
6. **Push**: `git push -u origin HEAD`
7. **Create PR**: Use `gh pr create` with a descriptive title and body

## PR Body Format

```markdown
## Summary
- Brief description of changes (1-3 bullets)

## Test Plan
- [ ] Ran `npm run dev` and tested locally
- [ ] Ran typecheck (`tsc --noEmit`)
- [ ] Ran tests if applicable
```

## Requirements

- GitHub CLI (`gh`) must be installed and authenticated
- Run `gh auth login` if not authenticated

## Example

```bash
git add apps/api/src/routes/users.ts packages/core/src/validators.ts
git commit -m "Add user validation to registration endpoint"
git push -u origin HEAD
gh pr create --title "Add user validation" --body "## Summary\n- Add Zod schema for user registration\n- Validate input in /api/users/register endpoint"
```
