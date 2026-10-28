---
name: infer-requirements
description: Work out what the uncommitted code changes are meant to do, and get the user to confirm it. Reads the changes with read-only git, drafts numbered requirements with Given/When/Then acceptance criteria describing the intended behaviour, asks the user whether they are the intended changes until they confirm, and lists the changed public units by declaration only. Use when changes were made without written requirements and their intent must be settled. Writes a requirements document only; changes no other file.
argument-hint: "[work item folder]"
metadata:
  model-tier: Frontier
---

# Infer requirements from the uncommitted changes

Turn the uncommitted code changes into requirements the user has confirmed: what the changes are meant to do, never how the code does it.

Writes only the requirements file. Read-only git only.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. The code shows what was done; only the user says what was meant.

## Step 1: Input

1. The folder is the work item folder in `$ARGUMENTS`; without one, create one as `.claude/rules/harness/work-items.md` says, but only once Step 2 finds a change.
2. The file is `requirements.md` in the folder if it has none, else the first of `requirements-2.md`, `requirements-3.md`, … that does not exist. Never edit an existing one.

## Step 2: Read the changes

1. Outside a git repository, say so and stop.
2. List the uncommitted code changes (see `.claude/rules/harness/project-files.md`). Test files do not count; deleted files do.
3. If there are none, say there is no uncommitted code change and stop, writing nothing.
4. Read them: `git diff HEAD` for tracked files, and each untracked file in full. Read the code around a change only as far as needed to see what it does for its callers.

## Step 3: Draft

1. **Requirements.** Number them `R1`, `R2`, … , each one behaviour the changes add, change or remove, stated as what must be true, never as code, files or approach. Each gets acceptance criteria (`R1.AC1`, …) in Given / When / Then form with an **observable** result: what a caller or user sees, returned, shown, stored or raised.
2. **Gaps.** Where the code does not settle the intent (a value that may be a placeholder, a branch that may be a bug, a behaviour removed without a replacement, a change that may or may not be meant to reach callers), do not draft a criterion from it: make it a question.
3. **Public units.** List each public unit the changes add, change or remove: exported, public or part of an entry point by the project's stated rule (its recorded conventions, an explicit export list), else, where none settles it, by its language's convention (e.g. no leading underscore in Python). Give its declaration line only, never its body, with its file and whether it is added, changed or removed.

## Step 4: Confirm

1. Show the user the requirements, one line each with their criteria, and the questions from Step 3. Ask whether these are the intended changes: with `AskUserQuestion` (yes, or some need correcting), plus the questions, grouped, up to 4 per call; otherwise as a numbered list.
2. Apply each correction and answer: rewrite, add or drop requirements and criteria so nothing the user overrode remains, and record it under "Corrections". An answer that is itself vague gets a follow-up before it is recorded.
3. Show the changed requirements and ask again. Repeat until the user confirms them as they stand, with no question left.

If the user stops before confirming, write nothing and report where it was left.

## Step 5: Save and report

Write the file from [requirements-template.md](requirements-template.md). Before reporting, confirm the file holds no code body and no question, and that no other file changed.

Report the file path, the number of requirements and public units, and the corrections the user made.
