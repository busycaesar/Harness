---
name: triage-test-failures
description: Sort a list of failing tests into expected (they test behaviour the requirements removed or changed), already failing (they also fail on the original code) and broken by the change (they pass on the original code), running each unexplained failure against a temporary copy of the original code. Use when failing tests must be told apart before anything is fixed. Reports only: changes no project file.
argument-hint: "<failing tests> [requirements text or file] [starting diff file]"
metadata:
  model-tier: Frontier
---

# Triage test failures

Sort each failing test by why it fails, so only the failures the change caused get fixed.

Changes no project file. No git state changes: git is used read-only, `git archive` included.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Ask the user only where a step says to, with `AskUserQuestion`.

## Step 1: Input

Take from `$ARGUMENTS`, in any order:

- **Failing tests** (required): each with its file and, when given, its output. With none, say so and stop.
- **Requirements**: text, or a file holding them (requirements, spec or ticket). Without them, no failure is expected unless the user says so (Step 2).
- **A starting diff**: a file holding a git diff of the changes that were already uncommitted before the work began. The original code is `HEAD` plus that diff; without one, it is `HEAD`.

Read the `project-commands` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/config/project-commands.yaml`. Take each section's `path` and `test` entries (`file`, `name`, `all`) and their `cwd`. Each test belongs to the section whose `path` holds its file most deeply.

## Step 2: Expected

- **With requirements:** a failing test that asserts behaviour a requirement deliberately changed or removed is expected; note the requirement, quoted. If it is unclear whether it does, ask the user: expected if they say so, otherwise it goes to Step 3.
- **Without requirements:** nothing is expected here. A failure that Step 3 finds passing on the original code is asked about instead: if the user says the change in behaviour is intended, it is expected, with their answer quoted.

## Step 3: Check the original code

1. **New test.** A test that does not exist in the original code was added by the change: it is broken by the change.
2. **Copy.** Once for all other failures, build a copy of the original code:
   - make a new temporary folder outside the project: the session's scratchpad when there is one, else the system temp folder;
   - extract `git archive HEAD` into it, then apply the starting diff, if given, with `git apply` inside the copy;
   - link into it, from the project, the installed dependency folders and local config files (such as git-ignored env files) the tests need; never reinstall, and never link build output or caches.
3. **Run.** Run each failing test in the copy with its section's narrowest command (`name`, else `file`, else `all`), from that `cwd` inside the copy.
4. **Sort.**
   - Fails there too: already failing.
   - Passes there: broken by the change (without requirements, ask first as in Step 2).
   - Cannot run in the copy: ask the user whether the failure is new. Yes: broken by the change. No: already failing.
5. **Clean up.** Remove the copy. Removing it deletes the links, never what they point to.

## Step 4: Report

Before reporting, confirm the copy is removed and git state is unchanged.

Print only, each test with its file:

- **expected**: with the requirement or the user's answer, quoted;
- **already failing**: with its output on the original code;
- **broken by the change**: with its output, and whether it is new or passed on the original code;
- the user's answers.
