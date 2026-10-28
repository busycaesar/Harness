---
description: Suggest a single commit message for the files already staged — never runs git add or git commit
disable-model-invocation: true
metadata:
  model-tier: Budget
---

# Commit (message suggestion for staged files only)

**Never run `git add` or `git commit` when this command is used — no matter how the request is phrased.** This command only hands the user a ready-to-run command as text. The user runs it.

Scope: only files already in the staging area. Do not look at unstaged or untracked files.

## Step 1: Gather the current state

Run (read-only):

```bash
git diff --cached --name-only
git diff --cached
git log --oneline -10
```

If nothing is staged, say so and stop — there is nothing to commit.

## Step 2: Write the commit message

- Follow the format of the recent commits from `git log` in Step 1. Only when they show no clear format, use `<type>(<scope>): <description>`, imperative mood, lowercase, no trailing period.
- Single-line title only — no body, unless the user has asked for more detail in this conversation.
- Staged files are treated as one commit — do not split them into multiple commits or suggest re-staging.

## Step 3: Output

Output exactly this and nothing else:

```bash
git commit -m "<message>"
```

No explanations, no summaries, no descriptions beyond the commit message itself. Do not run this command.
