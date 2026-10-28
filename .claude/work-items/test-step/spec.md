# Test step: tests for every /dev change

Status: final

## Source requirements

Once the implementation and clean code verification is done, only for the new changes added or code modified, it should add the unit/integration tests. Here we assume that it knows how the test code is added into the codebase and also the command/s to run the tests and also the required coverage threshold. (We can grab this information while it scans through the repo, lets discuss this one as well.) and then based on the available information, it adds the tests, runs then, ensures that it passes, ensures that it reaches the threshold.

## Goal

Every change made through `/dev` leaves with tests planned from its requirements, never from its code, and written in the project's own style; every uncommitted change tested on request leaves with no test it broke still failing, or with each such failure reported when only tests are to be added, and the project's coverage threshold met where it has one. Each part of that work is its own skill with one responsibility, and every skill and command is named by one convention.

## Requirements

### R1 — `/dev` order

`/dev` runs: `write-spec` → `write-plan` → in parallel, [`implement-requirements` with the plan] and [`write-test-plan` with the spec and plan → `update-tests` with the test plan] → `test-changes` → `check-clean-code` → `implement-requirements` (the findings the user chooses) → `test-changes` again.

Acceptance criteria:

- R1.AC1 — Given `/dev` has a plan, when it continues, then it runs both streams at once, waits for both, and then invokes `test-changes` before `check-clean-code`.
- R1.AC2 — Given `implement-requirements` changed files to fix clean-code findings, when it finishes, then `/dev` invokes `test-changes` again, which gets every test the fixes broke passing, and reports its result.
- R1.AC3 — Given `/dev` starts with uncommitted changes already in the project, when it begins, then it saves the output of `git diff` (read-only git), untracked files included, to the work item folder as the starting diff.
- R1.AC4 — Given `/dev` invokes `test-changes`, when it does, then it passes the spec and plan, used only to map coverage gaps, the work item folder and the starting diff.
- R1.AC5 — Given `/dev` resumes a work item folder that holds `plan.md`, when it starts, then it runs both streams afresh, `implement-requirements` with a new checklist and `write-test-plan` with a new test plan, followed by the later steps.

### R2 — Find the change

`run-tests` and `check-coverage` take every uncommitted change from git (read-only), untracked files included, and keep only code files.

Acceptance criteria:

- R2.AC1 — Given uncommitted changes to code, docs and config, when one of them runs, then only the code files count as the change.
- R2.AC2 — Given no uncommitted code change, when `run-tests` runs, then it says so and stops, and `test-changes` reports that and stops.

### R3 — No test setup: skip silently

Acceptance criteria:

- R3.AC1 — Given the recorded project commands hold no test command, when `test-changes` or `run-tests` runs, then it does nothing and reports nothing, and `/dev` moves on.

### R4 — `run-tests`

Runs the tests related to the changed files, found by the method `scan-test-setup` recorded; with no method recorded, the full suite. Reports which pass and which fail. Changes no file.

Acceptance criteria:

- R4.AC1 — Given a recorded method, when `run-tests` runs, then it runs only the tests that method selects for the changed files.
- R4.AC2 — Given no recorded method, when `run-tests` runs, then it runs the full suite.
- R4.AC3 — Given it finishes, then it reports each passing and each failing test, with each failure's output, and no file has changed.

### R5 — `triage-test-failures`

Takes a list of failing tests, plus a starting diff when given, and sorts each by fact only as already failing or changed by this change. Reads no spec or requirements. Changes no project file.

Acceptance criteria:

- R5.AC1 — Given a failing test the change itself added, when it is sorted, then it is changed by this change.
- R5.AC2 — Given any other failure, when it is sorted, then it is run against the original code in a temporary copy outside the project: `HEAD` from `git archive`, plus the starting diff when given, with the project's installed dependency folders and local config linked rather than reinstalled. It is already failing if it fails there, and changed by this change if it passes there.
- R5.AC3 — Given the test cannot run in the copy, when it is sorted, then the user is asked whether that failure is new.
- R5.AC4 — Given it finishes, then the copy is removed and the project's git state and working tree are unchanged.

### R6 — Fix what the change broke

Every test changed by this change must pass. `test-changes` asks no question about intent: which tests go is the test plan's decision (R16). The failing tests go to `implement-requirements` as requirements, which fixes the code, never the test.

Acceptance criteria:

