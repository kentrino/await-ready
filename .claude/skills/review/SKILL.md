---
name: review
description: Review a PR and submit inline feedback via GitHub API. Use when reviewing pull requests.
---

Review the current PR and submit inline feedback using the GitHub review API.
DO NOT repeat feedback that was already left in prior runs.

## Steps

### 0. Identify the PR number

Determine the current PR number from the environment variable `$PR_NUMBER`,
or from `gh pr view --json number -q .number`.

### 1. Get the diff

Run `./scripts/gh-pr-diff <PR_NUMBER>` to get the filtered diff
(lockfiles and generated files are already excluded by the script).

### 2. Load existing review comments (dedupe baseline)

Run:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate
```

- Treat any comment containing `<!-- agent-review:finding:` as already reviewed.
- Extract all finding IDs into a set `alreadyReviewedFindingIds`.

### 3. Analyze the diff

Focus on:

- Correctness and potential bugs
- Security concerns
- Breaking changes
- Performance considerations
- Unnecessary state
- Inconsistent code
- Unnecessary complexity

Do NOT comment on:

- Style or formatting (handled by oxlint/oxfmt)
- Anything that is not actionable

Only leave comments where corrections are necessary. No compliments.

### 4. Submit a review with inline comments

For each NEW finding, generate a stable finding ID:
`FINDING_ID = "<path>|<symbol_or_function>|<category>|<short_slug>"`

If the `FINDING_ID` is in `alreadyReviewedFindingIds`, SKIP.

Submit a single review with all inline comments using the GitHub API:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/reviews \
  --method POST \
  -f event=COMMENT \
  -f body="<summary>" \
  --jsonc comments='[{"path":"<file>","line":<line>,"body":"<!-- agent-review:finding:FINDING_ID -->\n<comment>"}]'
```

Submit as `COMMENT` (not `REQUEST_CHANGES`) so the review does not block the PR.
