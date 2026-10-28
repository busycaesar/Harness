---
name: implement-requirements
description: Implement technical requirements — a prompt, ticket body, spec, plan, list of findings or failing tests — by changing the project's code files until every requirement is proven met. Writes no tests. Each run is a new, independent request: it builds a new verification checklist from the requirements first, then implements and ticks each item off with evidence. Use when code must change to meet stated requirements or fix stated problems; with none given, it changes nothing.
argument-hint: "<requirements text, or path to a requirements, spec, plan or findings file> [work item folder]"
metadata:
  model-tier: Frontier
---

# Implement: Requirements → Working Changes

Implement what `$ARGUMENTS` (or the user's message) asks for. The job is done when every item on the verification checklist is ticked with evidence, not when the code looks finished.

Every run is a new, independent request. Nothing from an earlier run is reused: not its checklist, its ticks or its notes. The code as it stands is the starting point.

## Rules

- Follow the never-assume rule in `.claude/rules/harness/never-assume.md`, before and during the work: when something is unclear mid-way, stop and ask.
- Change code files only. Write, change or delete no test and no test file.
- Change only what the requirements need. No unrelated refactors, renames or clean-ups. Failures or problems that exist outside the change are reported, not fixed.
- Add no dependency the requirements or plan do not name. If one seems needed, or a named one cannot be installed, ask the user; never substitute a similar one.
- Do not edit the requirements, spec or plan you were given, or any earlier checklist.

## Step 1: Identify the input

The input is what needs adding or changing in the code, in any form:

- **Requirements**: a prompt, ticket body, spec or requirements file.
- **A plan**: a document of tasks grouped into waves, which points to its source requirements (a `Requirements:` line, or the requirements pasted inside it).
- **Problems to fix**: findings or failing tests, each with a `path:line` and what is wrong, and any rule it must follow. Each problem becomes one or more requirements, stating what must be true once it is fixed.

It may also name a work item folder.

If the input is empty or holds none of these, stop and report that nothing was given. Change nothing.

If it is a plan, find its source requirements. If a plan does not say where its requirements are, ask the user.

## Step 2: Build the checklist

1. The folder is the work item folder the input names; without one, create one as `.claude/rules/harness/work-items.md` says.
2. Invoke the `write-checklist` skill with the **requirements**, never the plan, and the folder: pass the requirements file path, or the requirements text, plus any unit names the requirements or the user's message already give.
3. If it reports requirements that need clarification, ask the user about each one. Then invoke `write-checklist` again with the requirements plus a `Clarifications:` section holding the user's answers. Repeat until it writes a checklist.
4. Read the checklist it wrote in full before changing any code.

### Checklist rules

- Work only on the checklist this run wrote.
- Tick an item only after carrying out its proof and recording the evidence (the command and its output, or what the inspection found).
- Never add, remove or reword items.
- If an item cannot be met, leave it unticked, write the reason in its evidence, and tell the user.

## Step 3: Understand the codebase

Before changing anything, read the code the change touches: where it lands, the patterns similar features follow, and who calls the code that will change. Follow the project's rules in `.claude/rules/` and its existing conventions.

## Step 4: Implement

### With a plan

1. Read `max_parallel_tasks` (see `.claude/rules/harness/config.md`).
2. Work through the waves in order. Start no wave until the previous one is complete.
3. In each wave, launch one subagent per task with the `Agent` tool, all in a single message so they run in parallel, at most `max_parallel_tasks` at a time. All subagents work in the project folder directly. Give each one:
   - the task: its approach, files, units and "Done when";
   - the requirements and checklist items it covers, quoted in full;
   - the patterns it must follow, and the project's rules in `.claude/rules/`;
   - how to build: the units exactly as named and signed, writing their bodies, private helpers and error handling itself;
   - these limits: edit only the files the task lists; if another file must change, or a unit another task uses must change, stop and report back instead; report any other change to a unit; write no tests; launch no subagents; no git operations; do not tick checklist items;
   - the report to return: a status of `done`, `blocked` or `needs context`, the files changed, and any concerns or what is missing.
4. When the wave finishes, treat each report as a claim: read the changed files and confirm each task's "Done when" yourself. For `blocked` or `needs context`, supply what is missing from the codebase or the user, then re-run the task; never re-run it unchanged. Fix or re-run any task that fell short before moving on.
5. If the plan turns out to be wrong (a file is not where it says, a dependency is missing), adapt the work to the codebase and note the deviation for the final report. If the deviation changes behaviour the requirements describe, ask the user. A planned unit that proves wrong may be fixed locally and reported; if the fix changes a unit another task uses, ask the user first.

### Without a plan

Implement the requirements in whatever order the code calls for: shared pieces first, then the code that uses them. You may hand independent pieces to parallel subagents, as above, only when they change completely separate files.

## Step 5: Prove every item

Go through the checklist item by item:

1. Carry out the item's proof: run the named command or inspect the code. If the proof describes a unit by what it does, resolve it to the unit you wrote and record that unit's name in the evidence.
2. If it passes, record the evidence and tick it.
3. If it fails, fix the implementation and run the proof again, never weakening it (see `.claude/rules/harness/proofs.md`).
4. If the same item still fails after three fix attempts, stop fixing it: treat it as an item that cannot be met (see "Checklist rules") and move on.

Run only what the proofs need, and never a test: running the project's tests, or a build or lint no proof names, is outside this skill's scope.

Repeat until every item is ticked, or the only unticked items are ones that cannot be met and the user has been told why.

## Step 6: Self-check, then report

Before reporting, confirm and fix any miss:

- every ticked item has recorded evidence from its proof;
- every changed file traces to a requirement or a plan task, and none is a test file;
- the changed code holds no placeholder, stub or `TODO` that leaves a requirement unmet;
- no proof was weakened (see `.claude/rules/harness/proofs.md`).

Report:

- the files changed, created or deleted;
- the checklist path and how many items are ticked out of the total;
- any items that could not be met, and why;
- any deviations from the plan, problems found outside the change, and the decisions the user made along the way.