- R6.AC1 — Given a test changed by this change, when `test-changes` handles it, then it asks nothing and hands the test to `implement-requirements`: "test passes; change the code, never the test".
- R6.AC2 — Given such tests, when `test-changes` handles them, then it runs `implement-requirements` and `run-tests` in rounds, at most 3.
- R6.AC3 — Given 3 rounds did not fix it, when `test-changes` stops, then the rounds' changes are undone and it reports the test, each round and why it failed.
- R6.AC4 — Given an already failing test, when `test-changes` handles it, then it is left alone and reported.

### R7 — `update-tests`

Takes a test plan, plus a work item folder, and writes, changes and deletes tests exactly as it says, in the project's style. Reads no code body: only the plan, the existing test files and, when the plan omits it, a named unit's declaration. Does not run the tests against the code; checks only that its own tests are well-formed, and fixes only its own setup mistakes. Changes test files only.

Acceptance criteria:

- R7.AC1 — Given a test plan, when `update-tests` runs, then the tests it writes, changes and deletes are exactly those the plan names.
- R7.AC2 — Given its tests, when it checks them, then it uses the section's build, type-check or lint command when recorded, else reads them against the existing tests; errors only from planned code that does not exist yet are left and reported.
- R7.AC3 — Given a new test, when it is written, then it asserts behaviour and is not loosened, skipped or mocked away.

### R8 — `check-coverage`

Only when `scan-test-setup` recorded a threshold, runs the recorded coverage command, measures the way the project defines it and reports met or not met, with the uncovered lines in the changed code. Changes no file.

Acceptance criteria:

- R8.AC1 — Given no recorded threshold, when `check-coverage` runs, then it does nothing, and `test-changes` is done after the tests pass.
- R8.AC2 — Given a threshold but no coverage command, when `check-coverage` runs, then it reports that coverage could not be measured.
- R8.AC3 — Given a threshold that is not met, when `test-changes` continues, then it maps each uncovered range to its requirement or planned unit (from the spec and plan, else by asking the user), runs `write-test-plan` with them as under-tested, then `update-tests` with that test plan, then `run-tests` and `check-coverage`, at most 3 rounds.
- R8.AC4 — Given the threshold cannot technically be reached, when `test-changes` stops, then it tells the user what is left uncovered and why.

### R9 — `test-changes` orchestrator, standalone

`test-changes` runs `run-tests` → on failures, `triage-test-failures` and R6 → `check-coverage` and R8. It writes no test from the code. It takes an optional starting diff, work item folder, requirements or spec, and code plan; the last two only map coverage gaps. It is also a skill the user runs directly, for example after changing code by hand.

Acceptance criteria:

- R9.AC1 — Given the user runs `/test-changes`, when it runs, then it does R2 to R8 on the uncommitted changes, with `HEAD` as the original code.

### R10 — `scan-test-setup` skill

A skill that scans the project and records how to find the tests related to a changed file and the coverage threshold, in the file at the `test-setup` path (default `.claude/config/test-setup.yaml`). Reads only.

Acceptance criteria:

- R10.AC1 — Given a project whose test tooling or naming shows how tests map to source files, when `scan-test-setup` runs, then it records that method with the file it came from.
- R10.AC2 — Given a coverage threshold in the project's config or CI, when `scan-test-setup` runs, then it records the threshold, what it measures and the file it came from.
- R10.AC3 — Given neither is found, when `scan-test-setup` runs, then it records that none was found.

### R11 — `scan-commands` finds the coverage command

Acceptance criteria:

- R11.AC1 — Given a project with a coverage command, when `scan-commands` runs, then the recorded commands include it.

### R12 — `/scan` runs the four scans

Acceptance criteria:

- R12.AC1 — Given `/scan` runs, when it starts, then it runs `scan-commands`, `scan-conventions` and `scan-test-setup` in parallel, then `scan-run-steps`, and prints all four reports.

### R13 — Conventions updated

`.claude/rules/skill-conventions.md` records the isolation exceptions, what each skill writes, and the naming convention.

Acceptance criteria:

- R13.AC1 — Given the change is done, when the conventions file is read, then its exceptions match R1, R9, R12 and R18, and it states the naming convention of R14.

### R14 — Names

A command is one word: what the user types. A skill is verb-object, kebab-case, lowercase; the verb says the kind of work: `write-` produces a document, `draw-` an HTML visual, `scan-` reads the project and records facts, `check-` reports only and never edits; any other verb names the work it does.

Renames: `spec` → `write-spec`, `plan` → `write-plan`, `checklist` → `write-checklist`, `implement` → `implement-requirements`, `clean-code` → `check-clean-code`, `deep-verify` → `verify-claims`, `conventions` → `scan-conventions`, `test-profile` → `scan-test-setup`, `architecture-design` → `draw-architecture-map`, `runbook` → `draw-runbook`, `/xray` → `/scan`. The `test-profile` paths key and file become `test-setup` and `.claude/config/test-setup.yaml`. Other paths keys and output files keep their names.

