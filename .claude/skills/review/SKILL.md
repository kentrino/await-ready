---
name: review
description: Review a PR and submit inline feedback via GitHub API. Use when reviewing pull requests.
argument-hint: "<pr-number>"
---

Review PR #$ARGUMENTS and submit inline feedback using the GitHub review API.
DO NOT repeat feedback that was already left in prior runs.

## Steps

### 1. Get the diff

Run `./scripts/gh-pr-diff $ARGUMENTS` to get the filtered diff
(lockfiles and generated files are already excluded by the script).

### 2. Load existing review comments (dedupe baseline)

Run:

```bash
gh api repos/{owner}/{repo}/pulls/$ARGUMENTS/comments --paginate
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

Write the review payload to `/tmp/review.json` using the Write tool, then submit it:

```json
{
  "event": "COMMENT",
  "body": "<summary>",
  "comments": [
    {
      "path": "<file>",
      "line": <line>,
      "body": "<!-- agent-review:finding:FINDING_ID -->\n<comment>"
    }
  ]
}
```

```bash
gh api repos/{owner}/{repo}/pulls/$ARGUMENTS/reviews \
  --method POST \
  --input /tmp/review.json
```

Submit as `COMMENT` (not `REQUEST_CHANGES`) so the review does not block the PR.
