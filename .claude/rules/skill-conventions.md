# Skill conventions

Design decisions every harness skill in `skills/` and command in `commands/` must follow; in this file, "skill" covers both. They were made on purpose: do not "improve" a skill by breaking one, even if another harness does it differently. To change a convention, the user changes this file.

## Isolation

- A skill never names, references or hints at another skill, or at what happens before or after it.
- Three exceptions only: `implement` invokes `checklist`, `onboard` invokes `architecture-design`, and `dev` invokes `spec`, `plan` and `implement` in that order.
- A skill accepts its input in any reasonable form (prompt, ticket body, file) and does not care which skill, if any, produced it.

## Behaviour

- **Never assume.** Every statement a skill writes traces to the requirements, the codebase or an answer from the user. Gaps are asked about, never filled with defaults.
- **No approval gates.** A skill produces its output and stops. It asks the user questions only to resolve gaps or consequential choices, not for sign-off on its own output. (Exception: `spec` asks the user to approve the final spec, because the spec is the user's statement of intent.)
- **Each skill writes only its own output.** `spec` writes the spec, `plan` the plan, `checklist` the checklist. `implement` changes project files and ticks checklist items.
- **No git state changes.** No skill stages, commits, stashes, branches, resets or checks out. Read-only git commands are fine.
- `spec` says **what**, never how. `plan` says **how**. A final spec has no open questions.
- `checklist` covers requirements only: no build, lint or full-test-suite items. It never writes a checklist that has gaps, and never touches an existing one.
- `implement` builds its checklist from the requirements, never from a plan, and never weakens a proof to make it pass.

## Generic, not project-specific

- No hardcoded stack, language, framework, package manager, command or branch name. Project-specific facts come from the project's codebase, its `.claude/rules/` or its `.claude/config/`.
- Paths come from `.claude/config/paths.yaml`; settings from `.claude/config/settings.yaml`. A skill may state the default it falls back to when a key is missing.
- A work item's documents live together in `<work-items>/<slug>/`.

## Format

- Claude Code skill format: `skills/<name>/SKILL.md` with `name` and `description` frontmatter; templates and supporting files sit in the same folder and are linked from `SKILL.md`.
- Claude Code command format: `commands/<name>.md` with `description` frontmatter.
- A command is a single file that only the user triggers and nothing invokes. Anything with supporting files, or that a skill or command invokes, is a skill.
- No Cursor-era formats: no `.mdc`, `alwaysApply` or `globs`.
- Do not add `disable-model-invocation: true` to a skill that another skill invokes; it would block that call.
- Concise: every line earns its place. No padding, no repeated instructions, no motivational text.
