---
name: checklist
description: Turn technical requirements (inline text or a requirements file) into a verification checklist at <work-items>/<slug>/checklist.md — one item per requirement or acceptance criterion, each with an objective pass/fail proof, built from the requirements alone. Use when requirements need a checklist that can prove they were met. Not for writing or reviewing requirements, planning the work, or checking work against an existing checklist; never changes an existing checklist.
argument-hint: <requirements text or path to a requirements file>
user-invocable: false
context: fork
metadata:
  model-tier: Mid
---

# Checklist: Requirements → Verification Checklist

Turn the requirements in `$ARGUMENTS` into a checklist that proves, item by item, that every requirement has been met.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Every item traces to a specific requirement: add nothing the requirements do not ask for, and do not soften or reinterpret what they do ask for.

## Step 1: Find the requirements

1. If `$ARGUMENTS` is a file path, read it; if it cannot be read, stop and report the path. Otherwise treat `$ARGUMENTS` as the requirements text.
2. If the file is a derived document, such as a plan or task list, that points to its source requirements, build the checklist from that source, never from its tasks. If it names no source, or the source cannot be read, stop and report that.
3. If the input holds no requirements, stop and report that nothing was given.

## Step 2: Set up the checklist file

1. Read the `work-items` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/work-items/`.
2. Pick the folder:
   - If the requirements are a file already inside `<work-items>/<slug>/`, use that folder.
   - Otherwise choose a short kebab-case slug from the requirements' title or subject. If there is a ticket key, prefix it: `ABC-123-archive-jobs`.
3. The checklist file is `<work-items>/<slug>/checklist.md`. If it already exists, do not touch it: report its path and that it already exists, and stop.

## Step 3: Write the requirement items

1. If the source numbers its requirements or criteria (`R1`, `R1.AC1`, …), reuse those IDs exactly. Otherwise assign `R1`, `R2`, … in the order they appear. Number the items `C1`, `C2`, … in order.
2. Create at least one item per acceptance criterion. If a requirement has no criteria, create items from its stated behaviour. Split any statement that holds more than one condition into one item per condition.
3. Give each item a proof: an objective way to confirm it, with what counts as a pass. Prefer, in this order:
   - **test**: an automated test that asserts the behaviour; name what it must assert.
   - **command**: a command to run and the expected output or exit status.
   - **behaviour**: a manual action and the observable result.
   - **inspection**: reading the code for a specific, checkable fact. Use only when nothing above can prove it.
4. A proof never needs production data, real credentials or a destructive action on a live system. Never copy secrets from the requirements into the checklist.
5. Cover what the requirements state about errors, empty states, limits and edge cases as their own items. Do not add edge cases the requirements do not mention.
6. A requirement needs clarification when no objective proof can be written for it as stated: for example, it rests on an unquantified term ("fast", "secure", "user-friendly", "works correctly") or contradicts another requirement. Do not invent a threshold or pick a side.

## Step 4: Self-check

Fix the checklist until every item holds:

- [ ] Every requirement and acceptance criterion has at least one item.
- [ ] Every item traces to a requirement ID.
- [ ] Every item states one condition, and no two items check the same condition.
- [ ] Every proof is objective: two people following it would reach the same pass/fail.
- [ ] No item describes how to build anything; items state only what must be true.
- [ ] No item checks anything beyond the requirements, such as the build, lint or the rest of the test suite.
- [ ] Every item is unticked with `Evidence: —`; nothing has been verified yet.

## Step 5: Save and report

If any requirement needs clarification, do not write the file. Report each one with its requirement ID and why no objective proof can be written for it as stated, then stop.

Otherwise, write the checklist from [checklist-template.md](checklist-template.md) to `<work-items>/<slug>/checklist.md` and report its path and the number of items.
