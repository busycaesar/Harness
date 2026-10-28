---
name: scan-conventions
description: Scan the whole project and write the conventions and clean-code practices it actually follows (naming, layout, imports, logging, tests, comments, simplicity, design, structure, readability, errors) as always-loaded rule files, each rule with how consistently it is followed and examples. Asks before recording a pattern that conflicts with a harness rule, unless the project states it is intended. Keeps hand-written rules across re-runs.
metadata:
  model-tier: Mid
---

# Project conventions

Scan the project and write the conventions and clean-code practices it actually follows as rule files, one per topic.

Reads only and runs nothing except the file listing in Step 2. Asks the user only about the conflicts in Step 6. Changes no file except the rule files it writes, and an earlier generated rule file with nothing left to keep.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Every rule traces to the code that follows it; a pattern without evidence is never written.

## Step 1: Settings

1. Read the `project-rules` path (see `.claude/rules/harness/config.md`). This is the rules folder. Also read the `onboard`, `runbook`, `clean-code` and `work-items` paths.
2. Read `max_parallel_tasks` (see `.claude/rules/harness/config.md`).
3. Read the harness rules: every file in the `clean-code-rules` folder (see `.claude/rules/harness/config.md`) and every other rule file under `.claude/rules/harness/`.
4. For every output file (the Step 4 table and `conventions/other.md`) that already exists, set aside its hand-written content (see `.claude/rules/harness/recorded-files.md`): everything after its `## Manual` heading, and the lines under its `## Skipped` heading. If an existing output file has no `## Manual` heading, set aside its whole content instead; it goes under `## Manual` in the new file. Existing content is never erased.

## Step 2: List the files

1. First, run one subagent to build the skip list. It starts cold, so give it the project root, and tell it to read only and run nothing but read-only git listing commands. It returns files or folders (a folder instead of every file inside it), each with a one-line reason:
   - everything git ignores, from `git ls-files --others --ignored --exclude-standard --directory` (it honours `.gitignore` files, `.git/info/exclude` and the global excludes file); outside git, what the `.gitignore` files exclude;
   - the harness's own outputs, even when committed, at the paths from Step 1: the `onboard` map and the section maps beside it, the `runbook` and `clean-code` files, and the `work-items` folder;
   - from its own scan of the project, anything else that is not the project's own code, as `.claude/rules/harness/project-files.md` defines it (quote that definition in its prompt).

   Keep the skip list for the report.
2. Then list the files, leaving out the rules folder and everything on the skip list. Pass them to the listing as exclusions so it never descends into a skipped folder:
   - In a git repository, use `git ls-files --cached --others --exclude-standard -- . ':(exclude)<path>'` with one exclusion per skipped path, then drop any file that no longer exists on disk.
   - Otherwise, walk every file except `.git`, without entering a skipped folder.

Paths are relative to the project root and use `/`.

## Step 3: Find the apps

The apps are the project's sections (see `.claude/rules/harness/project-sections.md`).

## Step 4: Scan

Run one subagent per topic, at most `max_parallel_tasks` at once:

| Output file                 | Covers                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `conventions/naming.md`     | Names and name casing of source files, folders, functions, classes, variables and constants.                                         |
| `conventions/layout.md`     | Folder layout and where each kind of code lives.                                                                                     |
| `conventions/imports.md`    | Import style, ordering, grouping, aliases, and which parts may import which.                                                         |
| `conventions/logging.md`    | Every log call, error paths included: logger, levels, message style.                                                                 |
| `conventions/tests.md`      | Everything about test files: where they live, how they are named, how they are written.                                              |
| `conventions/comments.md`   | Every comment: where it goes, what it says, doc-comment style.                                                                       |
| `clean-code/simplicity.md`  | Unused code, duplication and when it is extracted.                                                                                   |
| `clean-code/design.md`      | Responsibilities and separation of concerns, extension points, interfaces, how dependencies are passed in, composition, inheritance. |
| `clean-code/structure.md`   | Function and module size, and how logic is split across functions and modules.                                                       |
| `clean-code/readability.md` | Parameter counts, nesting depth, early returns, named constants versus literal values, side effects.                                 |
| `clean-code/errors.md`      | Input checks, validation, raising and handling errors, error messages, fallbacks, resource cleanup.                                  |

Each concern belongs to the one topic the table gives it: which parts may import which only to imports, log calls only to logging, comments only to comments, test files only to tests.

Subagents start cold, so give each one in its prompt:

