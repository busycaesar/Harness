---
name: test
description: Test the uncommitted code changes. Runs the tests related to them, sorts out every failure (behaviour the requirements removed, already failing before the change, or broken by it and fixed), writes new tests in the project's own style until they pass, and meets the project's coverage threshold where one is recorded. Use when uncommitted changes need tests; with `run-only`, it only re-runs the related tests and reports failures. Does nothing when the project records no test command.
argument-hint: "[run-only] [requirements text or file] [starting diff file]"
metadata:
  model-tier: Frontier
---

# Test the change

Run, fix and write tests for the uncommitted code changes, so they leave with tests in the project's own style, no test broken by them, and the coverage threshold met where the project records one.

Changes test files, and changes code only to fix a test the change broke (Step 6); never changes behaviour just to make a new test pass. No git state changes: git is used read-only, `git archive` included.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Ask the user only where a step says to, with `AskUserQuestion`.

## Step 1: Input

Take from `$ARGUMENTS`, in any order:

- `run-only`: do Steps 2 to 4, then report only the tests run and each failure with its output. Change no file.
- **Requirements**: text, or a file holding them (requirements, spec or ticket). Without them, the changed code's own behaviour is the intent.
- **A starting diff**: a file holding a git diff of the changes that were already uncommitted before the work began. The original code is `HEAD` plus that diff; without one, it is `HEAD`.

## Step 2: Settings

1. Read the `project-commands` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/config/project-commands.yaml`. Take each section's `path` and its `test` entries (`all`, `file`, `name`, `coverage`); each runs from its `cwd`. If the file is missing or holds no test command, stop: do nothing and print nothing.
2. Read the `test-profile` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/config/test-profile.yaml`. Take each section's `related_tests` method and `coverage_threshold`. A missing file, section or entry, or `none found`, means no method or no threshold for that section.
3. Read the `project-rules` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/rules/project/`. Read `conventions/tests.md` in it when present.

## Step 3: Find the change

1. Outside a git repository, say so and stop.
2. List every uncommitted change with read-only git: staged, unstaged and untracked files.
3. Keep only code files, test files included. Drop docs, config, lockfiles, generated or vendored files and binaries. Deleted code files count only for finding related tests (Step 4).
4. If none is left, say there is no uncommitted code change and stop.
5. Each changed file belongs to the section whose `path` holds it most deeply.

## Step 4: Run the related tests

For each section with changed files and a test command:

- **Method `command`**: run it from its `cwd`, with `{files}` replaced by the section's changed files.
- **Method `naming`**: the tests are the changed test files plus the existing test files its patterns give for the changed source files. Run them with the `file` command, or with `all` when there is none.
- **No method**: run the `all` command.

If a method selects no test, run nothing for that section. Record each failing test with its output. With no failure, go to Step 7.

## Step 5: Expected failures

Only with requirements; without them, no failure is expected.

- A failing test that asserts behaviour a requirement deliberately changed or removed is expected: delete that test (its file only when nothing else is left in it) and note the requirement, quoted.
- If it is unclear whether a failing test checks behaviour the requirements changed, ask the user. Delete it if they say it is expected; otherwise it goes to Step 6.

## Step 6: Other failures

For each remaining failure:

1. **New test.** A test that does not exist in the original code was added by the change, so the change broke it: go to 4.
2. **Check the original code.** Once for all such failures, build a copy of the original code:
   - make a new temporary folder outside the project: the session's scratchpad when there is one, else the system temp folder;
   - extract `git archive HEAD` into it, then apply the starting diff, if given, with `git apply` inside the copy;
   - link into it, from the project, the installed dependency folders and local config files (such as git-ignored env files) the tests need; never reinstall, and never link build output or caches.

   Run each failing test in the copy with its section's command, from that `cwd` inside the copy. Remove the copy when done; removing it deletes the links, never what they point to.
3. **Result.** If it fails there too, it was already failing: leave it alone and report it. If it cannot run in the copy, ask the user whether the failure is new: if yes, go to 4; if no, it was already failing. If it passes there, the change broke it: go to 4.
4. **Fix the code.** Change the code, never the test, so the requirements (without them, the change's behaviour) still hold and the test passes. After each attempt, re-run that test and Step 4's tests. At most 3 attempts; undo the attempts that did not work, then report the test, each attempt and why it failed.
   - If the requirements and the test's behaviour contradict, so both cannot hold, ask the user which holds and follow the answer.

## Step 7: Write new tests

1. **Kinds and style.** Write only the kinds of test the project already has (unit, integration or both), placed, named and written as `conventions/tests.md` says, or else as the existing tests are. If the project has no tests and no `conventions/tests.md`, write none and report that.
2. **Scope.** Cover the behaviour of the changed code, not behaviour an existing test already covers.
3. **Proof.** Each test asserts behaviour. Never skip it, loosen it or mock away the code under test.
4. **Run.** Run the new tests with Step 4's tests until all pass:
   - a failure caused by the test itself (setup, an expectation no requirement states, or without requirements one the changed code does not show) is fixed in the test, without loosening it;
   - a failure caused by the code is handled as in Step 6.4.

## Step 8: Coverage

Only for a section with a recorded threshold; otherwise go to Step 9.

1. Without a `coverage` command, report that coverage could not be measured and go to Step 9.
2. Run the `coverage` command and read the result for what the threshold measures.
3. While it is below the threshold, add tests for uncovered code, the changed files first, following Step 7, and measure again.
4. If the threshold cannot technically be reached, stop and report what is left uncovered and why.

## Step 9: Report

Before reporting, confirm: no test was skipped or loosened, the copy is removed, and git state is unchanged.

Print only:

- the tests run per section, and how they were selected;
- each test deleted, with the requirement quoted;
- each test already failing;
- each test the change broke: fixed, with the files changed, or not fixed, with each attempt and why it failed;
- the new test files and the tests in each;
- per section with a threshold: the coverage measured against it, or what is left uncovered and why;
- the user's answers.
