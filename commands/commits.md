---
description: Group all changes NOT currently staged into multiple logical commits and output the git add / git commit commands — never runs them
disable-model-invocation: true
metadata:
  model-tier: Budget
---

# Commits (multiple commit plan for unstaged/untracked files)

**Never run `git add` or `git commit` when this command is used — no matter how the request is phrased.** This command's entire job is to hand the user ready-to-run commands as text. The user runs them.

Scope: only files that are **not** currently staged (modified-but-unstaged, and untracked files). Do not touch or re-group anything already in the staging area. If a file has both staged and unstaged changes, only consider its unstaged portion.

## Step 1: Gather the current state

Run (read-only):

```bash
git status
git diff
git log --oneline -10
```

If there are no unstaged or untracked changes, say so and stop.

## Step 2: Group changes into commits

- One logical unit of work per commit. A single fix/feature spanning several files (e.g. a function change plus its call sites) is still ONE commit — never split one logical change across commits just because it touches multiple files.
- Only combine genuinely unrelated changes into one commit when forced to by both touching the same file in a way that can't be cleanly separated.
- Never assign the same file to more than one commit.
- This command only outputs commands — it does not edit files. If a single file's changes really belong to two different logical commits, assign the whole file to whichever commit it's more associated with rather than trying to split its content.
- If every changed/untracked file under a directory belongs to the same commit, add that directory's path once instead of listing each file inside it individually.

## Step 3: Write commit messages

- Format: `<type>(<scope>): <description>`, imperative mood, lowercase, no trailing period.
- Single-line title only — no body, unless the user has asked for more detail in this conversation.
- Match the style of recent commits from `git log` in Step 1.

## Step 4: Output

For each commit, in order, output exactly this and nothing else:

```bash
git add <file1> <file2> ...
git commit -m "<message>"
```

Each command stays on its own single line — no line break inside a command (e.g. `git add` listing many paths must not be wrapped across multiple lines); a new line only starts the next command.

No explanations, no summaries, no descriptions beyond the commit message itself. Do not run any of these commands.
