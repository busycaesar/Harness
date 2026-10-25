---
name: test-changes
description: Test the uncommitted code changes end to end. Runs the related tests, sorts every failure and gets the code fixed where the change broke a test, removes tests for behaviour the requirements removed, writes new tests in the project's own style until they pass, and meets the project's coverage threshold where one is recorded. Use when changes, made by hand or otherwise, need tests. Does nothing when the project records no test command.
argument-hint: "[requirements text or file] [starting diff file]"
metadata:
  model-tier: Frontier
---

# Test the changes

Leave the uncommitted code changes with tests in the project's own style, no test broken by them, and the coverage threshold met where the project records one.

This skill conducts `run-tests`, `triage-test-failures`, `implement-requirements`, `update-tests` and `check-coverage`. It changes no file itself, except to undo fix rounds that did not work (Step 4). Each skill's own rules apply while it runs, including its questions to the user. No git state changes: git is used read-only.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Ask the user only where a step says to, with `AskUserQuestion`.

## Step 1: Input

Take from `$ARGUMENTS`, in any order, and pass on to the skills that take them:

- **Requirements**: text, or a file holding them (requirements, spec or ticket).
- **A starting diff**: a file holding a git diff of the changes that were already uncommitted before the work began.

Read the `project-commands` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/config/project-commands.yaml`. If the file is missing or holds no test command, stop: do nothing and print nothing.

## Step 2: Run

Invoke `run-tests`. If it reports no uncommitted code change, report that and stop. With failures, do Step 4 for them, then go on.

## Step 3: Write tests

1. Invoke `update-tests` with the requirements.
2. Invoke `run-tests`. Every new test must pass; with failures, do Step 4 for them.

## Step 4: Handle failures

Used by Steps 2, 3 and 5, for the failing tests they hand over.

1. **Sort.** Invoke `triage-test-failures` with the failing tests, the requirements and the starting diff.
2. **Expected.** Invoke `update-tests` with those tests to delete, each with its requirement or the user's answer.
3. **Already failing.** Leave them alone.
4. **Broken by the change.** For each, read the test and the requirements. If they contradict, so both cannot hold, ask the user which holds. If the requirements hold, the test is expected: delete it as in 2, with the answer quoted. If the test holds, it goes to 5 with the answer.
5. **Fix.** Before the first round, copy every uncommitted file into a new temporary folder outside the project (the session's scratchpad when there is one, else the system temp folder). Then, at most 3 rounds:
   - invoke `implement-requirements` with the broken tests as findings: each with the rule "test broken by the change: change the code, never the test, so the requirements still hold and the test passes", the test's `path:line` and its output, plus the work item folder when the requirements are in one;
   - invoke `run-tests`. Tests still failing go to the next round; new failures go through 1 to 4 first.
6. **Undo.** If 3 rounds did not fix them, undo the rounds: restore each file they changed from the copy, or, for a file not in it, from `HEAD` with read-only `git show`; delete each file they created. Then report each test, each round and why it failed. Remove the copy when done.

## Step 5: Coverage

1. Invoke `check-coverage`. If it reports nothing, or met, or that coverage could not be measured, go to Step 6.
2. Otherwise, at most 3 rounds: invoke `update-tests` with the uncovered lines it reports and the requirements, then `run-tests` (failures go to Step 4), then `check-coverage` again.
3. If it is still not met, tell the user what is left uncovered and why it could not be reached.

## Step 6: Report

Before reporting, confirm every temporary copy is removed and git state is unchanged.

Print only:

- the tests run, and how they were selected;
- each test deleted, with the requirement or answer quoted;
- each test already failing;
- each test the change broke: fixed, with the files changed, or not fixed, with each round and why it failed;
- the new test files and the tests in each;
- per section with a threshold: the coverage measured against it, or what is left uncovered and why, or that it could not be measured;
- the user's answers.
