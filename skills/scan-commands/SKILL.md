---
name: scan-commands
description: Use when the user wants a project's own shell commands found and recorded — the development ways (each with its install and run, e.g. local and a dev container), other ways of running (container, production), build, test (all, one file, one test, with coverage), lint, format, typecheck and others such as migrations or starting services. Scans the project's files (CI, task files and scripts, docs, containers) and, where none states a command, infers it from manifests, lockfiles, entry points and framework config; writes one YAML file with each command, the folder to run it from, what it requires first and the file it came from. Reads only: it does not run, verify or fix commands, and does not write docs or agent config.
metadata:
  model-tier: Budget
---

# Project commands

Scan the project and write the commands it uses into one YAML file, one section per app or package.

Reads and records only: runs none of the commands it finds and asks the user nothing. Changes no file except the commands file, and runs no git command except the listing in Step 2.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`, with the evidence as the only source: every command, way of running, folder and package manager traces to the file and line or key it came from, or, for an inferred command, to the files it rests on. A gap is recorded as not found: the category, optional in the template, is left out of the file and listed as missing in the report.

## Step 1: Settings

1. Read the `project-commands` path (see `.claude/rules/harness/config.md`).
2. If that file exists, set aside its manual entries (see `.claude/rules/harness/recorded-files.md`).

## Step 2: List the files

List the project's files (see `.claude/rules/harness/project-files.md`).

## Step 3: Find the apps

One section per app or package: the project's sections (see `.claude/rules/harness/project-sections.md`), plus the project root when it has commands of its own.

## Step 4: Find the commands

Read the sources for each section. Sources disagree when they give different commands for the same section and key; record the one from the source highest in this list:

1. **CI workflows**: the shell commands the pipelines actually run, with the env vars, services and earlier steps they rely on.
2. **Task files**: the script or task definitions in manifests and task runners (scripts in a package manifest, Makefile, justfile, Taskfile, task sections of a build or project file, test-runner configs, and their equivalents), and the shell scripts in the repository (e.g. `scripts/*.sh`), each recorded as running the script (e.g. `bash scripts/setup.sh`).
3. **Docs**: README, CONTRIBUTING and similar, below the others because they go stale. Where a doc states a substitution explicitly (e.g. "replace `<tool>` with `<command>`" for the commands it gives), apply it and cite both lines in `source`.
4. **The project's own files**, only for a category nothing above states: infer the command from manifests, lockfiles, entry points and framework config (e.g. a `package-lock.json` gives npm's standard install; an entry point gives running it with its language's interpreter). Record it with `inferred: true` and, as `source`, the files it rests on. Likewise, once the evidence establishes the test tool, its standard command-line forms for running one file or one test may give `test.file` and `test.name`, inferred, with that evidence as `source`. Where these files do not settle one command, leave it out and report it.

**Containers** (dev-container configs, compose files and Dockerfiles) are read apart from this list. One gives a development way under `dev` only when the evidence says it is for development: a dev-container config, a compose file or script named or documented for development, or docs saying so; the existence of a container file alone never does. Otherwise it gives the `container` way under `run`. The services it starts go under `other`. A container never gives the install or run of a development way that does not use it.

Manifests and lockfiles also settle the package manager and the language toolchain: a lockfile or a package-manager field names the tool, else a doc that names it or an install command that uses it, cited in `source`; write every command with that tool. With none of these, omit `package_manager`.

When two sources of the same rank disagree (e.g. two CI jobs), record neither and report both. A command that invokes a task-file script or target which does not exist is dropped and reported as stale.

For each section, record what it has of:

- `dev`: one entry per development way, a way meant for working on the code (e.g. a dev server, a watch mode, running the entry point directly, a dev container), taken from the evidence; with no evidence of any, there is no `dev` key. Key each by the name the evidence gives it (e.g. a dev-container config's name, the compose file's or script's name); the way that runs on the host, without a container, is `local`. Each has what the evidence gives of:
  - `install`: installing dependencies for that way. Where ways share one install, each repeats it.
  - `run`: running the project that way.
- `run`: one entry per other way of running, never one meant for development (e.g. `container`, `prod`), keyed by the variant the evidence names, else by the task-file script's name.
- `build`.
- `test`: `all`; and `file` and `name`, running one file or one test by name, only where the test tooling the project uses supports it. Write the argument as `{file}` or `{name}`. `coverage`: running the tests with coverage measured.
- `lint`, `format`, `typecheck`.
- `other`: anything else found, such as migrations, seeding, code generation or starting services, each under a short name for what it does.

For each command, record:

- `command`: exactly as a shell runs it. A task-file script is written as its runner invokes it.
- `cwd`: the folder to run it from, relative to the project root.
- `requires`: what must be in place first, from the evidence, each with a `name` (an env var by name only, never its value; a file, e.g. `.env` copied from `.env.example`; a running service), an optional `note` and its `source`. Omit when nothing is required.
- `inferred`: `true` for a command inferred from the project's own files; omitted otherwise.
- `source`: the file and the line or key it came from; for an inferred command, the files it rests on.

## Step 5: Write the file

If no command was found and no manual entry was set aside, write nothing (an existing file is left as is) and report that no commands were found, with the files that were read.

1. Write the file from [project-commands-template.yaml](project-commands-template.yaml), putting back the manual entries set aside in Step 1, as `.claude/rules/harness/recorded-files.md` says.
2. Re-read it as that rule says. Also check that each discovered entry's `cwd` exists and its `requires` holds no env var values; drop any entry that fails.

## Step 6: Report

- The file's path.
- Per section: its path and the commands found, by category, each with its source.
- Per section: the categories with no command found, and each inferred command with the files it rests on.
- Each disagreement between sources: the command recorded (or none, for same-rank sources) and the one passed over, with both sources.
- Each command dropped as stale, with its source.
- Each manual entry kept.
