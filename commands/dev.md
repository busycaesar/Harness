---
description: Take requirements (a prompt, ticket description or requirements file) all the way to implemented, tested changes by running the write-spec, write-plan, implement-requirements and test-changes skills in order, then checking the changed code against the clean-code rules and testing the fixes.
argument-hint: <requirements text, path to a requirements file, or an existing work item folder to resume>
disable-model-invocation: true
metadata:
  model-tier: Frontier
---

# Dev: Requirements → Spec → Plan → Implementation → Tests → Clean code → Tests

Run the requirements in `$ARGUMENTS` through five skills, in this order, passing each one's output to the next:

1. `write-spec`: turns the requirements into a final, unambiguous spec.
2. `write-plan`: turns the spec into a plan of tasks grouped into waves.
3. `implement-requirements`: implements the plan and proves every requirement is met.
4. `test-changes`: runs the tests related to the change, has the code fixed where the change broke a test, and writes new tests.
5. `check-clean-code`: checks the changed code against the clean-code rules; `implement-requirements` then fixes the findings the user chooses, and `test-changes` runs again in full.

This skill only conducts. It does none of the steps' work itself, does not edit their output files, and does not second-guess their results. Each skill's own rules apply while it runs, including its questions to the user.

## Step 1: Take the input

- If `$ARGUMENTS` is empty, ask the user for the requirements.
- If `$ARGUMENTS` is an existing work item folder (inside the `work-items` path from `.claude/config/paths.yaml`, default `.claude/work-items/`), or a file inside one, resume that work item: see "Resuming".
- Otherwise, treat `$ARGUMENTS` as the requirements. If the project has uncommitted changes, save the starting diff to a temporary file outside the project, using read-only git: the output of `git diff HEAD --binary`, followed by `git diff --no-index --binary /dev/null <file>` for each untracked file `git ls-files --others --exclude-standard` lists. Then start at Step 2.

## Step 2: Spec

1. Invoke the `write-spec` skill with the requirements: the file path if one was given, otherwise the text exactly as the user wrote it.
2. Let it run to completion, including all its questions to the user.
3. Take the spec file path from its report. If a starting diff was saved, move it into the spec's work item folder as `starting-diff.patch`. Continue only when the spec's status is `final`. If the user stops before that, stop here and report where the spec was left.

## Step 3: Plan

1. Invoke the `write-plan` skill with the spec file path.
2. Let it run to completion, including any questions it asks.
3. Take the plan file path from its report. If it stops without writing a plan, stop here and report why.

## Step 4: Implement

1. Invoke the `implement-requirements` skill with the plan file path.
2. Let it run to completion, including any questions it asks.
3. Take its report.

## Step 5: Test

1. Invoke the `test-changes` skill with the spec file path and, if the work item folder has one, `starting-diff.patch`.
2. Let it run to completion, including any questions it asks.
3. Take its report. If it reports nothing, go on.

## Step 6: Clean code

1. Invoke the `check-clean-code` skill with no argument, so it checks all uncommitted changes.
2. Take the report path and the number of findings from its output. With no findings, go to Step 7.
3. Read the findings from the report and list them, one line each: rule, `path:line`, what is wrong. Ask the user with `AskUserQuestion` which to fix: all, some (they name which) or none.
4. Unless the answer is none, invoke the `implement-requirements` skill once with the chosen findings, each with its rule, `path:line` and description, and the work item folder. Let it run to completion. Do not run `check-clean-code` again.
5. If `implement-requirements` changed any file, invoke the `test-changes` skill again, as in Step 5, and take its report.

## Step 7: Report

Report:

- the work item folder, with the paths of the spec, plan and checklist;
- the files changed, created or deleted;
- how many checklist items are ticked out of the total, and any that could not be met, with why;
- from the first test report: the tests deleted with their requirement, the tests already failing, the tests the change broke and whether they were fixed, the new tests, and the coverage against any threshold;
- the clean-code report path, and any findings left unfixed (not chosen, or that `implement-requirements` could not fix), with why;
- from the second test report, after the fixes: the same items as from the first;
- the decisions the user made along the way.

## Resuming

Look inside the work item folder and start from the first step that is not finished:

| Folder contains | Start at |
| --------------- | -------- |
| no `spec.md` | Step 2 |
| `spec.md` with `Status: draft` | Step 2, passing the existing spec so it continues from its open questions |
| final `spec.md`, no `plan.md` | Step 3 |
| `plan.md`, checklist missing or not fully ticked | Step 4 (an existing checklist is reused, so ticked items stay ticked) |
| `plan.md`, every checklist item ticked | Step 5 (testing and the clean-code check leave nothing in the folder, so both run again) |

A resumed run never saves a starting diff; it uses the folder's `starting-diff.patch` when there is one. Tell the user which step you are resuming from before you start.
