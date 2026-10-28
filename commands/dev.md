---
description: Take requirements (a prompt, ticket description or requirements file) all the way to implemented, tested changes: write-spec, then write-plan, then implement-requirements alongside write-test-plan and update-tests, then test-changes, then a clean-code check, its fixes (code by implement-requirements, tests by write-test-plan and update-tests) and a last test-changes pass.
argument-hint: <requirements text, path to a requirements file, or an existing work item folder to resume>
disable-model-invocation: true
metadata:
  model-tier: Frontier
---

# Dev: Requirements → Spec → Plan → Code and tests → Test → Clean code → Test

Run the requirements in `$ARGUMENTS` through these skills, passing each one's output on:

1. `write-spec`: turns the requirements into a final, unambiguous spec.
2. `write-plan`: turns the spec into a plan of the code change, in tasks grouped into waves.
3. Two streams at once: `implement-requirements` writes the code from the plan; `write-test-plan` plans the tests from the spec, then `update-tests` writes them.
4. `test-changes`: runs the related tests, has the code fixed until every test the change broke passes, and meets the coverage threshold.
5. `check-clean-code`: checks the changed code against the clean-code rules; of the findings the user chooses, `implement-requirements` fixes those in code files and `write-test-plan` then `update-tests` those in test files, and `test-changes` runs again.

This skill only conducts. It does none of the steps' work itself, does not edit their output files, and does not second-guess their results. Each skill's own rules apply while it runs, including its questions to the user.

## Step 1: Take the input

- If `$ARGUMENTS` is empty, ask the user for the requirements.
- If `$ARGUMENTS` is an existing work item folder (inside the `work-items` path; see `.claude/rules/harness/config.md`), or a file inside one, resume that work item: see "Resuming".
- Otherwise, treat `$ARGUMENTS` as the requirements. Create a work item folder (see `.claude/rules/harness/work-items.md`). If the project has uncommitted changes, save the starting diff (see `.claude/rules/harness/temp-and-git.md`) in it as `starting-diff.patch`. Then start at Step 2.

## Step 2: Spec

1. Invoke the `write-spec` skill with the work item folder and the requirements: the file path if one was given, otherwise the text exactly as the user wrote it.
2. Let it run to completion, including all its questions to the user.
3. Take the spec file path from its report. Continue only when the spec's status is `final`. If the user stops before that, stop here and report where the spec was left.

## Step 3: Plan

1. Invoke the `write-plan` skill with the spec file path and the work item folder.
2. Let it run to completion, including any questions it asks.
3. Take the plan file path from its report. If it stops without writing a plan, stop here and report why.

## Step 4: Code and tests

Run two streams in parallel and wait for both to finish:

- **Code.** Invoke the `implement-requirements` skill with the plan file path and the work item folder.
- **Tests.** Invoke the `write-test-plan` skill with the spec file path, the plan file path and the work item folder. Then invoke the `update-tests` skill with the test plan path from its report and the work item folder. If `write-test-plan` stops without writing a test plan, take its report and end this stream.

Let each run to completion, including any questions it asks, and take their reports.

## Step 5: Test

1. Invoke the `test-changes` skill with the work item folder, the spec and plan file paths, and, if the folder has one, `starting-diff.patch`.
2. Let it run to completion and take its report. If it reports nothing, go on.

## Step 6: Clean code

1. Invoke the `check-clean-code` skill with no argument, so it checks all uncommitted changes.
2. Take the report path and the number of findings from its output. With no findings, go to Step 7.
3. Read the findings from the report and list them, one line each: rule, `path:line`, what is wrong. Ask the user with `AskUserQuestion` which to fix: all, some (they name which) or none.
4. Unless the answer is none, split the chosen findings into those in test files and those in code files. Pass each finding with its rule, `path:line` and description, and the work item folder. Let each skill run to completion. Do not run `check-clean-code` again.
   - **Code files.** Invoke the `implement-requirements` skill once with these findings as requirements.
   - **Test files.** Invoke the `write-test-plan` skill with these findings as what to change, then the `update-tests` skill with the test plan path from its report. If `write-test-plan` stops without writing a test plan, take its report.
5. If any of them changed a file, invoke the `test-changes` skill again, as in Step 5, and take its report; every test the fixes broke must pass again.

## Step 7: Report

Report:

- the work item folder, with the paths of the spec, plan, test plans and each checklist written;
- the files changed, created or deleted, code and tests apart;
- per checklist, how many items are ticked out of the total, and any that could not be met, with why;
- from `update-tests`: the tests written, changed and deleted, and any case not carried out, with why;
- from the first test report: the tests already failing, the tests the change broke and whether they were fixed, and the coverage against any threshold, with the tests added for it;
- the clean-code report path, and any findings left unfixed (not chosen, or that `implement-requirements`, `write-test-plan` or `update-tests` could not fix), with why;
- from the second test report, after the fixes: the same items as from the first;
- the decisions the user made along the way.

## Resuming

Look inside the work item folder and start from the first step that is not finished:

| Folder contains | Start at |
| --------------- | -------- |
| no `spec.md` | Step 2 |
| `spec.md` with `Status: draft` | Step 2, passing the existing spec so it continues from its open questions |
| final `spec.md`, no `plan.md` | Step 3 |
| `plan.md` | Step 4 (both streams run afresh: `implement-requirements` with a new checklist, building on the code as it stands, and `write-test-plan` with a new test plan; testing and the clean-code check then run again) |

A resumed run uses that folder as the work item folder and never creates one. It never saves a starting diff; it uses the folder's `starting-diff.patch` when there is one. Tell the user which step you are resuming from before you start.
