---
name: run-tests
description: Run the tests related to the uncommitted code changes, selected by the project's recorded related-tests method, or the full suite when none is recorded, and report which pass and which fail with each failure's output. Use when the tests touching uncommitted changes need running. Changes no file; does nothing when the project records no test command.
metadata:
  model-tier: Budget
---

# Run the related tests

Run the tests related to the uncommitted code changes and report which pass and which fail.

Changes no file. No git state changes: git is used read-only.

## Step 1: Settings

1. Read the `project-commands` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/config/project-commands.yaml`. Take each section's `path` and its `test` entries (`all`, `file`); each runs from its `cwd`. If the file is missing or holds no test command, stop: do nothing and print nothing.
2. Read the `test-setup` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/config/test-setup.yaml`. Take each section's `related_tests` method. A missing file, section or entry, or `none found`, means no method for that section.

## Step 2: Find the change

1. Outside a git repository, say so and stop.
2. List every uncommitted change with read-only git: staged, unstaged and untracked files.
3. Keep only code files, test files included. Drop docs, config, lockfiles, generated or vendored files and binaries. Deleted code files count only for finding related tests.
4. If none is left, say there is no uncommitted code change and stop.
5. Each changed file belongs to the section whose `path` holds it most deeply.

## Step 3: Run

For each section with changed files and a test command:

- **Method `command`**: run it from its `cwd`, with `{files}` replaced by the section's changed files.
- **Method `naming`**: the tests are the changed test files plus the existing test files its patterns give for the changed source files. Run them with the `file` command, or with `all` when there is none.
- **No method**: run the `all` command.

If a method selects no test, run nothing for that section.

## Step 4: Report

Print only:

- per section: the tests run, and how they were selected (the method, or the full suite);
- the tests that passed, by name or file;
- each failing test, with its file and its output.
