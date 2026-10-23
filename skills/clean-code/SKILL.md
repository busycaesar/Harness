---
name: clean-code
description: Check code against the project's clean-code rules and write a Markdown report of every place that breaks one. Use when asked to check uncommitted, staged or branch changes, given paths, or the whole codebase against those rules; defaults to all uncommitted changes. Reports only: never edits code, and checks nothing the rules do not state (not a bug hunt or general review).
argument-hint: "[staged | branch | all | <path>...] (default: all uncommitted changes)"
---

# Clean code check

Check code against the clean-code rules and write a report of what breaks them.

Report only: changes no file except the report. No git state changes.

## Never assume

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Every finding traces to a specific principle in the rules folder; check no other rules. If it is unclear whether code breaks a principle, do not flag it.

## Step 1: Settings

1. Read the `clean-code` path from `.claude/config/paths.yaml`. If the file or key is missing, use `clean-code-report.md` at the project root. An existing report at that path is replaced.
2. Read `max_parallel_tasks` from `.claude/config/settings.yaml`. If missing, use 4.
3. Read the `clean-code-rules` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/rules/harness/clean-code/`. This is the rules folder; read every file in it. If it is missing or has no rule files, say so and stop.

## Step 2: Find the code to check

Take the scope from `$ARGUMENTS`:

| `$ARGUMENTS`      | Checks                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| empty             | All uncommitted changes: staged, unstaged and untracked files.                                                        |
| `staged`          | Only staged changes.                                                                                                  |
| `branch`          | Every change on the current branch since it diverged from the default branch, committed or not, plus untracked files. |
| one or more paths | Only those files and folders, in full.                                                                                |
| `all`             | The whole codebase, in full.                                                                                          |

- A given path that does not exist: say which and stop.
- Find the default branch with read-only git, e.g. the remote's `HEAD`. Never assume a branch name; if it cannot be determined, ask the user.
- For `all` and folder paths, list files with `git ls-files --cached --others --exclude-standard`. Outside a git repository, list every file, skipping `.git` and everything `.gitignore` excludes.
- Outside a git repository, only paths and `all` work. For any other scope, say so and stop.
- Check only code files. Skip deleted files, lockfiles, generated or vendored files, and binaries. If it is unclear whether a file is generated or vendored, ask the user.
- For the change scopes (empty, `staged`, `branch`), check only the changed lines. Read the surrounding code for context, but do not flag code the changes did not touch. An untracked file counts as entirely changed.

If there is nothing to check, say so and stop.

## Step 3: Check

Read each file and judge it against every rule. For each finding, record:

- the file and line, as the line number in the file on disk;
- the rule file and the principle it breaks, by its name in that file;
- what is wrong, in one line;
- a suggested fix.

If two principles pull opposite ways on the same code, record one finding naming both (counted under each rule file), and give both fixes without choosing.

For `all` on a large codebase, split the files by top-level folder across subagents, at most `max_parallel_tasks` at once. Each returns its findings. Subagents only read.

Before writing, re-check every finding, the subagents' included, and drop any that fails:

- the principle's text in its rule file covers this exact code, not just its spirit;
- the line exists on disk and, for a change scope, is a changed line;
- it is not a duplicate of another finding on the same line and principle.

## Step 4: Write the report

Write the report, even when there are no findings:

```markdown
# Clean code report

Scope: <scope, with the paths or base branch if any> · Date: <YYYY-MM-DD>

## Summary

Files checked: <n>

| Rule file   | Findings |
| ----------- | -------- |
| <rule file> | <n>      |

## Findings

### <path>

- [<path>:<line>](<link>#L<line>) · **<principle>** (<rule file>): <what is wrong>. Fix: <suggested fix>.
```

- The summary has one row per file in the rules folder, named by its file name without `.md`, including those with no findings.
- One `###` section per file with findings, in path order; findings in line order.
- `<path>` is relative to the project root. `<link>` is the same file relative to the report's folder, so the link opens from a Markdown preview.
- No severity levels.
- With no findings, replace the Findings section with a line saying the checked code breaks none of the rules.

## Step 5: Report

Print only one line with the files checked, the total findings and the findings per rule file, then the report's path. When the skill stopped before writing a report, print only why.
