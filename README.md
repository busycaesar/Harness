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
 └── dev/                        # /dev: runs spec → plan → implement, resumable
 config/                         # Copied into a project's .claude/config/
 ├── paths.yaml                  # Where skills write their documents (work-items folder)
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

Clone this repo, then copy the harness into your project's `.claude/` folder:

```bash
mkdir -p <project>/.claude && cp -r skills config <project>/.claude/
```

Open Claude Code in that project. The skills are available as slash commands, for example `/dev`.

## Author

[Dev J. Shah](https://github.com/busycaesar)
