---
name: pr
description: Create or check GitHub pull requests for the current branch. Use when the user says "/pr", asks to create a PR, or wants to check PR status.
---

# Pull Request Workflow

## Step 1: Check PR status for current branch

Run the following shell command to determine the current PR state:

```bash
gh pr view --json number,state 2>/dev/null
```

Interpret the result:

- **Command fails or empty output** → No PR exists. Proceed to Step 2.
- **state = OPEN** → PR already exists. Report the PR number and URL to the user. Done.
- **state = CLOSED** → PR is closed. Report this to the user. Done.
- **state = MERGED** → PR is already merged. Report this to the user. Done.

## Step 2: Create a new PR

If no PR exists, follow these sub-steps:

### 2a. Gather commit information

Run:

```bash
gh pr view --json commits 2>/dev/null || git log --oneline origin/HEAD..HEAD
```

If `gh pr view` fails (no PR yet), use `git log` output instead.

### 2b. Generate PR title and body

From the commit list:

- Pick the **most important/representative commit** as the PR title base
- Write the title in imperative mood, concise (under 72 chars)
- Generate a PR body summarizing all commits — group related changes if applicable
- Write both title and body in **the same language as the commit messages** (Japanese commits → Japanese PR, English commits → English PR)

### 2c. Create the PR

Push the branch and create the PR:

```bash
git push -u origin HEAD
gh pr create --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

Report the created PR URL to the user.
