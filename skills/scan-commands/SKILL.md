---
name: scan-commands
description: Use when the user wants a project's own shell commands found and recorded — install, run per environment, build, test (all, one file, one test), lint, format, typecheck and others such as migrations or starting services. Scans the project's files (CI, task files, containers, manifests, docs) and writes one YAML file with each command, the folder to run it from, what it needs first and the file it came from. Reads only: it does not run, verify or fix commands, and does not write docs or agent config.
metadata:
  model-tier: Budget
---

# Project commands

Scan the project and write the commands it uses into one YAML file, one section per app or package.

Reads and records only: runs none of the commands it finds and asks the user nothing. Changes no file except the commands file, and runs no git command except the listing in Step 2.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`, with the evidence as the only source: every command, environment name, folder and package manager traces to the file and line or key it came from. A gap is not asked about: the category is left out of the file and listed as missing in the report.

## Step 1: Settings

1. Read the `project-commands` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/config/project-commands.yaml`.
2. If that file exists, read it and set aside every entry with `source: manual`. If it cannot be parsed as YAML, stop without writing and report the parse error, so no manual entry is lost.

## Step 2: List the files

- In a git repository, list them with `git ls-files --cached --others --exclude-standard`, then drop any that no longer exist on disk.
- Otherwise, list every file, skipping `.git` and everything `.gitignore` excludes.

## Step 3: Find the apps

- One section per app or package that has its own manifest or task file, plus the project root when it has commands of its own.
- Take the members from the workspace definition when there is one (a workspaces field in the root manifest or a workspace file). Otherwise each folder with its own manifest is a section.
- A project with a single app has one section, with path `.`.

## Step 4: Find the commands

Read the sources for each section. Sources disagree when they give different commands for the same section and key; record the one from the most trusted source:

1. **CI workflows**: the shell commands the pipelines actually run, with the env vars, services and earlier steps they rely on.
2. **Task files**: the script or task definitions in manifests and task runners (scripts in a package manifest, Makefile, justfile, Taskfile, task sections of a build or project file, test-runner configs, and their equivalents).
3. **Containers**: compose files and Dockerfiles, for starting services and the commands they run.
4. **Manifests and lockfiles**: to settle the package manager and the language toolchain. A lockfile or a package-manager field names the tool; write commands with that tool.
5. **Docs**: README, CONTRIBUTING and similar, last, because they go stale.

When two sources of the same rank disagree (e.g. two CI jobs), record neither and report both. A command that invokes a task-file script or target which does not exist is dropped and reported as stale.

For each section, record what it has of:

- `install`: installing dependencies.
- `run`: one entry per environment the evidence names (e.g. dev, staging, prod), keyed by that name.
- `build`.
- `test`: `all`; and `file` and `name`, running one file or one test by name, only where the test tooling the project uses supports it. Write the argument as `{file}` or `{name}`.
- `lint`, `format`, `typecheck`.
- `other`: anything else found, such as migrations, seeding, code generation or starting services, each under a short name for what it does.

For each command, record:

- `command`: exactly as a shell runs it. A task-file script is written as its runner invokes it.
- `cwd`: the folder to run it from, relative to the project root.
- `needs`: what must be in place first, from the evidence: env vars by name only (never their values), files (e.g. `.env` copied from `.env.example`), running services. Omit when nothing is needed.
- `source`: the file and the line or key it came from.

## Step 5: Write the file

If no command was found and no manual entry was set aside, write nothing (an existing file is left as is) and report that no commands were found, with the files that were read.

1. Write the file from [project-commands-template.yaml](project-commands-template.yaml), keeping its header comments. Comments go on the line above, never at the end of a line.
2. Put back every `manual` entry set aside in Step 1 under the same section and key, keeping its section even if the scan found none. Where a discovered entry has the same section and key, the manual one stays and the discovered one is dropped.
3. An existing file is otherwise replaced.
4. Re-read the written file. Each discovered entry's `source` exists and shows that command at that line or key, its `cwd` exists and its `needs` holds no env var values; each manual entry set aside is present unchanged. Drop or restore any entry that fails.

## Step 6: Report

- The file's path.
- Per section: its path and the commands found, by category, each with its source.
- Per section: the categories with no command found.
- Each disagreement between sources: the command recorded (or none, for same-rank sources) and the one passed over, with both sources.
- Each command dropped as stale, with its source.
- Each manual entry kept.
