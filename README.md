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

Run what is in the first column. It runs everything beside it for you; run one of those on its own only to redo or check that part.

### Getting started

<table>
<tr><th>Run</th><th>Runs for you</th><th>What that does</th></tr>
<tr><td rowspan="4"><code>/scan</code><br>Scans a project for its commands, its own conventions and clean-code practices, its test setup and how it is run locally, and writes them to the project's config and rules.</td><td><code>/scan-commands</code></td><td>Finds the project's install, run, build, test and other commands and stores them in one YAML file.</td></tr>
<tr><td><code>/scan-conventions</code></td><td>Finds the conventions and clean-code practices a project actually follows and writes them as rule files, keeping hand-written rules.</td></tr>
<tr><td><code>/scan-test-setup</code></td><td>Finds how a project's tests map to source files and its coverage threshold, and stores them in one YAML file.</td></tr>
<tr><td><code>/scan-run-steps</code></td><td>Finds how a project is run for development, one route per development way (steps in order, what each starts, ports, readiness checks, env vars, teardown) and stores them in one YAML file, each traced to the repository.</td></tr>
<tr><td><code>/onboard</code><br>Maps a project's architecture (files, imports, entry points, tiers) as an interactive HTML map.</td><td><code>/draw-architecture-map</code></td><td>Draws a project's architecture as an interactive HTML map.</td></tr>
<tr><td><code>/draw-runbook</code><br>Draws the project's recorded run steps as an interactive HTML runbook.</td><td><code>/scan-run-steps</code></td><td>Finds how a project is run for development, one route per development way (steps in order, what each starts, ports, readiness checks, env vars, teardown) and stores them in one YAML file, each traced to the repository.</td></tr>
</table>

### Building a change

<table>
<tr><th>Run</th><th>Runs for you</th><th>What that does</th></tr>
<tr><td rowspan="7"><code>/dev</code><br>Takes requirements all the way to implemented, tested changes: write-spec, write-plan, then the code (implement-requirements) and its tests (write-test-plan, update-tests) side by side, then test-changes, a clean-code check, fixes and a last test pass.</td><td><code>/write-spec</code></td><td>Turns requirements into a complete, unambiguous specification, asking about every gap.</td></tr>
<tr><td><code>/write-plan</code></td><td>Researches the codebase and writes a plan of the code change, in file-specific tasks grouped into parallel waves.</td></tr>
<tr><td><code>/implement-requirements</code></td><td>Changes the project's code files, never its tests, until every requirement, finding or failing test given is proven met against a new verification checklist; each run is an independent request.</td></tr>
<tr><td><code>/write-test-plan</code></td><td>Plans the tests from the requirements alone: new cases, and which existing tests stay, change or go, each traced to a requirement and planned to meet the coverage threshold.</td></tr>
<tr><td><code>/update-tests</code></td><td>Writes, changes and deletes tests exactly as a test plan says, in the project's style, without reading the code under test.</td></tr>
<tr><td><code>/test-changes</code></td><td>Tests the uncommitted changes end to end: runs the related tests, gets the code fixed until every test the change broke passes (or, with <code>no-fix</code>, reports them), and meets the coverage threshold by planning and writing the tests the under-covered requirements lack.</td></tr>
<tr><td><code>/check-clean-code</code></td><td>Checks code against the clean-code rules and writes a Markdown report; never edits code.</td></tr>
<tr><td><code>/implement-requirements</code><br>Changes the project's code files, never its tests, until every requirement, finding or failing test given is proven met against a new verification checklist; each run is an independent request.</td><td><code>/write-checklist</code></td><td>Writes a verification checklist for requirements, each item with an automated proof.</td></tr>
</table>

### Testing

