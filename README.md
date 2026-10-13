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

## Features

- **`/dev`**: takes requirements from a prompt, ticket or file through `spec`, `plan` and `implement` to working changes.
- **`/skill-improve`** (this repo only): scores the harness skills, learns from similar skills elsewhere and keeps only the changes that raise the score.

## Project Structure

```text
.
 skills/                         # Harness skills, copied into a project's .claude/skills/
 ├── spec/                       # Requirements → unambiguous spec; asks about every gap
 ├── plan/                       # Requirements → file-specific tasks grouped into parallel waves
 ├── checklist/                  # Hidden helper: requirements → checklist with a proof per item
 ├── implement/                  # Builds the checklist, implements, ticks items with evidence
 ├── dev/                        # /dev: runs spec → plan → implement, resumable
 └── onboard/                    # Interactive HTML map of folders, files and imports
 config/                         # Copied into a project's .claude/config/
 ├── paths.yaml                  # Where skills write their output (work items, project map)
 └── settings.yaml               # Tuning, e.g. max_parallel_tasks
 .claude/                        # Maintenance tooling for this repo only; not copied into projects
 ├── skills/                     # /skill-improve and its steps: bench, find, adopt, report
 ├── rules/
 │    └── skill-conventions.md   # Design decisions every harness skill must follow
 ├── config/
 │    └── skill-improve.yaml     # Source budget and judge settings for /skill-improve
 ├── rubric.md                   # Locked scoring rubric for harness skills
 └── settings.json               # Deny rule that locks the rubric
```

## How to run the project?

From the root of the project that should get the harness, run:

```bash
curl -fsSL https://raw.githubusercontent.com/busycaesar/Harness/Master/install.sh | bash
```

This installs the harness into the project's `.claude/` folder. Run it again to update the harness. Files in `.claude/config/` and `.claude/rules/project/` are never overwritten, so your project's settings and rules survive updates.

Then open Claude Code in that project. The skills are available as slash commands.

## Author

[Dev J. Shah](https://github.com/busycaesar)