Acceptance criteria:

- R14.AC1 — Given the change is done, when the repo is searched, then no old skill or command name is referenced as a skill or command, outside historical work items and benchmarks.

### R15 — `implement-requirements` is stateless

Each run of `implement-requirements` is a new, independent request: it takes what needs adding or changing in the code (requirements, spec, plan, findings or failing tests), builds a new checklist, implements, proves each item and reports. Nothing from an earlier run is reused. A findings or failing-tests list is handled as requirements.

Acceptance criteria:

- R15.AC1 — Given a work item folder that already holds a checklist, when `implement-requirements` runs again, then it writes a new checklist and never reads, edits or overwrites the earlier one.
- R15.AC2 — Given input inside a work item folder, or a folder named by the caller, when it runs, then the checklist goes in that folder; otherwise a new work item folder is created.
- R15.AC3 — Given the folder has no checklist, when `write-checklist` writes one, then it is `checklist.md`; otherwise it is the first free name of `checklist-2.md`, `checklist-3.md`, ….
- R15.AC4 — Given a list of findings, when it runs, then each finding becomes one or more requirements with checklist items that prove it is fixed.

### R16 — `write-test-plan`

Plans the tests from the requirements, plus the code plan's public units (names, signatures, files) and the recorded test setup and conventions, and never from a code body. Writes `test-plan.md` in the work item folder, else the first free of `test-plan-2.md`, `test-plan-3.md`, …, never editing an earlier one. Per requirement: the cases (what each asserts, the observable result), their kind (only kinds the project has) and test file (by its convention), and each related existing test kept, changed (to what) or deleted (with the requirement that makes it obsolete). Plans for the recorded coverage threshold, and states it. Given under-tested requirements or units, plans only the cases they lack.

Acceptance criteria:

- R16.AC1 — Given requirements and a code plan, when it runs, then every case traces to a requirement ID and no line comes from a code body.
- R16.AC2 — Given an existing test a requirement makes obsolete, when it runs, then the plan deletes it, naming that requirement.
- R16.AC3 — Given a recorded coverage threshold, when it runs, then the plan states it and has cases for every planned public unit and acceptance criterion, error and edge paths the requirements name included.
- R16.AC4 — Given under-tested requirements or units, when it runs, then it writes a new test plan with cases for those only, from their requirements.

### R17 — Code and tests apart

`write-plan` plans the code change only. `implement-requirements` writes code files only, and no checklist proof needs a new test; that tests pass is proven by `test-changes`.

Acceptance criteria:

- R17.AC1 — Given a plan, when it is written, then no task writes, changes or runs a test.
- R17.AC2 — Given `implement-requirements` runs, when it finishes, then no test file has changed.
- R17.AC3 — Given a checklist, when `write-checklist` writes it, then no proof needs a new test.

### R18 — `/test` command

A one-word command only the user runs, which only adds tests for uncommitted changes: it checks for uncommitted code changes and a test command, creates a work item folder, then runs `infer-requirements` → `write-test-plan` with the requirements and public units → `update-tests` with the test plan → `test-changes` with `no-fix`, and reports. It runs no clean-code check and never fixes the code.

Acceptance criteria:

- R18.AC1 — Given no uncommitted code change, when `/test` runs, then it says so and stops, creating no folder.
- R18.AC2 — Given no recorded test command, when `/test` runs, then it says the project records no test command and stops.
- R18.AC3 — Given uncommitted code changes and a test command, when `/test` runs, then it invokes the four skills in that order with one work item folder, and no code file is changed by it.
- R18.AC4 — Given a test fails because of the code, when `/test` reports, then it names the test, its failure and likely cause, and suggests running `implement-requirements` to fix it.

### R19 — `infer-requirements`

Works out what the uncommitted code changes are meant to do from read-only git (`git diff HEAD` plus untracked files, code files only, test files excluded), and gets the user to confirm it. Writes `requirements.md` (else the first free `requirements-2.md`, …) in the work item folder: numbered requirements with Given / When / Then criteria describing intended behaviour, never how, and the changed public units by declaration line and file only. Changes no other file.

Acceptance criteria:

- R19.AC1 — Given uncommitted code changes, when it runs, then it shows the drafted requirements and asks the user whether they are the intended changes, applying corrections and asking again until the user confirms.
- R19.AC2 — Given a change whose intent the code does not settle, when it drafts, then it asks the user instead of writing a criterion from the code.
- R19.AC3 — Given the user confirms, when it writes the file, then the file holds the confirmed requirements and each changed public unit's declaration line and file, and no code body.
- R19.AC4 — Given no uncommitted code change, when it runs, then it says so and writes nothing.