<table>
<tr><th>Run</th><th>Runs for you</th><th>What that does</th></tr>
<tr><td rowspan="4"><code>/test</code><br>Adds tests for changes made by hand: infer-requirements has you confirm what the changes are meant to do, then the tests are planned from that, written, run and triaged, and the coverage threshold met; failures the code causes are reported, never fixed.</td><td><code>/infer-requirements</code></td><td>Works out what the uncommitted changes are meant to do, as requirements with acceptance criteria and the changed public units, and asks you until you confirm them.</td></tr>
<tr><td><code>/write-test-plan</code></td><td>Plans the tests from the requirements alone: new cases, and which existing tests stay, change or go, each traced to a requirement and planned to meet the coverage threshold.</td></tr>
<tr><td><code>/update-tests</code></td><td>Writes, changes and deletes tests exactly as a test plan says, in the project's style, without reading the code under test.</td></tr>
<tr><td><code>/test-changes</code></td><td>Tests the uncommitted changes end to end: runs the related tests, gets the code fixed until every test the change broke passes (or, with <code>no-fix</code>, reports them), and meets the coverage threshold by planning and writing the tests the under-covered requirements lack.</td></tr>
<tr><td rowspan="6"><code>/test-changes</code><br>Tests the uncommitted changes end to end: runs the related tests, gets the code fixed until every test the change broke passes (or, with <code>no-fix</code>, reports them), and meets the coverage threshold by planning and writing the tests the under-covered requirements lack.</td><td><code>/run-tests</code></td><td>Runs the tests related to the uncommitted changes, or the full suite, and reports which pass and which fail.</td></tr>
<tr><td><code>/triage-test-failures</code></td><td>Sorts failing tests into already failing and changed by this change, checking each against the original code.</td></tr>
<tr><td><code>/implement-requirements</code></td><td>Changes the project's code files, never its tests, until every requirement, finding or failing test given is proven met against a new verification checklist; each run is an independent request.</td></tr>
<tr><td><code>/check-coverage</code></td><td>Measures coverage against the project's threshold and reports what the change leaves uncovered.</td></tr>
<tr><td><code>/write-test-plan</code></td><td>Plans the tests from the requirements alone: new cases, and which existing tests stay, change or go, each traced to a requirement and planned to meet the coverage threshold.</td></tr>
<tr><td><code>/update-tests</code></td><td>Writes, changes and deletes tests exactly as a test plan says, in the project's style, without reading the code under test.</td></tr>
</table>

### Reviewing

<table>
<tr><th>Run</th><th>Runs for you</th><th>What that does</th></tr>
<tr><td><code>/check-clean-code</code><br>Checks code against the clean-code rules and writes a Markdown report; never edits code.</td><td>—</td><td>—</td></tr>
<tr><td><code>/verify-claims</code><br>Verifies claims about code rigorously with multiple agents and evidence-backed answers.</td><td>—</td><td>—</td></tr>
</table>

### Committing

<table>
<tr><th>Run</th><th>Runs for you</th><th>What that does</th></tr>
<tr><td><code>/commit</code><br>Suggests one commit message for the staged files; never runs git.</td><td>—</td><td>—</td></tr>
<tr><td><code>/commits</code><br>Groups unstaged changes into logical commits and outputs the commands to run; never runs them.</td><td>—</td><td>—</td></tr>
</table>

### Watching sessions

<table>
<tr><th>Run</th><th>Runs for you</th><th>What that does</th></tr>
<tr><td><code>/monitor</code><br>Starts a local, read-only dashboard of the project's live Claude Code sessions and subagents.</td><td>—</td><td>—</td></tr>
</table>

## How to run the project?

From the root of the project that should get the harness, run:

```bash
curl -fsSL https://raw.githubusercontent.com/busycaesar/Harness/Master/install.sh | bash
```

This installs the harness into the project's `.claude/` folder. Run it again to update the harness. Files in `.claude/config/` and `.claude/rules/project/` are never overwritten, so your project's settings and rules survive updates.

Then open Claude Code in that project. The skills are available as slash commands.

## Author

[Dev J. Shah](https://github.com/busycaesar)
