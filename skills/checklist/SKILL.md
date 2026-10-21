---
name: checklist
description: Turn technical requirements into a verification checklist — one item per requirement or acceptance criterion, each with an objective proof of how to confirm it is met. Built from the requirements alone.
argument-hint: <requirements text or path to a requirements file>
user-invocable: false
context: fork
---

# Checklist: Requirements → Verification Checklist

Turn the requirements in `$ARGUMENTS` into a checklist that proves, item by item, that every requirement has been met. The checklist is written from the requirements alone, so that it judges the work by what was asked for, not by what was built.

## The one rule: never assume

Every item must trace to a specific requirement. Do not add items for things the requirements do not ask for, and do not soften or reinterpret what they do ask for. If a requirement cannot be turned into an objective pass/fail check as written, do not invent one: it needs clarification (see Step 5).

## Step 1: Find the requirements

1. If `$ARGUMENTS` is a file path, read it. Otherwise treat `$ARGUMENTS` as the requirements text.
2. If the file is a derived document, such as a plan or task list, that points to its source requirements, build the checklist from that source, not from its tasks. A checklist built from tasks only proves the tasks were done, not that the requirements were met.
3. If there are no requirements in the input, stop and report that nothing was given.

## Step 2: Set up the checklist file

1. Read the `work-items` path from the harness config (`.claude/config/paths.yaml`). If the file or key is missing, use `.claude/work-items/`.
2. Pick the folder:
   - If the requirements are a file already inside `<work-items>/<slug>/`, use that folder.
   - Otherwise choose a short kebab-case slug from the requirements' title or subject. If there is a ticket key, prefix it: `ABC-123-archive-jobs`.
3. The checklist file is `<work-items>/<slug>/checklist.md`. If it already exists, do not touch it: report its path and that it already exists, and stop. An existing checklist may hold recorded evidence.

## Step 3: Write the requirement items

1. If the source numbers its requirements or criteria (`R1`, `R1.AC1`, …), reuse those IDs exactly. Otherwise assign `R1`, `R2`, … in the order they appear.
2. Create at least one item per acceptance criterion. If a requirement has no criteria, create items from its stated behaviour. Split any statement that holds more than one condition into one item per condition.
3. Give each item a proof: an objective way to confirm it, with what counts as a pass. Prefer, in this order:
   - **test**: an automated test that asserts the behaviour; name what it must assert.
   - **command**: a command to run and the expected output or exit status.
   - **behaviour**: a manual action and the observable result.
   - **inspection**: reading the code for a specific, checkable fact. Use only when nothing above can prove it.
4. Cover what the requirements state about errors, empty states, limits and edge cases as their own items. Do not add edge cases the requirements do not mention.

## Step 4: Self-check

Fix the checklist until every item holds:

- [ ] Every requirement and acceptance criterion has at least one item.
- [ ] Every item traces to a requirement ID.
- [ ] Every item states one condition.
- [ ] Every proof is objective: two people following it would reach the same pass/fail.
- [ ] No item describes how to build anything; items state only what must be true.
- [ ] No item checks anything beyond the requirements, such as the build, lint or the rest of the test suite.

## Step 5: Save and report

If any requirement needs clarification, do not write the file. A checklist with gaps would let unchecked requirements pass. Instead, report each one with its requirement ID and why no objective proof can be written for it as stated, then stop.

Otherwise, write the checklist from [checklist-template.md](checklist-template.md) to `<work-items>/<slug>/checklist.md` and report its path and the number of items.
