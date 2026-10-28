---
name: draw-runbook
description: Draw a project's recorded run steps as an interactive HTML runbook — one tab per development way (route), each with every command in the order it must run, what each one starts, which ports it claims, how to tell it actually came up, and how to tear it down. Use when someone needs to get an unfamiliar project running, asks how to start it locally, wants the setup steps documented, or asks for a local-dev guide.
metadata:
  model-tier: Budget
---

# Runbook

Draw the project's recorded run steps as one self-contained HTML page.

Changes no file except the runbook itself. Never runs the project's commands: it starts nothing and stops nothing. Draws only what the run steps file records, and adds nothing to it.

## Step 1: Settings

Read the `runbook` and `run-steps` paths (see `.claude/rules/harness/config.md`). An existing runbook at that path is replaced.

## Step 2: Read the run steps

1. If the run steps file does not exist, invoke the `scan-run-steps` skill, then continue.
2. Read it. If it cannot be parsed, stop and report the parse error.

## Step 3: Draw it

1. Write the run steps file's content, unchanged, as JSON to a temporary file (see `.claude/rules/harness/temp-and-git.md`).
2. Run [build.sh](build.sh) from this skill's folder:

   ```
   bash <skill folder>/build.sh <data file> <runbook path>
   ```

   If it fails, report its error and stop.
3. Delete the temporary file.

## Step 4: Report

- The runbook's path, and that it opens in any browser.
- Per route: its name and its sequence in one line, step titles in order, parallel steps joined.
- Per route, every port it claims.
- Each step marked unverified, with what it rests on.
- Each thing in `unresolved`.
