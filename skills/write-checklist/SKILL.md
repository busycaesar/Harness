---
name: write-checklist
description: Turn technical requirements (inline text or a requirements file) into a new verification checklist in its work item folder — one item per requirement or acceptance criterion, each with an objective pass/fail proof, built from the requirements alone. Use when requirements need a checklist that can prove they were met. Not for writing or reviewing requirements, planning the work, or checking work against an existing checklist; never changes an existing checklist.
argument-hint: "<requirements text or path to a requirements file> [work item folder]"
user-invocable: false
context: fork
metadata:
  model-tier: Mid
---

# Checklist: Requirements → Verification Checklist

Turn the requirements in `$ARGUMENTS` into a checklist that proves, item by item, that every requirement has been met.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Every item traces to a specific requirement: add nothing the requirements do not ask for, and do not soften or reinterpret what they do ask for.

## Step 1: Find the requirements

1. Take the requirements from `$ARGUMENTS`, apart from any work item folder. If they are a file path, read it; if it cannot be read, stop and report the path. Otherwise treat them as the requirements text.
2. If the file is a derived document, such as a plan or task list, that points to its source requirements, build the checklist from that source, never from its tasks. If it names no source, or the source cannot be read, stop and report that.
3. If the input holds no requirements, stop and report that nothing was given.

## Step 2: Set up the checklist file

1. The folder is the work item folder given in `$ARGUMENTS`; without one, create one as `.claude/rules/harness/work-items.md` says.
2. The file is `checklist.md` if the folder has none, else the first of `checklist-2.md`, `checklist-3.md`, … that does not exist. Never touch an existing checklist.

## Step 3: Write the requirement items

1. Take the requirement IDs as `.claude/rules/harness/work-items.md` says. Number the items `C1`, `C2`, … in order.
2. Create at least one item per acceptance criterion and per constraint (`K1`, …). If a requirement has no criteria, create items from its stated behaviour. Split any statement that holds more than one condition into one item per condition.
3. Give each item a proof: an objective way to confirm it, with what counts as a pass. A proof never runs a test, existing or new. Prefer, in this order:
   - **build**: the project's build or type check command and the expected exit status or output.
   - **command**: a project command (a script, never a test command), or, when no test covers the requirement, a one-off command such as `python3 -c "from config import load; print(load().timeout)"`, with the expected output or exit status. A one-off command changes no file and needs no network or long-running service.
   - **inspection**: reading the code for a specific, checkable fact, such as a unit having the name and signature the requirements give. Use only when nothing above can prove it.
4. Every proof is automated. A requirement only a person can confirm (a manual step, a visual check) gets no item: list it under "Not provable automatically" with why, and invent no proof for it.
5. A proof never needs production data, real credentials or a destructive action on a live system. Never copy secrets from the requirements into the checklist.
6. Cover what the requirements state about errors, empty states, limits and edge cases as their own items. Do not add edge cases the requirements do not mention.
7. A requirement needs clarification when no objective proof can be written for it as stated: for example, it rests on an unquantified term ("fast", "secure", "user-friendly", "works correctly") or contradicts another requirement. Do not invent a threshold or pick a side.

## Step 4: Self-check

Fix the checklist until every item holds:

- [ ] Every requirement, acceptance criterion and constraint has at least one item, or is listed under "Not provable automatically" with why.
- [ ] Every item traces to a requirement, criterion or constraint ID.
- [ ] Every item states one condition, and no two items check the same condition.
- [ ] Every proof is objective: two people following it would reach the same pass/fail.
- [ ] No proof runs a test or needs a person.
- [ ] No item describes how to build anything; items state only what must be true.
- [ ] No item checks anything beyond the requirements, such as the build, lint or the rest of the test suite.
- [ ] Every item is unticked with `Evidence: —`; nothing has been verified yet.

## Step 5: Save and report

If any requirement needs clarification, do not write the file. Report each one with its requirement ID and why no objective proof can be written for it as stated, then stop.

Otherwise, write the checklist from [checklist-template.md](checklist-template.md) to the file picked in Step 2 and report its path, the number of items, and each requirement not provable automatically.
