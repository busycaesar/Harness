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

- **`/skill-improve`** (this repo only): scores the harness skills, learns from similar skills elsewhere and keeps only the changes that raise the score.

## Skills and commands

- **`/dev`**: Takes requirements all the way to implemented changes by running spec, plan and implement in order, then a clean-code check.
- **`/spec`**: Turns requirements into a complete, unambiguous specification, asking about every gap.
- **`/plan`**: Researches the codebase and writes a plan of file-specific tasks grouped into parallel waves.
- **`/implement`**: Changes the project's files until every requirement is proven met against a verification checklist.
- **`/onboard`**: Maps a project's architecture (files, imports, entry points, tiers) as an interactive HTML map.
- **`/scan-commands`**: Finds the project's install, run, build, test and other commands and stores them in one YAML file.
- **`/clean-code`**: Checks code against the clean-code rules and writes a Markdown report; never edits code.
- **`/deep-verify`**: Verifies claims about code rigorously with multiple agents and evidence-backed answers.
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
