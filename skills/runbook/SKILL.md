---
name: runbook
description: Work out how to run a project locally and draw it as an interactive HTML runbook — every command in the order it must run, what each one starts, which ports it claims, how to tell it actually came up, and how to tear it down. Use when someone needs to get an unfamiliar project running, asks how to start it locally, wants the setup steps documented, or asks for a local-dev guide.
argument-hint: "[folder to read, default: the whole project]"
---

# Runbook

Find out how this project is run locally, in what order, and prove each step from the repository. Draw the result as one self-contained HTML page.

Changes no file except the runbook itself. Starts nothing and stops nothing unless the user asks.

## The one rule: never invent a command

Every command on the page comes from a file in the repository. A command nobody wrote down is not a command: if the project has no discoverable way to do something, say so in the report rather than guessing at one that looks plausible.

A plausible wrong command is worse than an admitted gap. The reader runs it, it fails, and now they distrust the whole page.

Where a command is real but its ordering, port or readiness check is inferred, mark that part unverified and say what it rests on.

## Step 1: Settings

1. Read the `runbook` path from `.claude/config/paths.yaml`. If the file or key is missing, use `runbook.html` at the project root. An existing runbook at that path is replaced.
2. Read `max_parallel_tasks` from `.claude/config/settings.yaml`. If missing, use 4.
3. If `$ARGUMENTS` names a folder, read only that folder. Otherwise read the whole project.

## Step 2: Find the sources of truth

Read what the project already states about running itself. Each is evidence; none is automatically right.

| Source | Carries |
|---|---|
| Container composition (`compose.yaml`, `docker-compose.yml`) | Services, images, published ports, health checks, profiles, dependency order |
| Package manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `*.csproj`, `Gemfile`) | Scripts, entry points, console commands |
| Task runners (`Makefile`, `Taskfile`, `justfile`, `*.sh` at the root, `Procfile`) | Named targets that wrap the real commands |
| Setup prose (`README`, `QUICKSTART`, `CONTRIBUTING`, `docs/`) | Order, prerequisites, the steps no file encodes |
| Environment samples (`.env.example`, `*.env.sample`) | Variables that must be set before anything starts |
| Agent instructions (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`) | Commands the team already treats as canonical |
| CI workflows | The one place the full sequence is known to work, because a machine runs it |

CI deserves weight. A README goes stale silently; a workflow that still passes is a command that still works. Where prose and CI disagree, prefer CI and note the disagreement.

For a large project, split the search across subagents by top-level folder, at most `max_parallel_tasks` at once. Each returns the commands it found with their file and line. Subagents only read.

## Step 3: Work out what each command needs

A list of commands is not a runbook. The order is the product.

For every command, establish:

- **Starts what.** The process or container, and the port it claims. A command that claims no port and exits is a task, not a service; mark it so, because the reader needs to know whether to keep the terminal open.
- **Needs what.** The steps that must already be running, and *in what state*. "After step 1" is weak. "Once the database reports healthy" is a gate the reader can check. Read health checks and `depends_on` conditions where the composition declares them.
- **How to tell it worked.** A command that printed something is not a service that is up. Prefer a check the reader can run: a health endpoint, a status subcommand, a port that now answers. If the repository defines no such check, say so.
- **What it needs set first.** Variables without a default, credentials, a file that must exist.

Two steps are parallel only when neither needs the other, directly or through a third. Say which can share a terminal and which need their own, because a foreground server blocks the one it runs in.

## Step 4: Collect the failures the project already knows about

A first run fails in ways the team has already hit. Take them from the repository, not from imagination: troubleshooting docs, comments beside a command, scripts that check a precondition and exit with a message.

Attach each to the step it breaks. A fix with no step is noise.

## Step 5: Find the way back out

Find how to stop what the runbook started, and how to reset state. Separate the two: stopping a stack and destroying its data are different acts, and the reader must be able to tell which command does which. If removing volumes is destructive, say what is lost.

A runbook with no teardown leaves containers running for weeks.

## Step 6: Draw it

Write the findings to a temporary file outside the project, in this shape:

```json
{
  "project": "<project folder name>",
  "steps": [
    {
      "id": "infra",
      "title": "Start infrastructure",
      "command": "docker compose up -d",
      "cwd": ".",
      "kind": "service",
      "starts": [ { "name": "postgres", "port": 5432 } ],
      "needs": [],
      "gate": "postgres reports healthy",
      "verify": "docker compose ps",
      "requires": [ { "name": "DATABASE_URL", "note": "no default" } ],
      "terminal": "shared",
      "evidence": "docker-compose.yml:13",
      "unverified": null,
      "fails": [ { "symptom": "port already allocated", "fix": "…", "evidence": "docs/TROUBLESHOOTING.md:40" } ]
    }
  ],
  "teardown": [ { "command": "docker compose down", "destroys": null, "evidence": "README.md:88" } ],
  "unresolved": [ { "what": "how to seed the database", "why": "no script or doc found" } ]
}
```

`kind` is `service` (keeps running) or `task` (runs and exits). `needs` holds the ids of steps that must come first; steps with the same `needs` and no path between them are drawn as parallel. `gate` is the condition the reader waits for, not a duration. `terminal` is `shared` or `own`. `evidence` is `file:line` for the command itself. `unverified` is null, or a sentence naming the part that was inferred. `destroys` is null, or what the teardown command loses.

Then run [build.sh](build.sh) from this skill's folder:

```
bash <skill folder>/build.sh <data file> <runbook path>
```

Delete the temporary file afterwards.

## Step 7: Report

- The runbook's path, and that it opens in any browser.
- The sequence in one line: step titles in order, parallel steps joined.
- Every port the project claims, so a collision is visible before the first run.
- Each command that is real but whose order, gate or readiness check was inferred.
- Each thing in `unresolved`, with what would settle it.

## Running the commands

Off by default. The skill reads; it does not start the project.

Run them only when the user asks. Then: run each in order, record what actually happened, and mark every step that ran as verified by execution rather than by reading. A step that failed is reported as it failed, not quietly repaired.

Never run a teardown that destroys data, and never run a command the repository does not contain.
