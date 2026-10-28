---
name: test-changes
description: Test the uncommitted code changes end to end. Runs the related tests, sorts every failure, gets the code fixed until every test the change broke passes again (or, with no-fix, only reports them), and meets the project's coverage threshold where one is recorded, by planning and writing the tests the under-covered requirements lack. Use when changes, made by hand or otherwise, must pass their tests. Writes no test from the code. Does nothing when the project records no test command.
argument-hint: "[starting diff file] [work item folder] [requirements or spec] [code plan or public units] [no-fix]"
metadata:
  model-tier: Frontier
---

# Test the changes

Leave the uncommitted code changes with every test they broke passing again, or reported when the code is not to be fixed, and the coverage threshold met where the project records one.

This skill conducts `run-tests`, `triage-test-failures`, `implement-requirements`, `check-coverage`, `write-test-plan` and `update-tests`. It changes no file itself, except to undo fix rounds that did not work (Step 3). Each skill's own rules apply while it runs, including its questions to the user.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Ask only where a step says to, with `AskUserQuestion`.

## Step 1: Input

Take from `$ARGUMENTS`, in any order:

- **A starting diff**: a file holding the starting diff (see `.claude/rules/harness/temp-and-git.md`), passed to `triage-test-failures`.
- **A work item folder**: passed to every skill that takes one. Without one, use the folder the first of them creates, from then on.
- **Requirements or a spec**, and **a code plan or a list of public units**: used only to map coverage gaps to requirements (Step 4), never to write or judge a test.
- **`no-fix`**: never change the code; the tests changed by this change are reported instead (Step 3).

Read the `project-commands` file (see `.claude/rules/harness/config.md`). If it is missing or holds no test command, stop: do nothing and print nothing.

## Step 2: Run

Invoke `run-tests`. If it reports no uncommitted code change, report that and stop. With failures, do Step 3 for them, then go on.

## Step 3: Handle failures

Used by Steps 2 and 4, for the failing tests they hand over.

1. **Sort.** Invoke `triage-test-failures` with the failing tests and the starting diff.
2. **Already failing.** Leave them alone.
3. **Changed by this change, with `no-fix`: report.** Change nothing; for each, record the test, its failure output and its likely cause in the changed code, and skip 4 and 5.
4. **Changed by this change, otherwise: fix.** Each must pass. Before the first round, copy every uncommitted file into a new temporary folder (see `.claude/rules/harness/temp-and-git.md`). Then, at most 3 rounds:
   - invoke `implement-requirements` with the tests as requirements: each "test `<name>` at `path:line` passes; change the code, never the test", with its output, plus the work item folder;
   - invoke `run-tests`. Tests still failing go to the next round; new failures go through 1 and 2 first.
5. **Undo.** If 3 rounds did not fix them, undo the rounds: restore each file they changed from the copy, or, for a file not in it, from `HEAD` with read-only `git show`; delete each file they created. Then report each test, each round and why it failed. Remove the copy when done.

## Step 4: Coverage

1. Invoke `check-coverage`. If it reports nothing, or met, or that coverage could not be measured, go to Step 5.
2. Otherwise, at most 3 rounds:
   - **Map.** Map each uncovered range to the requirement or unit it belongs to, from the code plan's task files and units, or the public units list, and the requirements. Where they do not settle it, or none were given, ask the user, listing the ranges; their answers are requirements too.
   - Invoke `write-test-plan` with the requirements, the code plan or public units when given, the work item folder and the mapped requirements and units as under-tested.
   - Invoke `update-tests` with the test plan it wrote and the work item folder.
   - Invoke `run-tests`; failures go to Step 3.
   - Invoke `check-coverage` again; met ends the rounds.
3. If it is still not met, tell the user what is left uncovered and why it could not be reached.

## Step 5: Report

Before reporting, confirm every temporary copy is removed and git state is unchanged.

Print only:

- the tests run, and how they were selected;
- each test already failing;
- each test changed by this change: fixed, with the files changed, or not fixed, with each round and why it failed; with `no-fix`, its failure and likely cause, and that running `implement-requirements` with these tests as requirements would fix the code;
- per section with a threshold: the coverage measured against it, the test plans and tests added for it, or what is left uncovered and why, or that it could not be measured;
- the answers the user gave.
