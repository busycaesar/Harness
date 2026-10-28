---
name: triage-test-failures
description: Sort a list of failing tests, by fact only, into already failing (they also fail on the original code) and changed by this change (they pass on the original code, or the change added them), running each against a temporary copy of the original code. Use when failing tests must be told apart before anything is fixed. Reports only: changes no project file.
argument-hint: "<failing tests> [starting diff file]"
metadata:
  model-tier: Frontier
---

# Triage test failures

Sort each failing test by whether it fails on the original code too, so the failures the change caused are told apart from those that were already there.

Changes no project file. `git archive` is read-only git.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Ask the user only where a step says to, with `AskUserQuestion`.

## Step 1: Input

Take from `$ARGUMENTS`, in any order:

- **Failing tests** (required): each with its file and, when given, its output. With none, say so and stop.
- **A starting diff**: a file holding the starting diff (see `.claude/rules/harness/temp-and-git.md`). The original code is `HEAD` plus that diff; without one, it is `HEAD`.

Read the `project-commands` file (see `.claude/rules/harness/config.md`). Take each section's `path` and `test` entries (`file`, `name`, `all`) and their `cwd`. Each test belongs to its file's section (see `.claude/rules/harness/project-sections.md`).

## Step 2: Check the original code

1. **New test.** A test that does not exist in the original code was added by the change: it is changed by this change.
2. **Copy.** Once for all other failures, build a copy of the original code:
   - make a new temporary folder (see `.claude/rules/harness/temp-and-git.md`);
   - extract `git archive HEAD` into it, then apply the starting diff, if given, with `git apply` inside the copy;
   - link into it, from the project, the installed dependency folders and local config files (such as git-ignored env files) the tests need; never reinstall, and never link build output or caches.
3. **Run.** Run each failing test in the copy with its section's narrowest test command (see `.claude/rules/harness/project-sections.md`), from that `cwd` inside the copy.
4. **Sort.**
   - Fails there too: already failing.
   - Passes there: changed by this change.
   - Cannot run in the copy: ask the user whether the failure is new. Yes: changed by this change. No: already failing.
5. **Clean up.** Remove the copy. Removing it deletes the links, never what they point to.

## Step 3: Report

Before reporting, confirm the copy is removed and git state is unchanged.

Print only, each test with its file:

- **already failing**: with its output on the original code;
- **changed by this change**: with its output, and whether it is new or passed on the original code;
- the user's answers.