- the project root, the file list from Step 2 and the apps from Step 3;
- its one topic from the table, and that it reports nothing the table gives to another topic;
- to read the whole project for that topic, read only, and run nothing;
- to report only a pattern the code itself shows, never one it expects or recommends, and never one taken from linter or formatter configs; never a rule that only says something is absent (e.g. "no TODO comments"), since no example can show an absence;
- to return as text, per rule: the rule in one line; how consistently it is followed, as "followed in N of M <unit>" with the unit counted (files, functions, imports); up to 3 examples where it is followed, each `path:line`, or `path` alone for a rule about whole files or folders (e.g. file naming); no exceptions;
- where usage splits roughly evenly between ways, to return "Mixed: N use X, M use Y" with up to 3 examples of each, without picking a side;
- per rule, whether it holds across all apps or differs per app, and each app's own variant with its counts and examples;
- the harness rules' file paths from Step 1, and, per rule that conflicts with one (e.g. code repeated across sibling files against a DRY rule), to flag it with that harness rule's file and the rule itself, and with where the project states the pattern is intended (a doc, a linter or formatter config, or a code comment), as `path:line` with the statement quoted, or "not stated";
- before returning, to re-open each example and drop it unless it shows the rule itself (a 4-parameter function is not an example of "3 or fewer parameters").

When all have returned, run one more subagent for discovery. Give it the same project context and every topic's results, and ask it for any other repeated pattern or practice the results do not cover that looks deliberate enough to be a rule, in the same format and under the same limits, each with the output file it fits, or `conventions/other.md` if none.

## Step 5: Check the rules

Re-check every rule: each example exists at that path and line and shows the rule itself, not a variant of it. Drop a failing example; drop a rule left with no example. One rule lives in one file only: where several topics returned the same rule, keep it only in the file the Step 4 table gives its concern to. Drop a generated rule that covers the same thing as a rule under `## Manual`.

## Step 6: Resolve conflicts

For each rule flagged as conflicting with a harness rule, re-open the cited statement; unless it states explicitly that the whole pattern is the way to do it (a doc, linter config or code comment), treat the rule as "not stated". A folder description, or a comment on one site, is not such a statement.

- **Stated as intended.** Keep the rule, citing that statement. Ask nothing.
- **Not stated.** Ask the user (see `.claude/rules/harness/never-assume.md`) with `AskUserQuestion`: one question per conflict, all asked together, in as few calls as its question limit allows. Each shows the rule, its examples and the harness rule it conflicts with, and offers: record it as a project rule (it overrides the harness rule in this project), or skip it (the harness rule applies). It recommends recording it only when the project follows the pattern in nearly all places it applies and it is not a one-off, else skipping, and says which it recommends. Keep the rules the user records. Drop the ones skipped, and add each to its file's `## Skipped` list.

A conflicting rule already listed under `## Skipped` in its file is dropped without asking.

Rules that conflict with no harness rule are kept without asking.

## Step 7: Write the files

Write each output file in this form:

```markdown
# <Topic>

These are this project's own rules, found in its code; where they conflict with the harness rules, these win. Re-runs rewrite everything above `## Manual`; write hand-made rules under it, where they win over the lines above. Lines under `## Skipped` are not rules: they record patterns the user chose not to adopt, and the harness rules apply to them.

- **<Rule>.** Followed in <N> of <M> <unit>: `<path>:<line>`, `<path>:<line>`.
- **Mixed: <N> use <X>, <M> use <Y>.** <X>: `<path>:<line>`. <Y>: `<path>:<line>`.
- **<Rule>.** Followed in <N> of <M> <unit>: `<path>:<line>`. Overrides `<harness rule file>`: <stated in `<path>:<line>` | chosen by the user>.

## <section name>

- **<Rule>.** ...

## Skipped

- <Rule>. Conflicts with `<harness rule file>`: <harness rule>. Skipped by the user.

## Manual

<set-aside content>
```

- Rules that hold across apps go once at the top. A `## <section name>` section per app, headed by its section's name (never `.`), holds only what differs for that app. A single-app project has no app sections.
- End every file with `## Manual` and the content set aside in Step 1, unchanged; empty for a new file.
- `## Skipped` holds the lines set aside in Step 1 plus those added in Step 6, each once; a file with none has no `## Skipped` section.
- A file with no rules, no `## Skipped` lines and no `## Manual` content is not written, and an existing one is deleted. A file with `## Skipped` or `## Manual` content is never deleted.

## Step 8: Report

Print only:

- one line with each file written and its rule count, then the rules folder's path;
- each conflict from Step 6: the rule, the harness rule, and the outcome (recorded as stated in `<path>:<line>`, recorded by the user, skipped by the user now, or skipped as already listed under `## Skipped`);
- each existing file whose content was moved under `## Manual` because it had no such heading;
- "N items skipped as git-ignored", not counting those under `.claude/`;
- each other skipped file or folder with its reason.
