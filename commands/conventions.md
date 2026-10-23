---
description: Scan the whole project and write the conventions and clean-code practices it actually follows (naming, layout, imports, logging, tests, comments, simplicity, design, structure, readability, errors) as always-loaded rule files, each rule with how consistently it is followed and examples. Keeps hand-written rules across re-runs.
disable-model-invocation: true
---

# Project conventions

Scan the project and write the conventions and clean-code practices it actually follows as rule files, one per topic.

Reads only and runs nothing except the file listing in Step 2. Changes no file except the rule files it writes, and an earlier generated rule file with nothing left to keep. No git state changes.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Every rule traces to the code that follows it; a pattern without evidence is never written. Ask the user only about genuine gaps, such as whether a file is generated or vendored.

## Step 1: Settings

1. Read the `project-rules` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/rules/project/`. This is the rules folder.
2. Read `max_parallel_tasks` from `.claude/config/settings.yaml`. If missing, use 4.
3. For every output file (the Step 4 table and `conventions/other.md`) that already exists, set aside everything after its `## Manual` heading. The command never changes that part. If an existing output file has no `## Manual` heading, ask the user whether it may be replaced.

## Step 2: List the files

- In a git repository, list them with `git ls-files --cached --others --exclude-standard`, then drop any that no longer exist on disk.
- Otherwise, list every file, skipping `.git` and everything `.gitignore` excludes.
- Drop vendored and generated files, lockfiles and binaries. If it is unclear whether a file is generated or vendored, ask the user.
- Drop the rules folder itself.

Paths are relative to the project root and use `/`.

## Step 3: Find the apps

- One app per folder with its own manifest or task file. Take the members from the workspace definition when there is one (a workspaces field in the root manifest or a workspace file).
- A project with a single app has one app, at `.`.

## Step 4: Scan

Run one subagent per topic, at most `max_parallel_tasks` at once:

| Output file                 | Covers                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `conventions/naming.md`     | Names of files, folders, functions, classes, variables and constants.                                        |
| `conventions/layout.md`     | Folder layout and where each kind of code lives.                                                             |
| `conventions/imports.md`    | Import style, ordering, grouping, aliases, and which parts may import which.                                 |
| `conventions/logging.md`    | How and where the code logs: logger, levels, message style.                                                  |
| `conventions/tests.md`      | Where tests live, how they are named, and how they are written.                                              |
| `conventions/comments.md`   | Where comments go, what they say, doc-comment style.                                                         |
| `clean-code/simplicity.md`  | Simplicity, unused code, duplication and when it is extracted.                                               |
| `clean-code/design.md`      | Responsibilities, extension points, interfaces, how dependencies are passed in, composition and inheritance. |
| `clean-code/structure.md`   | Function and module size, how logic is split, separation of concerns, coupling.                              |
| `clean-code/readability.md` | Parameter counts, nesting depth, early returns, named constants versus literal values, side effects.         |
| `clean-code/errors.md`      | Input checks, validation, error handling, error messages, fallbacks, resource cleanup.                       |

Subagents start cold, so give each one in its prompt:

- the project root, the file list from Step 2 and the apps from Step 3;
- its one topic from the table, and that it looks at nothing else;
- to read the whole project for that topic, read only, and run nothing;
- to report only a pattern the code itself shows, never one it expects or recommends, and not to read linter or formatter configs;
- to return as text, per rule: the rule in one line; how consistently it is followed, as "followed in N of M <unit>" with the unit counted (files, functions, imports); up to 3 `path:line` examples where it is followed; no exceptions;
- where usage splits roughly evenly between ways, to return "Mixed: N use X, M use Y" with up to 3 examples of each, without picking a side;
- per rule, whether it holds across all apps or differs per app, and each app's own variant with its counts and examples.

When all have returned, run one more subagent for discovery. Give it the same project context and every topic's results, and ask it for any other repeated pattern or practice the results do not cover that looks deliberate enough to be a rule, in the same format, each with the output file it fits, or `conventions/other.md` if none.

## Step 5: Write the files

Re-check every rule before writing: each example exists at that line and shows the rule. Drop a failing example; drop a rule left with no example.

Write each output file in this form:

```markdown
# <Topic>

These are this project's own rules, found in its code; where they conflict with `.claude/rules/harness/`, these win. Re-runs rewrite everything above `## Manual`; write hand-made rules under it, where they win over the lines above.

- **<Rule>.** Followed in <N> of <M> <unit>: `<path>:<line>`, `<path>:<line>`.
- **Mixed: <N> use <X>, <M> use <Y>.** <X>: `<path>:<line>`. <Y>: `<path>:<line>`.

## <app path>

- **<Rule>.** ...

## Manual

<set-aside content>
```

- Rules that hold across apps go once at the top. A `## <app path>` section per app holds only what differs for that app. A single-app project has no app sections.
- Drop a generated rule that covers the same thing as a rule under `## Manual`.
- End every file with `## Manual` and the content set aside in Step 1, unchanged; empty for a new file.
- A file with no rules and no `## Manual` content is not written, and an existing one is deleted. A file with `## Manual` content is never deleted.

## Step 6: Report

Print only one line with each file written and its rule count, then the rules folder's path.