### R20 — `test-changes` `no-fix`

With `no-fix`, `test-changes` never changes the code: each test changed by this change is reported with its failure and likely cause, with a suggestion to run `implement-requirements` on those tests. The coverage loop still runs. Without it, behaviour is unchanged.

Acceptance criteria:

- R20.AC1 — Given `no-fix` and a test changed by this change, when `test-changes` handles it, then it does not invoke `implement-requirements` and reports the test, its failure and likely cause, and the suggestion.
- R20.AC2 — Given `no-fix` and an unmet coverage threshold, when `test-changes` continues, then it still plans and writes the missing tests as in R8.

### R21 — `write-test-plan` takes public units

In place of a code plan, `write-test-plan` accepts a list of public units (names, signatures, files), on its own or inside the requirements file. It still reads no code body and no diff.

Acceptance criteria:

- R21.AC1 — Given requirements and a public units list, when it runs, then its cases go through those units and no line comes from a code body.

## Out of scope

- A test run before `implement-requirements` (dropped for R5).
- Coverage measurement when the project sets no threshold.
- Installing test or coverage tools.
- Running the full suite when a related-tests method exists.
- Renaming paths keys or output files other than `test-profile`.

## Constraints

- No git state changes; only read-only git, including `git archive`. (Source: Codebase fact F5)
- Each skill has one responsibility. (Source: Decisions D7, D14)
- Only `implement-requirements` changes code, and only code files; in testing it changes the code, never the test (R6). `update-tests` changes test files only, as the test plan says. (Source: Decisions D14, D28, D29)
- Tests come from the requirements, never from a code body. `run-tests`, `triage-test-failures`, `update-tests` and `check-coverage` read no spec or requirements; `test-changes` uses them only to map coverage gaps. (Source: Decisions D20, D24, D31)

## Codebase facts

- F1 — Before this work item, `/dev` ran spec, plan, implement, then clean-code, then implement on chosen findings. (`commands/dev.md:15`, `commands/dev.md:16` at commit `11fc9f6`)
- F2 — `scan-commands` records `test` commands: all, one file, one test. (`skills/scan-commands/SKILL.md:49`)
- F3 — `scan-conventions` writes `conventions/tests.md`: where tests live, naming, how they are written. (`skills/scan-conventions/SKILL.md:50`)
- F4 — Before this work item, `/xray` ran `scan-commands` and `conventions` in parallel. (`commands/xray.md:14` at commit `11fc9f6`)
- F5 — No skill makes git state changes. (`.claude/rules/skill-conventions.md:16`)
- F6 — Anything another skill or command invokes is a skill. (`.claude/rules/skill-conventions.md:31`)

## Decisions

