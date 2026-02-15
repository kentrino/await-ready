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

- **Command fails or empty output** → No PR exists. Proceed to Step 2 (Create).
- **state = OPEN** → PR already exists. Proceed to Step 2 (Update).
- **state = CLOSED** → PR is closed. Report this to the user. Done.
- **state = MERGED** → PR is already merged. Report this to the user. Done.

## Step 2: Create or update a PR

### 2a. Push commits

```bash
git push -u origin HEAD
```

### 2b. Gather commit information

```bash
gh pr view --json commits | jq -r '.commits[] | "\(.oid[:8])  \(.messageHeadline)"'
```

### 2c. Generate PR title and body

From the commit list:

- Pick the **most important/representative commit** as the PR title base
- Write the title in imperative mood, concise (under 72 chars)
- Generate a PR body summarizing all commits — group related changes if applicable
- Write both title and body in English

### 2d. Create or update the PR

If **no PR exists**, create one:

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

If **PR is already open**, update the title and body:

```bash
gh pr edit --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

Report the PR URL to the user.
