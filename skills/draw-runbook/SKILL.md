---
name: draw-runbook
description: Draw a project's recorded run steps as an interactive HTML runbook — every development way (route) with its commands in the order they must run, and whether each command blocks its terminal or returns the prompt. Use when someone needs to get an unfamiliar project running, asks how to start it locally, wants the setup steps documented, or asks for a local-dev guide.
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

The drawing belongs to `draw-architecture-map`. This skill only maps the run steps onto that skill's input shape, and defines no look of its own:

| Run steps                                                                   | Map data                                                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A step                                                                      | An entry in `files`, at `<route>/<step title>`, so each route is a box and each step a dot in it              |
| A step's `needs`                                                            | One pair in `imports` per id, as `[step, step it needs]`, so the arrow runs from the prerequisite to the step |
| A step with no `needs`                                                      | An entry in `entries`                                                                                         |
| The top-level part of each route name, in the order the routes are recorded | `tiers`, with `tierOf` mapping each part to itself                                                            |

Also set:

- `orientation` to `vertical`, so the routes stack top to bottom and each route's steps read left to right.
- `importLists` to `false`, so a step's panel shows only its details.
- `details`, keyed by each step's path, with exactly two items:
  - **Command:** the step's `command`, unchanged.
  - **Terminal:** `Blocking: keeps this terminal busy until you stop it, so run the next step in a new terminal.` when the step's `terminal` is `own`; otherwise `Non-blocking: returns the prompt, so the next command can run in this terminal.`

Everything else the run steps file records (ports, gates, checks, required settings, known failures, unverified parts, sources) goes in the report, not on the map.

Write this data to a temporary file (see `.claude/rules/harness/temp-and-git.md`), invoke the `draw-architecture-map` skill with it and the runbook path, then delete the temporary file. If the map skill reports an error, report it and stop.

## Step 4: Report

- The runbook's path, and that it opens in any browser.
- Per route: its name and its sequence in one line, step titles in order, parallel steps joined.
- Per route, every port it claims.
- Per step, its gate and how to check it came up, where recorded.
- Each step marked unverified, with what it rests on.
- Each thing in `unresolved`.
