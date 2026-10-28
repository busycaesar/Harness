# Harness config

- **Paths and settings.** Harness paths are keys in `.claude/config/paths.yaml`, relative to the project root; settings are keys in `.claude/config/settings.yaml`. When the file or the key is missing, use the default:

| Key                  | File     | Default                                |
| -------------------- | -------- | -------------------------------------- |
| `work-items`         | paths    | `.claude/work-items/`                  |
| `project-commands`   | paths    | `.claude/config/project-commands.yaml` |
| `test-setup`         | paths    | `.claude/config/test-setup.yaml`       |
| `run-steps`          | paths    | `.claude/config/run-steps.yaml`        |
| `project-rules`      | paths    | `.claude/rules/project/`               |
| `clean-code`         | paths    | `clean-code-report.md`                 |
| `clean-code-rules`   | paths    | `.claude/rules/harness/clean-code/`    |
| `onboard`            | paths    | `project-map.html`                     |
| `runbook`            | paths    | `runbook.html`                         |
| `max_parallel_tasks` | settings | `4`                                    |

- **Subagents.** Run at most `max_parallel_tasks` at once. They start cold: give each one, in its prompt, everything it needs. A subagent told to only read changes no file.
- **Large projects.** Where a skill splits a large project across subagents, it splits the files by top-level folder.
