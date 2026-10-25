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

## Goal

Every change made through `/dev`, or any uncommitted change on request, leaves with tests for it in the project's own style, no test broken by the change, and the project's coverage threshold met where it has one.

## Requirements

### R1 — `/dev` order

`/dev` runs: spec → plan → implement → test → clean-code → implement (the findings the user chooses) → test again, only re-running the related tests.

Acceptance criteria:

- R1.AC1 — Given `/dev` finished implementing, when it continues, then it invokes `test` before `clean-code`.
- R1.AC2 — Given `implement` fixed clean-code findings, when it finishes, then `/dev` re-runs the tests related to the changed files and reports any failure; it does not write new tests at that point.
- R1.AC3 — Given `/dev` starts with uncommitted changes already in the project, when it begins, then it saves the output of `git diff` (read-only git) to the work item folder as the starting diff.

### R2 — Find the change

`test` takes every uncommitted change from git (read-only) and keeps only code files.

Acceptance criteria:

- R2.AC1 — Given uncommitted changes to code, docs and config, when `test` runs, then only the code files count as the change.
- R2.AC2 — Given no uncommitted code change, when `test` runs, then it says so and stops.

### R3 — No test setup: skip silently

Acceptance criteria:

- R3.AC1 — Given the recorded project commands hold no test command, when `test` runs, then it does nothing and reports nothing, and `/dev` moves on.

### R4 — Run the related tests

`test` runs the tests related to the changed files, found by the method `test-profile` recorded; with no method recorded, it runs the full suite.

Acceptance criteria:

- R4.AC1 — Given a recorded method, when `test` runs, then it runs only the tests that method selects for the changed files.
- R4.AC2 — Given no recorded method, when `test` runs, then it runs the full suite.

### R5 — Expected failures: remove the old test

A failing test that checks behaviour the requirements deliberately changed or removed is expected. `test` deletes it, quoting the requirement that replaced the behaviour. New tests (R7) cover the new behaviour.

Acceptance criteria:

- R5.AC1 — Given a failing test that asserts behaviour a requirement replaced, when `test` classifies it, then it deletes that test and names the requirement in its report.
- R5.AC2 — Given it is unclear whether a failing test checks behaviour the requirements changed, when `test` classifies it, then it asks the user.
- R5.AC3 — Given `test` runs standalone with no requirements, when a test fails, then no failure is treated as expected.

### R6 — Unrelated failures: was it already failing?

For a failure not covered by R5, `test` runs the failing test against the original code in a scratchpad copy: `HEAD` from `git archive`, plus the starting diff when one was saved (R1.AC3). The copy reuses the project's installed dependency folders and local config, linked from the project rather than reinstalled.

Acceptance criteria:

- R6.AC1 — Given the test also fails on the original code, when `test` checks it, then it is reported as already failing and left alone.
- R6.AC2 — Given the test passes on the original code, when `test` checks it, then it counts as broken by the change: the code is fixed so the requirements still hold and the test passes, with up to 3 attempts.
- R6.AC3 — Given the requirements and the broken test's behaviour contradict, so both cannot hold, when `test` finds this, then it asks the user.
- R6.AC4 — Given 3 attempts did not fix it, when `test` stops, then it reports the test, the attempts and why they failed.
- R6.AC5 — Given the test cannot run in the copy, when `test` checks it, then it asks the user whether that failure is new.
- R6.AC6 — Given `test` ran, when it finishes, then the project's git state and working tree are unchanged by the copy.

### R7 — Write new tests

`test` writes tests for the changed code, of the kinds the project already has (unit, integration or both), following `conventions/tests.md` when present and the project's existing tests otherwise.

Acceptance criteria:

- R7.AC1 — Given a project with only unit tests, when `test` writes tests, then it writes only unit tests.
- R7.AC2 — Given the new tests, when `test` runs them, then they all pass before it finishes; a failure caused by the code is handled as in R6.AC2 to R6.AC4.
- R7.AC3 — Given a new test, when it is written, then it asserts behaviour and is not loosened, skipped or mocked away to pass.

### R8 — Coverage threshold

Only when `test-profile` recorded a threshold, `test` measures coverage the way the project defines it and adds tests until it is met.

Acceptance criteria:

- R8.AC1 — Given no recorded threshold, when the tests pass, then `test` is done.
- R8.AC2 — Given a recorded threshold that is not met, when `test` continues, then it adds tests until it is met.
- R8.AC3 — Given the threshold cannot technically be reached, when `test` stops, then it tells the user what is left uncovered and why.

