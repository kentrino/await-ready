---
name: autofix
description: Diagnose CI failures on Renovate dependency-update PRs and auto-fix them.
---

Renovate updates dependency versions in `package.json` and `bun.lock`.
Sometimes these updates cause lint, format, type-check, or test failures.
This skill diagnoses the failures and applies the minimal fixes needed.

## Steps

### 1. Install dependencies

```bash
bun install
```

Use `bun install` (without `--frozen-lockfile`) — Renovate may have changed
`package.json` in a way that requires regenerating the lockfile.

### 2. Identify failures

Run the full check suite to see what's broken:

```bash
bun run test
```

This runs in parallel: `lint`, `format`, `knip`, `typecheck`, `unit`.
Read the output carefully and note **every** failure.

### 3. Auto-fix lint and format

```bash
bun run autofix
```

These auto-fix most lint and formatting issues.

### 4. Fix remaining issues

If typecheck (`tsc --noEmit`) or unit tests (`vitest run`) still fail:

1. Read the error messages carefully
2. Identify the root cause (changed API, renamed type, removed export, etc.)
3. Read the affected source files
4. Apply minimal, targeted fixes — do NOT weaken or skip checks
5. Re-run `bun run test` to verify **all** checks pass

Repeat until every check passes.

### 5. Verify build

```bash
bun run build
```

Ensure the project still builds successfully.

### 6. Commit

If there are changes:

```bash
git add -A
git commit -m "fix: auto-fix CI failures after dependency update"
```

Only commit if there are actual changes.
Use a descriptive commit message that mentions which kind of fix was applied
(e.g., lint, format, types).

Do NOT push — the workflow handles pushing in a separate step.
