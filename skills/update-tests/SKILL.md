---
name: update-tests
description: Carry out a test plan — write, change and delete tests exactly as the plan says, in the project's own style. Never reads the code under test, only the public names and signatures the plan gives and the existing test files; does not run the tests against the code, only checks that its own tests are well-formed. Use when a test plan needs turning into tests. Changes test files only, and never loosens, skips or mocks away a test.
argument-hint: "<test plan path> [work item folder]"
metadata:
  model-tier: Frontier
---

# Update the tests

Write, change and delete the tests a test plan names, exactly as it says, in the project's own style.

Changes test files only. Never reads the body of any code under test: only the test plan, the existing test files and, when the plan omits a unit's import path or signature, that unit's declaration.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Where the plan leaves a case open, ask; never fill it in from the code.

## Step 1: Input

Take from `$ARGUMENTS`: a test plan, and optionally a work item folder. Given only a folder, the plan is its highest-numbered `test-plan*.md`. With no plan, say so and stop.

## Step 2: Settings

1. Read the `project-rules` path (see `.claude/rules/harness/config.md`) and `conventions/tests.md` in it, when present.
2. Read the `project-commands` file (see `.claude/rules/harness/config.md`): each section's `path` and its `typecheck`, `build` and `lint` commands, with their `cwd`.

## Step 3: Carry out the plan

Do what the plan says and nothing else:

1. **Delete** each test it marks delete; delete its file only when nothing else is left in it.
2. **Change** each test it marks change, so it asserts the result the plan gives.
3. **Write** each case, in its file, through the unit it names, asserting the result it names. Place, name and write it as `conventions/tests.md` says, else as the existing tests in that file or folder are.

Never weaken a test (see `.claude/rules/harness/proofs.md`).

## Step 4: Check the tests are well-formed

Do not run the tests: the code they test may not exist yet. For each test file changed or created, check it with its section's `typecheck`, else `build`, else `lint` command when one is recorded, else by reading it against the project's existing tests.

- An error in the test's own setup (syntax, a test helper or fixture, its own imports) is fixed in the test, without loosening it.
- An error that comes only from code the plan names but that does not exist yet is expected: leave it and report it.

## Step 5: Report

Before reporting, confirm no test was weakened and only test files changed.

Print only:

- the plan's path;
- each test deleted and changed, with its file;
- the test files created or changed, and the cases in each;
- the errors left because the planned code does not exist yet;
- each case not carried out, and why.
