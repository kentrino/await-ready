---
name: autofix
description: Run all auto-fix commands (lint, format) and commit the changes if any.
---

Run the following auto-fix commands in order:

1. `bun run lint:fix`
2. `bun run format:fix`

After running all fix commands, check if there are any git changes.
If there are changes, create a commit with the message `fix: autofix lint and format`.
If there are no changes, do nothing.
