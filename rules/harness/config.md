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
| `model-tiers`        | settings | `Budget: haiku`, `Mid: sonnet`, `Frontier: opus` |

- **Subagents.** Run at most `max_parallel_tasks` at once. They start cold: give each one, in its prompt, everything it needs. A subagent told to only read changes no file.
- **Model tiers.** Whenever a skill or command runs another skill, or a task, as a subagent, it reads the invoked skill's `metadata.model-tier` (for a generic fan-out subagent, the invoking skill's own tier unless the step says otherwise) and passes the model `model-tiers` maps it to. A skill run inline uses the current session's model.
- **Large projects.** Where a skill splits a large project across subagents, it splits the files by top-level folder.
