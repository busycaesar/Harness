---
name: implement
description: Implement technical requirements — a prompt, ticket body, spec or plan — by changing the project's files until every requirement is proven met. Always builds a verification checklist from the requirements first, then implements and ticks each item off with evidence. Changes files only; never stages, commits or runs other git operations.
argument-hint: <requirements text, or path to a requirements, spec or plan file>
---

# Implement: Requirements → Working Changes

Implement what `$ARGUMENTS` (or the user's message) asks for. The job is done when every item on the verification checklist is ticked with evidence, not when the code looks finished.

## Scope

- **Change files. Nothing else.** Do not stage, commit, stash, branch, reset, check out or run any other git operation that changes repository state. Read-only git commands (`git status`, `git diff`, `git log`) are fine.
- Change only what the requirements need. No unrelated refactors, renames or clean-ups.
- Do not edit the requirements, spec or plan you were given.

## The one rule: never assume

Where the requirements, the codebase and the user's answers do not settle something, ask the user. Do not fill gaps with defaults or "probably". If the user explicitly delegates a choice, make it and tell them what you chose.

## Step 1: Identify the input

The input is one of:

- **Requirements**: a prompt, ticket body, spec or requirements file.
- **A plan**: a document of tasks grouped into waves, which points to its source requirements (a `Requirements:` line, or the requirements pasted inside it).
- **Findings**: a list of problems in existing code, each with a rule, a `path:line` and what is wrong, optionally with the work item folder it belongs to.

If it is a plan, find its source requirements. If a plan does not say where its requirements are, ask the user.

If it is findings, follow "Fixing findings" instead of Steps 2 to 6.

## Step 2: Build the checklist

1. Invoke the `checklist` skill with the **requirements**, never the plan: pass the requirements file path, or the requirements text.
2. If it reports requirements that need clarification, ask the user about each one, using the `AskUserQuestion` tool where the answer has a few clear options. Then invoke `checklist` again with the requirements plus a `Clarifications:` section holding the user's answers. Repeat until it writes a checklist.
3. If it reports that a checklist already exists, use that one: this is a resumed run. Items already ticked stay ticked.
4. Read the checklist in full before changing any code.

### Checklist rules

- Tick an item only after carrying out its proof and recording the evidence (the test name and result, the command and its output, or what was observed).
- Never add, remove or reword items.
- If an item cannot be met, leave it unticked, write the reason in its evidence, and tell the user.

## Step 3: Understand the codebase

Before changing anything, read the code the change touches: where it lands, the patterns similar features follow, who calls the code that will change, and where tests live. Follow the project's rules in `.claude/rules/` and its existing conventions.

## Step 4: Implement

### With a plan

1. Read `max_parallel_tasks` from `.claude/config/settings.yaml`. If missing, use 4.
2. Work through the waves in order. Start no wave until the previous one is complete.
3. In each wave, launch one subagent per task with the `Agent` tool, all in a single message so they run in parallel, at most `max_parallel_tasks` at a time. All subagents work in the project folder directly. Give each one:
   - the task: its approach, files, units and "Done when";
   - the requirements and checklist items it covers, quoted in full;
   - the patterns it must follow, and the project's rules in `.claude/rules/`;
   - how to build: the units exactly as named and signed, writing their bodies, private helpers and error handling itself;
   - these limits: edit only the files the task lists; if another file must change, or a unit another task uses must change, stop and report back instead; report any other change to a unit; no git operations; do not tick checklist items.
4. When the wave finishes, confirm each task's "Done when" yourself. Fix or re-run any task that fell short before moving on.
5. If the plan turns out to be wrong (a file is not where it says, a dependency is missing), adapt the work to the codebase and note the deviation for the final report. If the deviation changes behaviour the requirements describe, ask the user. A planned unit that proves wrong may be fixed locally and reported; if the fix changes a unit another task uses, ask the user first.

### Without a plan

Implement the requirements in whatever order the code calls for: shared pieces first, then the code that uses them. You may hand independent pieces to parallel subagents, as above, only when they change completely separate files.

### Either way

- Write the tests the checklist's proofs call for, alongside the code, following the project's test conventions.
- When something is unclear mid-way, stop and ask the user. Do not guess and continue.

## Step 5: Prove every item

Go through the checklist item by item:

1. Carry out the item's proof: run the named test or command, check the behaviour, or inspect the code.
2. If it passes, record the evidence and tick it.
3. If it fails, fix the implementation and run the proof again. Never make a proof pass by weakening it: no skipped or deleted tests, no loosened assertions, no mocking away the thing under test.

Run only what the proofs need. Running the project's full test suite, build or lint is outside this skill's scope.

Repeat until every item is ticked, or the only unticked items are ones that cannot be met and the user has been told why.

## Fixing findings

1. Fix exactly the given findings and nothing else, reading the code around each first (Step 3 applies). Build no checklist; an existing one is never rewritten.
2. If the work item has a `checklist.md`, re-run every item's proof afterwards. If a fix breaks a proof or a requirement, undo it and leave that finding unfixed. Never weaken a proof.
3. Report the files changed, the findings fixed, any finding left unfixed with why, and each proof's result.

## Step 6: Report

Report:

- the files changed, created or deleted;
- the checklist path and how many items are ticked out of the total;
- any items that could not be met, and why;
- any deviations from the plan, and the decisions the user made along the way.
