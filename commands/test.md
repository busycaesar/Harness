---
description: Add tests for uncommitted changes made without written requirements: infer-requirements has the user confirm what the changes are meant to do, then write-test-plan plans the tests from that, update-tests writes them, and test-changes runs and triages them and meets the coverage threshold, reporting code failures instead of fixing the code. Only adds test code.
disable-model-invocation: true
metadata:
  model-tier: Mid
---

# Test: Uncommitted changes → Confirmed requirements → Tests

Add the tests the uncommitted code changes need, planned from what the user confirms the changes are meant to do. Only test code is added: the code is never fixed.

This command only conducts. It does none of the steps' work itself, does not edit their output files, and does not second-guess their results. Each skill's own rules apply while it runs, including its questions to the user.

## Step 1: Check

1. List the uncommitted code changes (see `.claude/rules/harness/project-files.md`), not test files. If there are none, or this is not a git repository, say so and stop.
2. Read the `project-commands` file (see `.claude/rules/harness/config.md`). If it is missing or holds no test command, say the project records no test command and stop.
3. Create a work item folder (see `.claude/rules/harness/work-items.md`).

## Step 2: Requirements

1. Invoke the `infer-requirements` skill with the work item folder. Let it run to completion, including all its questions to the user.
2. Take the requirements file path from its report. If it stops without writing one, stop here and report why.

## Step 3: Test plan and tests

1. Invoke the `write-test-plan` skill with the requirements file, which holds the requirements and the public units, and the work item folder. If it stops without writing a test plan, stop here and report why.
2. Invoke the `update-tests` skill with the test plan path from its report and the work item folder.

## Step 4: Run

Invoke the `test-changes` skill with the work item folder, the requirements file and `no-fix`. Let it run to completion and take its report.

## Step 5: Report

Report:

- the work item folder, with the paths of the requirements and each test plan;
- from `update-tests`: the tests written, changed and deleted, and any case not carried out, with why;
- from `test-changes`: the tests already failing; each test that fails because of the code, as its report gives it, unchanged; and the coverage against any threshold, with the tests added for it;
- the corrections and answers the user gave.
