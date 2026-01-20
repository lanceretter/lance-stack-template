# Fix GitHub Issue

Fetch a GitHub issue, implement a fix, and open a pull request.

## Usage

```
/fix-issue [issue-number]
```

## Steps

1. **Fetch issue details**: Run `gh issue view [number]` to get the issue title, body, and labels
2. **Analyze the issue**: Understand what needs to be fixed and where
3. **Find relevant code**: Search the codebase for related files
4. **Plan the fix**: Determine which files need changes
5. **Implement the fix**: Make the necessary code changes
6. **Test locally**: Run `npm run dev` and verify the fix works
7. **Run checks**: Execute `tsc --noEmit` and tests
8. **Create PR**: Commit, push, and open a PR that references the issue

## Branch Naming

Create a branch named after the issue:

```bash
git checkout -b fix/issue-[number]-brief-description
```

## PR Body Format

```markdown
## Summary
Fixes #[issue-number]

- Description of the fix

## Test Plan
- [ ] Reproduced the original issue
- [ ] Verified the fix resolves the issue
- [ ] Ran typecheck and tests
```

## Requirements

- GitHub CLI (`gh`) must be installed and authenticated
- Issue must exist in the repository

## Example

```bash
# Fetch issue
gh issue view 42

# Create branch
git checkout -b fix/issue-42-user-validation

# ... make changes ...

# Commit and PR
git add .
git commit -m "Fix user validation error on registration

Fixes #42"
git push -u origin HEAD
gh pr create --title "Fix user validation error" --body "Fixes #42\n\n## Summary\n- Added null check for email field\n- Updated Zod schema to handle edge case"
```
