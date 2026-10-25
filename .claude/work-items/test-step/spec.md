# Test step: tests for every /dev change

Status: final

## Source requirements

Once the implementation and clean code verification is done, only for the new changes added or code modified, it should add the unit/integration tests. Here we assume that it knows how the test code is added into the codebase and also the command/s to run the tests and also the required coverage threshold. (We can grab this information while it scans through the repo, lets discuss this one as well.) and then based on the available information, it adds the tests, runs then, ensures that it passes, ensures that it reaches the threshold.

1. We dont need to measure first.

Here is what I want, implement => check git diff to get the code change => run tests, see if an important test fails, if the change was related to that test and it was the very intention for the /dev cycle, it make sense and we expect it to fail but if an unrelated test fails, then we need to reverify the code. Then we add new test code for the changes, run the tests to make sure it passes after the new changes are added. then only if the codebase has requirements for the threshold, make sure its met. If not, we are done.

1. Yes
2. If we ran the /dev to change that behavious, the old test to test the old behaviour is not needed.
3. Well if the unrelated test fails, we should first ensure if our changes are breaching or breaking something that we did not expect to break. In that case, we fix that code to still implemented the changes the /dev asked and also ensuring the unrelated does not break.
4. Well in that case we should run the test even before starting to implement. Is that what you mean?
5. Well only the tests related to code changed.
6. Yes. Try reaching it and if its technically not possible let the user know.

The Harness should check if the codebase has threshold or not when it scans the whole project to extra commands practices etc.

1. Well if it fails because our changes, then we need to check. If it was failing even before the changes were made, its not us.
2. The Harness should know it while scanning. If no information, run full suite.
3. 3 sounds good. If contradict, ask me.
4. Yes standalone.
5. Well I guess we should run clean code after the tests.

3. Well for the commands, its scan-commands and for others we can also create a new separate command/skill. The purpose if 1 skill/command, one responsibility. And isolation.
4. If no test, skip without a note.
5. Sure.
6. Go ahead.

2. Well if there is an easy way to run the full suite from the original code, then we dont even need to always run the full suite before implementation. We can just go normal and only if the test phase gets a failure of unrelated tests, we can go test with origin code to chec.

1. "Write new unit and integration tests for the change, run them and make sure they pass." Not always both. It should follow whatever the existing code has.

"Now we need to decide proper names for each and every skills and commands that we have. Like we need a convension for the name. It should be descriptive."

"Well forget about 1 keyword. Just give me good descriptive names. And standard convension."

"For commands 1 keyword names are better"

"Except test-changes. Cause it also writes tests. I feel test currently has multiple responsibilites which should be splitted."

"Sure. But instead of dev calling multiple test related skills/commands, maybe it can have an orc skill/command which can also be run standalone if the user implements some changes manually and it needs tests."

"Current write tests, wrties new tests as well as removes stale ones. Should it be named update-tests?"

## Goal

Every change made through `/dev`, or any uncommitted change on request, leaves with tests for it in the project's own style, no test broken by the change, and the project's coverage threshold met where it has one. Each part of that work is its own skill with one responsibility, and every skill and command is named by one convention.

## Requirements

### R1 — `/dev` order

`/dev` runs: `write-spec` → `write-plan` → `implement-requirements` → `test-changes` → `check-clean-code` → `implement-requirements` (the findings the user chooses) → `test-changes` again, in full.

Acceptance criteria:

- R1.AC1 — Given `/dev` finished implementing, when it continues, then it invokes `test-changes` before `check-clean-code`.
- R1.AC2 — Given `implement-requirements` changed files to fix clean-code findings, when it finishes, then `/dev` invokes `test-changes` again in full and reports its result.
- R1.AC3 — Given `/dev` starts with uncommitted changes already in the project, when it begins, then it saves the output of `git diff` (read-only git), untracked files included, to the work item folder as the starting diff.

### R2 — Find the change

`run-tests`, `update-tests` and `check-coverage` take every uncommitted change from git (read-only), untracked files included, and keep only code files.

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

Takes a list of failing tests, plus requirements and a starting diff when given, and sorts each as expected, already failing or broken by the change. Changes no project file.

Acceptance criteria:

- R5.AC1 — Given a failing test that asserts behaviour a requirement changed or removed, when it is sorted, then it is expected, with the requirement quoted.
- R5.AC2 — Given it is unclear whether a failing test checks behaviour the requirements changed, when it is sorted, then the user is asked.
- R5.AC3 — Given no requirements, when a test fails, then nothing is expected unless the test passes on the original code and the user says the change in behaviour is intended.
- R5.AC4 — Given a failing test the change itself added, when it is sorted, then it is broken by the change.
- R5.AC5 — Given any other failure, when it is sorted, then it is run against the original code in a temporary copy outside the project: `HEAD` from `git archive`, plus the starting diff when given, with the project's installed dependency folders and local config linked rather than reinstalled. It is already failing if it fails there, and broken by the change if it passes there.
- R5.AC6 — Given the test cannot run in the copy, when it is sorted, then the user is asked whether that failure is new.
- R5.AC7 — Given it finishes, then the copy is removed and the project's git state and working tree are unchanged.

