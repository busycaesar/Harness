---
name: write-test-plan
description: Plan the tests for technical requirements — a spec, ticket body, prompt or requirements file — from the requirements alone, never from the code. Decides the new test cases (what each asserts, its kind and its file), and which existing tests stay, change or go, every case traced to a requirement, planned to meet the project's recorded coverage threshold. Given under-tested requirements or units, plans the cases they lack. Use when tests must be decided before or apart from the code. Produces a test plan document only; never writes tests or code.
argument-hint: "<requirements text or path> [code plan or public units] [work item folder] [under-tested requirements or units]"
metadata:
  model-tier: Frontier
---

# Test plan: Requirements → Test cases

Turn the requirements in `$ARGUMENTS` into a test plan that can be written as tests without making any further decisions. Every case comes from what the requirements say must be true, never from how the code does it. Write no tests and no code. If no requirements are given, ask for them and stop until they are.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Where the requirements leave a case's input or expected result open, ask; do not guess.

## Step 1: Input

Take from `$ARGUMENTS`, in any order:

- **Requirements** (required): a file path or text. If the file is a derived document, such as a plan, that points to its source requirements, use that source.
- **A code plan, or a list of public units** (on its own or inside the requirements file): read from it only the public units (names, signatures, responsibilities) and the files they are in. Ignore a plan's approach and everything else.
- **A work item folder**: per `.claude/rules/harness/work-items.md`; without one, create one as it says.
- **Under-tested requirements or units** (coverage-gap mode): each with the requirement ID or unit it belongs to.
- **Findings on test files** (findings mode): each with its rule, `path:line` and description. Each is a requirement to change that test's form, never what it asserts.

Never read the body of any code, existing or planned. The only code you read is the declaration of a public unit the requirements, code plan or units list name, when they do not give its signature.

## Step 2: Settings

1. Read the `project-rules` path and `conventions/tests.md` in it, when present.
2. Read the `test-setup` file: each section's related-tests method and coverage threshold (value, what it measures, over what). A missing file, entry or `none found` means none.
3. Read the `project-commands` file: each section's `path` (see `.claude/rules/harness/config.md` for all three).
4. **Kinds.** The kinds of test the project already has (unit, integration or both), from `conventions/tests.md`, else from its existing tests. If it has no tests and no `conventions/tests.md`, write no test plan: report that and stop.

## Step 3: Set up the file

The file is `test-plan.md` in the folder if it has none, else the first of `test-plan-2.md`, `test-plan-3.md`, … that does not exist. Never edit an existing test plan; in coverage-gap mode, read the earlier ones so no case is planned twice.

## Step 4: Understand the requirements

1. List the requirements with IDs as `.claude/rules/harness/work-items.md` says.
2. Find the gaps that block a test case: an expected result that is not stated, an input that is not defined, a contradiction, or no public unit or entry point to test it through (one that exists but cannot be loaded in tests is not a gap; see Step 6). Check the codebase's public declarations and existing tests first; ask the user only what they do not answer, all in one round.
3. If a blocking gap stays unanswered, write no test plan: report the open gaps and stop.

## Step 5: Existing tests

1. Find the existing tests for the files and units the requirements, code plan or units list touch: through each section's naming patterns, and by searching the test files for the units' names.
2. Read them. For each one, decide from the requirements:
   - **keep**: no requirement changes what it asserts;
   - **change**: a requirement changes the result it asserts; say to what, and which requirement. In findings mode, a finding changes the test's form as it says, and what it asserts stays;
   - **delete**: a requirement makes the behaviour it asserts obsolete; name that requirement and quote the line that does.
3. A test no requirement touches is kept. Never change or delete a test to suit the code (see `.claude/rules/harness/proofs.md`).

## Step 6: Plan the cases

1. At least one case per requirement and acceptance criterion, unless a kept existing test already proves it: then name that test as covering it instead. A case may also trace to a constraint (`K1`, …). One condition per case. Cover the errors, empty states, limits and edge cases the requirements state, as their own cases, and none they do not.
2. Each case names: its requirement, criterion or constraint ID; its kind, only of the kinds from Step 2; the test file it goes in, placed and named as `conventions/tests.md` says, else as the existing tests are, marked `(existing)` if that file exists before this plan is carried out, else `(create)`; the public unit or entry point it goes through, with its signature and the file or module it is in; the given state and action; and the observable result it asserts.
3. **Coverage.** Where a section has a coverage threshold, plan enough cases to meet it by what it measures: every public unit given, every acceptance criterion, and each error and edge path the requirements name, still from the requirements. The plan states the threshold it planned for.
4. A requirement no automated test can prove (wording in a document, a manual-only step), or one whose only entry point cannot be loaded in tests (it needs dependencies that are not installed, or live services), goes under "Not tested" with why; this needs no question.
5. **Coverage-gap mode.** Plan only for the under-tested requirements or units given: the cases their requirements call for that no earlier test plan has. Never plan a case from code lines.
6. **Findings mode.** Plan only the changes to the tests the findings name, and no new cases.

## Step 7: Self-check

Fix the plan until every item holds:

- [ ] Every requirement and acceptance criterion has a case or a kept existing test named as covering it, or is under "Not tested" with why.
- [ ] Every case traces to one requirement, criterion or constraint ID and asserts one observable result the requirements state.
- [ ] Nothing in the plan comes from a code body.
- [ ] Every case's kind is one the project already has, and its file follows the project's test conventions.
- [ ] Every change or delete of an existing test names the requirement that causes it.
- [ ] Each threshold is stated, with the cases planned to meet it.
- [ ] No line defers or decides nothing ("TBD", "as needed", "edge cases").

## Step 8: Save and report

Write the plan from [test-plan-template.md](test-plan-template.md) to the file from Step 3. Report its path, the number of cases, the existing tests to change and to delete, the requirements not tested, and any answers the user gave.
