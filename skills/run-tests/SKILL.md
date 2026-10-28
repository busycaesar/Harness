---
name: run-tests
description: Run the tests related to the uncommitted code changes, selected by the project's recorded related-tests method, or the full suite when none is recorded, and report which pass and which fail with each failure's output. Use when the tests touching uncommitted changes need running. Changes no file; does nothing when the project records no test command.
metadata:
  model-tier: Budget
---

# Run the related tests

Run the tests related to the uncommitted code changes and report which pass and which fail.

Changes no file.

## Step 1: Settings

1. Read the `project-commands` file (see `.claude/rules/harness/config.md`). Take each section's `path` and its `test` entries (`all`, `file`); each runs from its `cwd`. If the file is missing or holds no test command, stop: do nothing and print nothing.
2. Read the `test-setup` file (see `.claude/rules/harness/config.md`). Take each section's `related_tests` method. A missing file, section or entry, or `none found`, means no method for that section.

## Step 2: Find the change

1. Outside a git repository, say so and stop.
2. List the uncommitted code changes (see `.claude/rules/harness/project-files.md`), test files included. Deleted code files count only for finding related tests.
3. If there are none, say there is no uncommitted code change and stop.
4. Each changed file belongs to its section (see `.claude/rules/harness/project-sections.md`).

## Step 3: Run

For each section with changed files and a test command:

- **Method `command`**: run it from its `cwd`, with `{files}` replaced by the section's changed files.
- **Method `naming`**: the tests are the changed test files plus the existing test files its patterns give for the changed source files. Run them with the `file` command. Without a `file` command, skip this selection and run the `all` command.
- **No method**: run the `all` command.

If a method selects no test, run nothing for that section.

## Step 4: Report

Print only:

- per section: the tests run, and how they were selected (the method, or the full suite, and why the full suite);
- the tests that passed, by name or file;
- each failing test, with its file and its output.
