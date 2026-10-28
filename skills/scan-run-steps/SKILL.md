---
name: scan-run-steps
description: Use when how a project is run for development should be found and recorded — one route per development way (e.g. local, a dev container), each with its steps in order (which commands, which come first, which can run in parallel), what each starts, the ports it claims, how to tell it is ready, the environment variables it needs, the failures the project already documents, and how to stop and reset it. Scans the recorded project commands and the repository (containers, CI, docs, env samples) and writes one YAML file with each finding and the file it came from. Reads only: it runs, starts and stops nothing.
argument-hint: "[folder to read, default: the whole project]"
metadata:
  model-tier: Mid
---

# Run steps

Scan the project and write how it is run for development, one route per development way, each in order, into one YAML file.

Reads and records only: runs none of the commands it finds and asks the user nothing. Changes no file except the run steps file.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`, with the evidence as the only source: every command comes from the recorded project commands or, for a check or teardown they lack, from a file in the repository. Where a command is real but its order, port or readiness check is inferred, or the project commands file marks it `inferred`, record it with `unverified` naming that part and what it rests on. A gap is recorded under `unresolved`.

## Step 1: Settings

1. Read the `run-steps`, `project-commands` and `max_parallel_tasks` keys (see `.claude/rules/harness/config.md`).
2. If the run steps file exists, set aside its manual entries (see `.claude/rules/harness/recorded-files.md`).
3. If `$ARGUMENTS` names a folder, read only that folder. Otherwise read the whole project.

## Step 2: Read the commands

1. If the project commands file does not exist and the caller did not say the project's commands were just scanned, invoke the `scan-commands` skill, then continue. If it still does not exist, there are no commands to make steps from.
2. Read it. Each entry gives the command, its `cwd`, what it `requires` first (the same shape as a step's `requires`), whether it is `inferred`, and its `source`. Keep only the sections (see `.claude/rules/harness/project-sections.md`) inside the folder from Step 1.

## Step 3: Read what surrounds them

List the project's files (see `.claude/rules/harness/project-files.md`) and read:

- **Containers**: dev-container configs, compose files and Dockerfiles, for services, published ports, health checks and `depends_on` conditions.
- **CI workflows and setup docs**: the order steps run in. Where they disagree, prefer CI and note the disagreement: a workflow that still passes is a sequence that still works.
- **Env samples**: the variables each step needs, and which have no default.
- **Troubleshooting docs, comments beside a command, scripts that check a precondition and exit with a message**: the failures the project already knows about.
- **Stop and reset commands.**

For a large project, split this reading across read-only subagents (see `.claude/rules/harness/config.md`). Each returns what it found with its file and line.

## Step 4: Work out each step

One route per development way recorded under `dev`, named `<section>/<way>` by its section's `name` and the way's key, or just `<way>` when the project commands file has a single section. Route names are unique. A route's steps are only the commands needed to get the project running that way: the way's `install`, the setting up or configuring and the services it depends on (from `other`) that the evidence ties to that way, and the way's `run`, plus `build` only where the evidence says that run needs it first. A step two routes need is repeated in each, so every route reads on its own. Lint, format, typecheck, test, publishing, and the ways under `run` are not steps. With no development way recorded, record that under `unresolved`.

The order is the product. For every step of each route, establish:

- **Kind.** A command that claims no port and exits is a `task`; one that keeps running is a `service`.
- **Starts what.** The process or container, and the port it claims.
- **Needs what.** The steps that must already be running, and in what state. "Once the database reports healthy" is a `gate`; "after step 1" is not. Take gates from health checks and `depends_on` conditions where they are declared.
- **How to tell it worked.** A check the reader can run: a health endpoint, a status subcommand, a port that answers. With none in the repository, omit `verify` and say so in `unverified`.
- **Requires.** Variables without a default, credentials, files that must exist.
- **Terminal.** `own` for a foreground service, which blocks the terminal it runs in, or for an interactive task that prompts the user; otherwise `shared`.
- **Fails.** Each known failure attached to the step it breaks; one with no step is left out.

Step ids are unique within a route. Two steps are parallel only when neither needs the other, directly or through a third.

Each route has its own teardown, which keeps stopping and resetting apart: for each command, `destroys` says what it loses, or is null. A route with no teardown found has `teardown: []` and an `unresolved` entry.

## Step 5: Write the file

If no step was found and no manual entry was set aside, write nothing (an existing file is left as is) and report that no run steps were found, with the files that were read.

1. Write the file from [run-steps-template.yaml](run-steps-template.yaml), putting back the manual entries set aside in Step 1, as `.claude/rules/harness/recorded-files.md` says.
2. Re-read it as that rule says. Also check that every id in `needs` is a step in the same route, that `needs` has no cycle, and that `requires` holds no values; drop any entry that fails.

## Step 6: Report

- The file's path.
- Per route: its name and its sequence in one line, step titles in order, parallel steps joined.
- Per route, every port it claims, so a collision is visible before the first run.
- Each step whose order, gate or readiness check was inferred, with what it rests on.
- Each disagreement between CI and docs, with both sources.
- Each thing in `unresolved`, with what would settle it.
- Each manual entry kept.