### R6 — Fix what the change broke

`test-changes` hands the tests broken by the change to `implement-requirements` as findings, which fixes the code, never the test, so the requirements still hold and the test passes.

Acceptance criteria:

- R6.AC1 — Given tests broken by the change, when `test-changes` handles them, then it runs `implement-requirements` and `run-tests` in rounds, at most 3.
- R6.AC2 — Given the requirements and a broken test's behaviour contradict, so both cannot hold, when `test-changes` finds this, then it asks the user which holds.
- R6.AC3 — Given 3 rounds did not fix it, when `test-changes` stops, then the rounds' changes are undone and it reports the test, each round and why it failed.
- R6.AC4 — Given an already failing test, when `test-changes` handles it, then it is left alone and reported.

### R7 — `update-tests`

Writes tests for the changed code, of the kinds the project already has (unit, integration or both), following `conventions/tests.md` when present and the project's existing tests otherwise. Given tests for behaviour the requirements removed, deletes them, quoting the requirement. Given uncovered lines, adds tests for them. Changes test files only.

Acceptance criteria:

- R7.AC1 — Given a project with only unit tests, when `update-tests` writes tests, then it writes only unit tests.
- R7.AC2 — Given expected tests from triage, when `test-changes` continues, then `update-tests` deletes them and names the requirement in its report.
- R7.AC3 — Given the new tests, when `test-changes` runs them with `run-tests`, then they all pass before it finishes; a failure caused by the code is handled as in R6.
- R7.AC4 — Given a new test, when it is written, then it asserts behaviour and is not loosened, skipped or mocked away to pass.

### R8 — `check-coverage`

Only when `scan-test-setup` recorded a threshold, runs the recorded coverage command, measures the way the project defines it and reports met or not met, with the uncovered lines in the changed code. Changes no file.

Acceptance criteria:

- R8.AC1 — Given no recorded threshold, when `check-coverage` runs, then it does nothing, and `test-changes` is done after the tests pass.
- R8.AC2 — Given a threshold but no coverage command, when `check-coverage` runs, then it reports that coverage could not be measured.
- R8.AC3 — Given a threshold that is not met, when `test-changes` continues, then it runs `update-tests` with the uncovered lines, then `run-tests` and `check-coverage`, at most 3 rounds.
- R8.AC4 — Given the threshold cannot technically be reached, when `test-changes` stops, then it tells the user what is left uncovered and why.

### R9 — `test-changes` orchestrator, standalone

`test-changes` runs `run-tests` → on failures, `triage-test-failures` and R6 → `update-tests` for the expected tests and then for the change → `run-tests` → `check-coverage` and R8. It takes optional requirements and a starting diff, and is also a skill the user runs directly, for example after changing code by hand.

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

### R12 — `/scan` runs the three scans

Acceptance criteria:

- R12.AC1 — Given `/scan` runs, when it starts, then it runs `scan-commands`, `scan-conventions` and `scan-test-setup` in parallel and prints all three reports.

### R13 — Conventions updated

`.claude/rules/skill-conventions.md` records the isolation exceptions, what each skill writes, and the naming convention.

Acceptance criteria:

- R13.AC1 — Given the change is done, when the conventions file is read, then its exceptions match R1, R9 and R12, and it states the naming convention of R14.

### R14 — Names

A command is one word: what the user types. A skill is verb-object, kebab-case, lowercase; the verb says the kind of work: `write-` produces a document, `draw-` an HTML visual, `scan-` reads the project and records facts, `check-` reports only and never edits; any other verb names the work it does.

Renames: `spec` → `write-spec`, `plan` → `write-plan`, `checklist` → `write-checklist`, `implement` → `implement-requirements`, `clean-code` → `check-clean-code`, `deep-verify` → `verify-claims`, `conventions` → `scan-conventions`, `test-profile` → `scan-test-setup`, `architecture-design` → `draw-architecture-map`, `runbook` → `draw-runbook`, `/xray` → `/scan`. The `test-profile` paths key and file become `test-setup` and `.claude/config/test-setup.yaml`. Other paths keys and output files keep their names.

Acceptance criteria:

- R14.AC1 — Given the change is done, when the repo is searched, then no old skill or command name is referenced as a skill or command, outside historical work items and benchmarks.

## Out of scope

- A test run before `implement-requirements` (dropped for R5).
- Coverage measurement when the project sets no threshold.
- Installing test or coverage tools.
- Running the full suite when a related-tests method exists.
- Renaming paths keys or output files other than `test-profile`.

## Constraints

- No git state changes; only read-only git, including `git archive`. (Source: Codebase fact F5)
- Each skill has one responsibility. (Source: Decisions D7, D14)
- Only `implement-requirements` changes code, and in testing only to fix a test the change broke (R6), never to make a new test pass by changing behaviour. `update-tests` changes test files only. (Source: Decisions D3, D14)

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
