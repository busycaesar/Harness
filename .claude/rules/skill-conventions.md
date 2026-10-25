# Skill conventions

Design decisions every harness skill in `skills/` and command in `commands/` must follow; in this file, "skill" covers both. They were made on purpose: do not "improve" a skill by breaking one, even if another harness does it differently. To change a convention, the user changes this file.

## Isolation

- A skill never names, references or hints at another skill, or at what happens before or after it.
- Five exceptions only: `implement-requirements` invokes `write-checklist`; `onboard` invokes `draw-architecture-map`; `dev` invokes `write-spec`, `write-plan`, `implement-requirements`, `test-changes` and `check-clean-code` in that order, then `implement-requirements` again for the findings the user chooses to fix and `test-changes` again in full; `scan` invokes `scan-commands`, `scan-conventions` and `scan-test-setup` in parallel; `test-changes` invokes `run-tests`, `triage-test-failures`, `implement-requirements`, `update-tests` and `check-coverage`.
- A skill accepts its input in any reasonable form (prompt, ticket body, file) and does not care which skill, if any, produced it.

## Behaviour

- **Never assume.** Skills follow the never-assume rule in `rules/harness/never-assume.md`, including its exception for choices the user explicitly delegates.
- **No approval gates.** A skill produces its output and stops. It asks the user questions only to resolve gaps or consequential choices, not for sign-off on its own output. (Exception: `write-spec` asks the user to approve the final spec, because the spec is the user's statement of intent.)
- **Each skill writes only its own output.** `write-spec` writes the spec, `write-plan` the plan, `write-checklist` the checklist. `implement-requirements` changes project files and ticks checklist items. `scan-conventions` writes only the rule files under the project rules folder and never erases their existing content. `scan-test-setup` writes only the test setup file. `update-tests` changes test files only. `run-tests`, `triage-test-failures` and `check-coverage` change no project file. `test-changes` changes none itself, except to undo fix rounds that did not work.
- **No git state changes.** No skill stages, commits, stashes, branches, resets or checks out. Read-only git commands are fine.
- `write-spec` says **what**, never how. `write-plan` says **how**. A final spec has no open questions.
- `write-checklist` covers requirements only: no build, lint or full-test-suite items. It never writes a checklist that has gaps, and never touches an existing one.
- `implement-requirements` builds its checklist from the requirements, never from a plan, and never weakens a proof to make it pass.

## Generic, not project-specific

- No hardcoded stack, language, framework, package manager, command or branch name. Project-specific facts come from the project's codebase, its `.claude/rules/` or its `.claude/config/`.
- Paths come from `.claude/config/paths.yaml`; settings from `.claude/config/settings.yaml`. A skill may state the default it falls back to when a key is missing.
- A work item's documents live together in `<work-items>/<slug>/`.

## Format

- Claude Code skill format: `skills/<name>/SKILL.md` with `name` and `description` frontmatter; templates and supporting files sit in the same folder and are linked from `SKILL.md`.
- Claude Code command format: `commands/<name>.md` with `description` frontmatter.
- A command is a single file that only the user triggers and nothing invokes. Anything with supporting files, or that a skill or command invokes, is a skill.
- Naming: a command is one word, what the user types. A skill is verb-object, kebab-case, lowercase, and its verb says the kind of work: `write-` produces a document, `draw-` an HTML visual, `scan-` reads the project and records facts, `check-` reports only and never edits; any other verb names the work it does (`implement`, `run`, `triage`, `update`, `test`).
- No Cursor-era formats: no `.mdc`, `alwaysApply` or `globs`.
- Do not add `disable-model-invocation: true` to a skill that another skill invokes; it would block that call.
- Every skill declares `metadata.model-tier` in its frontmatter: `Budget`, `Mid` or `Frontier`. It records how much reasoning the work needs, so the choice survives models being renamed or replaced. Which model each tier resolves to lives only in `.claude/config/settings.yaml`.
- Concise: every line earns its place. No padding, no repeated instructions, no motivational text.