### R9 — `test` standalone

`test` is also a skill the user runs directly on any uncommitted change.

Acceptance criteria:

- R9.AC1 — Given the user runs `/test`, when it runs, then it does R2 to R8 on the uncommitted changes, with `HEAD` as the original code.

### R10 — `test-profile` skill

A new skill that scans the project and records how to find the tests related to a changed file and the coverage threshold. Reads only.

Acceptance criteria:

- R10.AC1 — Given a project whose test tooling or naming shows how tests map to source files, when `test-profile` runs, then it records that method with the file it came from.
- R10.AC2 — Given a coverage threshold in the project's config or CI, when `test-profile` runs, then it records the threshold, what it measures and the file it came from.
- R10.AC3 — Given neither is found, when `test-profile` runs, then it records that none was found.

### R11 — `scan-commands` finds the coverage command

Acceptance criteria:

- R11.AC1 — Given a project with a coverage command, when `scan-commands` runs, then the recorded commands include it.

### R12 — `/xray` runs `test-profile`

Acceptance criteria:

- R12.AC1 — Given `/xray` runs, when it starts, then it runs `scan-commands`, `conventions` and `test-profile` in parallel and prints all three reports.

### R13 — Conventions updated

`.claude/rules/skill-conventions.md` records the new isolation exceptions: `dev` invokes `test` and the new order, and `xray` invokes `test-profile`.

Acceptance criteria:

- R13.AC1 — Given the change is done, when the conventions file is read, then its exceptions match R1 and R12.

## Out of scope

- A test run before `implement` (dropped for R6).
- Coverage measurement when the project sets no threshold.
- Installing test or coverage tools.
- Running the full suite when a related-tests method exists.

## Constraints

- No git state changes; only read-only git, including `git archive`. (Source: Codebase fact F5)
- Each skill has one responsibility. (Source: Decision D7)
- `test` changes code only to fix a test the change broke (R6.AC2), never to make a new test pass by changing behaviour. (Source: Decision D3)

## Codebase facts

- F1 — `/dev` runs spec, plan, implement, then clean-code, then implement on chosen findings. (`commands/dev.md:15`, `commands/dev.md:16`)
- F2 — `scan-commands` records `test` commands: all, one file, one test. (`skills/scan-commands/SKILL.md:49`)
- F3 — `conventions` writes `conventions/tests.md`: where tests live, naming, how they are written. (`skills/conventions/SKILL.md:50`)
- F4 — `/xray` runs `scan-commands` and `conventions` in parallel. (`commands/xray.md:14`)
- F5 — No skill makes git state changes. (`.claude/rules/skill-conventions.md:16`)
- F6 — Anything another skill or command invokes is a skill. (`.claude/rules/skill-conventions.md:31`)

## Decisions

- D1 — Q: Measure coverage before writing tests? → A: No. Affects: R2, R8.
- D2 — Q: Where in `/dev`? → A: After implement; clean-code moves after test. Affects: R1.
- D3 — Q: Old tests for changed behaviour? → A: Not needed; remove them. Affects: R5.
- D4 — Q: Unrelated failure caused by the change? → A: Fix the code so the change and the old test both hold; 3 attempts; ask if they contradict. Affects: R6.
- D5 — Q: Which tests to run? → A: Only those related to the changed code; full suite if unknown. Affects: R4, R10.
- D6 — Q: Threshold not reachable? → A: Try; if technically impossible, tell the user. Affects: R8.
- D7 — Q: Who records the threshold and related-tests method? → A: Commands stay in `scan-commands`; the rest goes in a new skill, one responsibility each. Affects: R10, R11.
- D8 — Q: No test command? → A: Skip without a note. Affects: R3.
- D9 — Q: Run before implement? → A: No; check against the original code only when an unrelated test fails. Affects: R6.
- D10 — Q: Which test kinds? → A: Whatever the existing code has. Affects: R7.
- D11 — Q: Standalone? → A: Yes. Names `test` and `test-profile`. Affects: R9, R10.
- D12 — Q: May the conventions file be updated? → A: Go ahead. Affects: R13.
- D13 — Q: Link installed dependency folders and local config into the original-code copy, and save the starting diff at the start of `/dev`? → A: Yes. Affects: R1, R6.
