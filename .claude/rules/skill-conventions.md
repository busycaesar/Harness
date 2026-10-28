# Skill conventions

Design decisions every harness skill in `skills/` and command in `commands/` must follow; in this file, "skill" covers both. They were made on purpose: do not "improve" a skill by breaking one, even if another harness does it differently. To change a convention, the user changes this file.

## Isolation

- A skill never names, references or hints at another skill, or at what happens before or after it.
- Eight exceptions only: `implement-requirements` invokes `write-checklist`; `onboard` invokes `draw-architecture-map`; `draw-runbook` invokes `scan-run-steps`; `scan-run-steps` invokes `scan-commands`; `dev` invokes `write-spec`, then `write-plan`, then `implement-requirements` in parallel with `write-test-plan` followed by `update-tests`, then `test-changes` and `check-clean-code`, then, for the findings the user chooses to fix, `implement-requirements` again for those in code files and `write-test-plan` followed by `update-tests` for those in test files, and `test-changes` again; `scan` invokes `scan-commands`, `scan-conventions` and `scan-test-setup` in parallel, then `scan-run-steps`; `test-changes` invokes `run-tests`, `triage-test-failures`, `implement-requirements`, `check-coverage`, `write-test-plan` and `update-tests`; `test` invokes `infer-requirements`, `write-test-plan`, `update-tests` and `test-changes`.
- A skill accepts its input in any reasonable form (prompt, ticket body, file) and does not care which skill, if any, produced it.
- A caller may pass context with the input (e.g. that a file was just scanned), and a skill may act on it, as long as the skill never names or depends on who passed it.

## Behaviour

- **Never assume.** Skills follow the never-assume rule in `rules/harness/never-assume.md`, including its exception for choices the user explicitly delegates.
- Exception: `onboard` decides the map's tiers and sections itself and does not ask.
- **No approval gates.** A skill produces its output and stops. It asks the user questions only to resolve gaps or consequential choices, not for sign-off on its own output. (Exception: `write-spec` asks the user to approve the final spec, because the spec is the user's statement of intent.)
- **Each skill writes only its own output.** `write-spec` writes the spec, `write-plan` the plan, `write-test-plan` the test plan, `write-checklist` the checklist, `infer-requirements` only its requirements file. `implement-requirements` changes code files only, never test files, and ticks the items of the checklist its run wrote. `scan-conventions` writes only the rule files under the project rules folder and never erases their existing content. `scan-test-setup` writes only the test setup file, `scan-run-steps` only the run steps file, and `draw-runbook` only the runbook. `update-tests` changes test files only, as its test plan says. `run-tests`, `triage-test-failures` and `check-coverage` change no project file. `test-changes` changes none itself, except to undo fix rounds that did not work.
- **No git state changes.** No skill stages, commits, stashes, branches, resets or checks out. Read-only git commands are fine.
- `write-spec` says **what**, never how. `write-plan` says **how** for the code only, never the tests. A final spec has no open questions.
- Tests come from the requirements, never from the code: `write-test-plan` plans them from the requirements and the public units given (planned or changed) only, and `update-tests` writes them from the test plan only; neither reads a code body. `infer-requirements` alone may read code (the uncommitted diff), only to draft requirements the user confirms; it never plans or writes tests.
- `write-checklist` covers requirements only: no build, lint or full-test-suite items, no proof that runs a test, and no manual proof: every proof is automated. It never writes a checklist that has gaps, though it lists, with why, any requirement it cannot prove automatically, and never touches an existing one.
- `implement-requirements` treats every run as a new request and reuses nothing from earlier runs. It builds a new checklist from the requirements (findings and failing tests included), never from a plan, and never weakens a proof to make it pass (`rules/harness/proofs.md`).

## Generic, not project-specific

- No hardcoded stack, language, framework, package manager, command or branch name. Project-specific facts come from the project's codebase, its `.claude/rules/` or its `.claude/config/`.
- Paths come from `.claude/config/paths.yaml`; settings from `.claude/config/settings.yaml`. A skill may state the default it falls back to when a key is missing.
- A work item's documents live together in `<work-items>/<number>/`.

## Format

- Claude Code skill format: `skills/<name>/SKILL.md` with `name` and `description` frontmatter; templates and supporting files sit in the same folder and are linked from `SKILL.md`.
- Claude Code command format: `commands/<name>.md` with `description` frontmatter.
- A command is a single file that only the user triggers and nothing invokes. Anything with supporting files, or that a skill or command invokes, is a skill.
- Naming: a command is one word, what the user types. A skill is verb-object, kebab-case, lowercase, and its verb says the kind of work: `write-` produces a document, `draw-` an HTML visual, `scan-` reads the project and records facts, `check-` reports only and never edits; any other verb names the work it does (`implement`, `run`, `triage`, `update`, `test`).
- No Cursor-era formats: no `.mdc`, `alwaysApply` or `globs`.
- Do not add `disable-model-invocation: true` to a skill that another skill invokes; it would block that call.
- Every skill declares `metadata.model-tier` in its frontmatter: `Budget`, `Mid` or `Frontier`. It records how much reasoning the work needs, so the choice survives models being renamed or replaced. Which model each tier resolves to lives only in `.claude/config/settings.yaml`.
- Concise: every line earns its place. No padding, no repeated instructions, no motivational text.
