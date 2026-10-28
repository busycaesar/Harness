<pre>
██╗  ██╗ █████╗ ██████╗ ███╗   ██╗███████╗███████╗███████╗
██║  ██║██╔══██╗██╔══██╗████╗  ██║██╔════╝██╔════╝██╔════╝
███████║███████║██████╔╝██╔██╗ ██║█████╗  ███████╗███████╗
██╔══██║██╔══██║██╔══██╗██║╚██╗██║██╔══╝  ╚════██║╚════██║
██║  ██║██║  ██║██║  ██║██║ ╚████║███████╗███████║███████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚══════╝
</pre>

## Description

Harness is a reusable, self-improving [Claude Code](https://claude.com/claude-code) harness: a self-contained set of skills, rules and config that lives entirely under a project's `.claude/` folder.

![Harness architecture](harness.png)

## Features

- **`/skill-improve`** (this repo only): scores the harness skills, learns from similar skills elsewhere and keeps only the changes that raise the score.

## Skills and commands

- **`/dev`**: Takes requirements all the way to implemented, tested changes: write-spec, write-plan, then the code (implement-requirements) and its tests (write-test-plan, update-tests) side by side, then test-changes, a clean-code check, fixes and a last test pass.
- **`/test`**: Adds tests for changes made by hand: infer-requirements has you confirm what the changes are meant to do, then the tests are planned from that, written, run and triaged, and the coverage threshold met; failures the code causes are reported, never fixed.
- **`/infer-requirements`**: Works out what the uncommitted changes are meant to do, as requirements with acceptance criteria and the changed public units, and asks you until you confirm them.
- **`/write-spec`**: Turns requirements into a complete, unambiguous specification, asking about every gap.
- **`/write-plan`**: Researches the codebase and writes a plan of the code change, in file-specific tasks grouped into parallel waves.
- **`/write-test-plan`**: Plans the tests from the requirements alone: new cases, and which existing tests stay, change or go, each traced to a requirement and planned to meet the coverage threshold.
- **`/implement-requirements`**: Changes the project's code files, never its tests, until every requirement, finding or failing test given is proven met against a new verification checklist; each run is an independent request.
- **`/test-changes`**: Tests the uncommitted changes end to end: runs the related tests, gets the code fixed until every test the change broke passes (or, with `no-fix`, reports them), and meets the coverage threshold by planning and writing the tests the under-covered requirements lack.
- **`/run-tests`**: Runs the tests related to the uncommitted changes, or the full suite, and reports which pass and which fail.
- **`/triage-test-failures`**: Sorts failing tests into already failing and changed by this change, checking each against the original code.
- **`/update-tests`**: Writes, changes and deletes tests exactly as a test plan says, in the project's style, without reading the code under test.
- **`/check-coverage`**: Measures coverage against the project's threshold and reports what the change leaves uncovered.
- **`/onboard`**: Maps a project's architecture (files, imports, entry points, tiers) as an interactive HTML map.
- **`/scan`**: Scans a project for its commands, its own conventions and clean-code practices, its test setup and how it is run locally, and writes them to the project's config and rules.
- **`/scan-commands`**: Finds the project's install, run, build, test and other commands and stores them in one YAML file.
- **`/scan-conventions`**: Finds the conventions and clean-code practices a project actually follows and writes them as rule files, keeping hand-written rules.
- **`/scan-test-setup`**: Finds how a project's tests map to source files and its coverage threshold, and stores them in one YAML file.
- **`/scan-run-steps`**: Finds how a project is run for development, one route per development way (steps in order, what each starts, ports, readiness checks, env vars, teardown) and stores them in one YAML file, each traced to the repository.
- **`/check-clean-code`**: Checks code against the clean-code rules and writes a Markdown report; never edits code.
- **`/verify-claims`**: Verifies claims about code rigorously with multiple agents and evidence-backed answers.
- **`/draw-runbook`**: Draws the project's recorded run steps as an interactive HTML runbook.
- **`/monitor`**: Starts a local, read-only dashboard of the project's live Claude Code sessions and subagents.
- **`/commit`**: Suggests one commit message for the staged files; never runs git.
- **`/commits`**: Groups unstaged changes into logical commits and outputs the commands to run; never runs them.

## How to run the project?

From the root of the project that should get the harness, run:

```bash
curl -fsSL https://raw.githubusercontent.com/busycaesar/Harness/Master/install.sh | bash
```

This installs the harness into the project's `.claude/` folder. Run it again to update the harness. Files in `.claude/config/` and `.claude/rules/project/` are never overwritten, so your project's settings and rules survive updates.

Then open Claude Code in that project. The skills are available as slash commands.

## Author

[Dev J. Shah](https://github.com/busycaesar)
