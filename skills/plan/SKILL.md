---
name: plan
description: Plan how to implement technical requirements — a feature, change, ticket body, prompt or requirements file. Researches the codebase in depth, settles the technical approach, and writes a plan of file-specific tasks grouped into waves, where tasks in the same wave can run in parallel. Produces a plan document only; never writes code.
argument-hint: <requirements text or path to a requirements file>
---

# Plan: Requirements → Implementation Plan

Turn the requirements in `$ARGUMENTS` (or the requirements the user just gave) into a plan that can be carried out without making any further decisions. The plan says **how**: which files change, the shape of the code in them, in what order, and which work can run in parallel. Write no code.

The requirements can be in any form: a prompt, a ticket body, a document or a file.

## The one rule: never assume

Follow the never-assume rule in `.claude/rules/harness/never-assume.md` for every task and decision in the plan. Where the requirements are unclear in a way that changes the plan, ask; do not guess.

## Step 1: Set up the plan file

1. Read the `work-items` path from the harness config (`.claude/config/paths.yaml`). If the file or key is missing, use `.claude/work-items/`.
2. Pick the change folder:
   - If the requirements are a file already inside `<work-items>/<slug>/`, use that folder.
   - Otherwise choose a short kebab-case slug from the requirements' title or subject. If there is a ticket key, prefix it: `ABC-123-archive-jobs`.
3. The plan file is `<work-items>/<slug>/plan.md`. If it already exists, ask the user whether to update it or create a new one. Do not overwrite.
4. Read `max_parallel_tasks` from `.claude/config/settings.yaml`. If missing, use 4.

## Step 2: Understand the requirements

1. Read the requirements in full.
2. List them as numbered requirements. If the source already numbers them (`R1`, `R1.AC1`, …), reuse those IDs exactly. Otherwise assign `R1`, `R2`, … in the order they appear.
3. Look for gaps that **block planning**: behaviour you cannot plan without knowing, contradictions, undefined terms. Check the codebase first; ask the user only what it does not answer.
4. If the gaps are so many that most of the plan would be guesswork, tell the user the requirements are too ambiguous to plan, list the gaps, and stop.

## Step 3: Research the codebase in depth

For every requirement, find out:

- **Where the change lands**: the exact files, modules, components, endpoints or tables involved.
- **Patterns to follow**: how similar features are already built. The plan follows existing conventions.
- **Call sites and imports**: who uses the code that will change. This sets the order of the work and reveals knock-on changes.
- **Where new files belong**: next to their closest existing equivalent.
- **Tests**: where tests live and how they are written.
- **Project commands**: build, test and lint or type-check commands. Read the `project-commands` path from `.claude/config/paths.yaml` (if the key is missing, use `.claude/config/project-commands.yaml`) and take them from that file. Derive any it lacks, or all if it does not exist, from the project's rules, manifests such as `package.json` or `Makefile`, or CI config.

Record what matters under "Codebase context", each item with a `path:line` reference.

## Step 4: Settle the approach

Decide how each requirement will be built. The design follows the project's rules in `.claude/rules/`; where a rule decides a split, a signature or a placement, the Decision names that rule.

- **Decide yourself** when the codebase has one clear way of doing it. Record it as a Decision with the `path:line` you followed.
- **Ask the user** when the choice has real consequences:
  - adding a dependency;
  - designing or changing a public API, schema or data format;
  - several workable approaches with different trade-offs;
  - touching code or behaviour the requirements did not mention.

  Use the `AskUserQuestion` tool, give the concrete options, and say which you recommend and why. Record the answer as a Decision.

## Step 5: Break the work into tasks

1. **Contracts first.** Shared types, interfaces, schemas, API shapes or migrations that several pieces depend on become their own early tasks. Once they are fixed, the work that uses them can run in parallel.
2. **One task = one agent session.** A task is small enough for one agent to finish and check on its own.
3. **Tests live inside the task.** Each task writes or updates the tests for its own change, and "Done when" includes them passing. Add a final task for tests that span several tasks (integration or end-to-end), if the requirements need them.
4. **Design the units.** Decide whether the logic is a class, a set of functions or a module, and whether it gets its own file or goes into an existing one, and where. List every new or changed public or shared function, class or module as a unit: name, signature and a one-sentence responsibility. Private helpers and function bodies are not planned. A unit that another task uses has an exact name and signature, since tasks in the same wave run in parallel.
5. For each task, record everything in the template: wave, requirements covered, files with `(create)` or `(modify)`, units, dependencies, approach, and a checkable "Done when".

A task **owns** the files it lists. No other task in the same wave may touch them.

## Step 6: Group the tasks into waves

1. Build the dependency graph from each task's "Depends on".
2. Wave 1 holds the tasks with no dependencies. Each later wave holds the tasks whose dependencies are all in earlier waves.
3. Within a wave, no two tasks may depend on each other or share a file. If two tasks need the same file, merge them or move one to a later wave and add the dependency.
4. No wave may hold more than `max_parallel_tasks` tasks. Split an oversized wave into consecutive waves.
5. Draw the waves as the Mermaid diagram from the template, with one subgraph per wave and an arrow for every dependency, and fill in the wave table.

## Step 7: Self-check

Fix the plan until every item holds:

- [ ] Every requirement is covered by at least one task.
- [ ] Every task covers at least one requirement. Nothing is planned that the requirements did not ask for.
- [ ] Every file a task names was confirmed in the codebase, or is marked `(create)`.
- [ ] No dependency cycles. No task depends on a task in the same or a later wave.
- [ ] No two tasks in a wave share a file, and no wave exceeds `max_parallel_tasks`.
- [ ] Every task has a checkable "Done when".
- [ ] The design follows `.claude/rules/`.
- [ ] Every unit another task uses has an exact name and signature.
- [ ] Every decision says why, and who decided.

## Step 8: Save and report

Write the plan from [plan-template.md](plan-template.md) to `<work-items>/<slug>/plan.md`. Report the path, the number of tasks and waves, and any decisions the user made. Nothing else is produced: no code.
