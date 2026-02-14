---
name: commit
description: Run tests and commit changes. Use when the user asks to commit, save work, or says /commit.
---

Run tests, then commit the session's changes with a conventional commit message.

## Steps

### 1. Run tests

```bash
bun run test
```

If any check fails, fix the issues and re-run. Do NOT proceed to commit until all checks pass.

### 2. Check for changes

Run `git add --intent-to-add .` and `git diff -- . ':!bun.lock'` (staged + unstaged).
If there are no changes, inform the user and stop.

### 3. Commit

Write a conventional commit message based on the session's changes.

- Format: `type(scope): subject` — imperative mood, lowercase, no trailing dot, max 100 chars
- Add a body after a blank line only when the subject alone is not self-explanatory
- If unrelated changes exist, split into separate commits per logical unit of work
- Do NOT stage files that likely contain secrets (`.env`, credentials)

Examples:

- `fix(poll): handle timeout edge case when interval exceeds deadline`
- `ci(autofix): allow renovate[bot] in claude-code-action`
- `refactor: simplify AwaitReadyResult to plain string union`

Stage relevant files and commit using a HEREDOC. Run `git status` after to confirm.
