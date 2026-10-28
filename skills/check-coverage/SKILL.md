---
name: check-coverage
description: Check the project's recorded coverage threshold against the uncommitted code changes. Runs the recorded coverage command, measures the way the threshold defines it, and reports met or not met with the uncovered lines in the changed code. Use when a change must meet the project's coverage threshold. Reports only: changes no file; does nothing when no threshold is recorded.
metadata:
  model-tier: Mid
---

# Check coverage

Measure coverage where the project records a threshold, and report whether it is met and what is left uncovered.

Changes no file.

## Step 1: Settings

1. Read the `test-setup` file (see `.claude/rules/harness/config.md`). Take each section's `path` and `coverage_threshold`: its value, what it measures and over what. A missing file, section or entry, or `none found`, means no threshold. With no threshold in any section, stop: do nothing and print nothing.
2. Read the `project-commands` file (see `.claude/rules/harness/config.md`). Take each section's `test` `coverage` entry and its `cwd`.

## Step 2: Find the change

List the uncommitted code changes (see `.claude/rules/harness/project-files.md`), not test files. Each belongs to its section (see `.claude/rules/harness/project-sections.md`). Outside a git repository, say so and stop.

## Step 3: Measure

For each section with a threshold:

1. Without a `coverage` command, record that coverage could not be measured.
2. Otherwise run it from its `cwd`, and read from its result the value the threshold measures, over what it measures (the whole project, each file, given paths).
3. Read the uncovered lines in the section's changed files from the same result.

## Step 4: Report

Print only, per section with a threshold:

- the threshold, what it measures and its source;
- the value measured and **met** or **not met**, or that it could not be measured and why;
- the uncovered lines in the changed files, as `path:line` ranges;
- when not met and the changed files are fully covered: the files whose uncovered lines keep it below the threshold.