- D1 — Q: Measure coverage before writing tests? → A: No. Affects: R2, R8.
- D2 — Q: Where in `/dev`? → A: After implement; clean-code moves after test. Affects: R1.
- D3 — Q: Old tests for changed behaviour? → A: Not needed; remove them. Affects: R5, R7.
- D4 — Q: Unrelated failure caused by the change? → A: Fix the code so the change and the old test both hold; 3 attempts; ask if they contradict. Affects: R6.
- D5 — Q: Which tests to run? → A: Only those related to the changed code; full suite if unknown. Affects: R4, R10.
- D6 — Q: Threshold not reachable? → A: Try; if technically impossible, tell the user. Affects: R8.
- D7 — Q: Who records the threshold and related-tests method? → A: Commands stay in `scan-commands`; the rest goes in a new skill, one responsibility each. Affects: R10, R11.
- D8 — Q: No test command? → A: Skip without a note. Affects: R3.
- D9 — Q: Run before implement? → A: No; check against the original code only when an unrelated test fails. Affects: R5.
- D10 — Q: Which test kinds? → A: Whatever the existing code has. Affects: R7.
- D11 — Q: Standalone? → A: Yes. Names `test` and `test-profile`. Affects: R9, R10. Names superseded by D14, D16 and D18.
- D12 — Q: May the conventions file be updated? → A: Go ahead. Affects: R13.
- D13 — Q: Link installed dependency folders and local config into the original-code copy, and save the starting diff at the start of `/dev`? → A: Yes. Affects: R1, R5.
- D14 — Q: Does `test` have more than one responsibility? → A: Yes; split it into five skills, one responsibility each: `run-tests`, `triage-test-failures`, `update-tests`, `check-coverage` and `test-changes`. Affects: R4 to R9.
- D15 — Q: Should `/dev` invoke the test skills one by one? → A: No; an orchestrator, `test-changes`, invokes them, and the user can also run it standalone after changing code by hand. Affects: R1, R9.
- D16 — Q: Name of the skill that writes new tests and removes stale ones? → A: `update-tests`. Affects: R7.
- D17 — Q: What runs after the clean-code fixes? → A: `test-changes` again, in full. Affects: R1.
- D18 — Q: Names? → A: Commands are one word; skills are verb-object with the convention in R14, and the renames listed there, with `/xray` becoming `/scan`. Affects: R10, R12 to R14.
- D19 — Q: Does `implement-requirements` keep state between runs? → A: No; every run is a new request with a new checklist, and findings or failing tests are just requirements. No separate findings mode. Affects: R1, R6, R15.
- D20 — Q: Should the test skills read the spec? → A: No; `test-changes`, `triage-test-failures` and `update-tests` take no spec or requirements, and triage sorts by fact only: already failing or changed by this change. Supersedes D3's link to requirements and D4's "ask if they contradict". Affects: R5, R7, R9.
- D21 — Q: Who decides whether a test changed by the change is expected? → A: `test-changes` asks whoever invoked it whether the behaviour change was intentional; `/dev` answers from the spec and asks the user only if the spec does not settle it. Intentional → delete; not intentional → fix the code. Affects: R1, R6, R7.
- D22 — Q: Where does the checklist live? → A: In the same work item folder as the spec or plan, else a new one; each run writes a new file, `checklist.md` then `checklist-2.md`, `checklist-3.md`, …. Affects: R15.
- D23 — Q: Who creates the work item folder? → A: `/dev` creates it at the start of a new run, saves the starting diff straight into it, and passes it to every skill it invokes; a skill given a folder uses it, and a skill run standalone creates its own. Folders are numbered `0001`, `0002`, …, claimed by a create that fails if the folder exists. Supersedes D22's "same folder as the spec or plan, else a new one". Affects: R1, R15.
- D24 — Q: Write tests from the code change? → A: No; tests written from the code are biased to pass it. Tests come from the requirements. Supersedes D20 for writing tests. Affects: R7, R16.
- D25 — Q: Does `write-plan` plan the tests? → A: No; it plans the code change only, and a separate `write-test-plan` plans the tests. Affects: R16, R17.
- D26 — Q: What does `update-tests` follow? → A: The test plan only: it keeps, changes, deletes and adds the tests the plan says, and reads no code body. Supersedes D16's "removes stale ones" by itself. Affects: R7.
- D27 — Q: Where do the test streams run in `/dev`? → A: After `write-plan`, two streams at once: `implement-requirements`, and `write-test-plan` then `update-tests`; then `test-changes`, clean code, and `test-changes` a last time. Supersedes D2. Affects: R1.
- D28 — Q: Does `implement-requirements` write tests? → A: No; its only job is to write the code in the code files from the requirements. Affects: R15, R17.
- D29 — Q: Does triage still ask "was this intentional?" → A: No; the test plan decides which tests go, and every test changed by this change must pass. Supersedes D21. Affects: R1, R6.
- D30 — Q: On the last `test-changes` run, are failures fixed? → A: Yes; the failures are fixed. Affects: R1.
- D31 — Q: How are coverage gaps filled? → A: Delegated to the agent, which chose: map each uncovered range to its requirement or planned unit, then plan and write the missing cases from that requirement, never from code lines. Affects: R8, R16.
- D32 — Q: Does the test plan know the coverage threshold? → A: Yes; `write-test-plan` plans enough cases to meet it, and `check-coverage` still runs at the end as the safety net. Affects: R8, R16.
- D33 — Q: How are changes made by hand tested in isolation? → A: A wrapper command first reads the changes, interprets them and asks the user whether they are the intended changes; once confirmed, the same skills plan and write the tests, run and triage them. Named `/test`, with `infer-requirements` for the first part. Affects: R18, R19.
- D34 — Q: In `/test`, when the code makes a test fail, is it fixed? → A: No; the user is told and advised to run `implement-requirements` to fix it. Affects: R18, R20.
- D35 — Q: Does `/test` also run `check-clean-code`? → A: No; it only adds test code. Affects: R18.
- D36 — Q: How does it get the changes made by hand? → A: From `git diff` (read-only). Affects: R19.
- D37 — Q: What does `write-test-plan` get in `/test`, where there is no code plan? → A: The changed public units, names, signatures and files only, written by `infer-requirements` with the requirements; never code bodies or the diff. Affects: R19, R21.
