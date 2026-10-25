---
name: update-tests
description: Update the tests for the uncommitted code changes. Writes new tests for the changed code, of the kinds the project already has and in its own style; given tests for behaviour the requirements removed, deletes them; given uncovered lines, adds tests that cover them. Use when changed code needs its tests written, removed or extended. Changes test files only, and never loosens, skips or mocks away a test to make it pass.
argument-hint: "[requirements text or file] [tests to delete, each with its requirement] [uncovered lines]"
metadata:
  model-tier: Frontier
---

# Update the tests

Write, delete or extend tests for the uncommitted code changes, in the project's own style.

Changes test files only, never the code under test. No git state changes: git is used read-only.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`.

## Step 1: Input

Take from `$ARGUMENTS`, in any order:

- **Requirements**: text, or a file holding them (requirements, spec or ticket). Without them, the changed code's own behaviour is the intent.
- **Tests to delete**: each with its file and the requirement (or the user's answer) that removed or changed its behaviour, quoted.
- **Uncovered lines**: `path:line` ranges to cover.

With tests to delete, do Step 4 only. With uncovered lines, do Step 5. With neither, do Step 5 for the whole change.

## Step 2: Settings

1. Read the `project-commands` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/config/project-commands.yaml`. Take each section's `path` and `test` entries (`file`, `name`, `all`) and their `cwd`.
2. Read the `project-rules` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/rules/project/`. Read `conventions/tests.md` in it when present.

## Step 3: Find the change

List every uncommitted change with read-only git (staged, unstaged and untracked) and keep only code files. Outside a git repository, or with no uncommitted code change, say so and stop.

## Step 4: Delete

Delete each given test; delete its file only when nothing else is left in it. Delete nothing else.

## Step 5: Write

1. **Kinds and style.** Write only the kinds of test the project already has (unit, integration or both), placed, named and written as `conventions/tests.md` says, or else as the existing tests are. If the project has no tests and no `conventions/tests.md`, write none and report that.
2. **Scope.** Cover the given uncovered lines, or else the behaviour of the changed code that no existing test covers.
3. **Proof.** Each test asserts behaviour the requirements state, or without them the changed code shows. Never skip it, loosen it or mock away the code under test.
4. **Run.** Run each new test with its section's narrowest command (`name`, else `file`, else `all`), from its `cwd`:
   - a failure caused by the test itself (setup, or an expectation neither the requirements nor the changed code support) is fixed in the test, without loosening it;
   - a failure caused by the code is left as it is and reported.

## Step 6: Report

Before reporting, confirm no test was skipped, loosened or mocked away, and only test files changed.

Print only:

- each test deleted, with its requirement quoted;
- the new test files and the tests in each, with the lines or behaviour each covers;
- each new test that fails because of the code, with its output;
- that no test was written, and why, when none was.
