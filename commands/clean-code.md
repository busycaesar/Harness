---
description: Check code against the clean-code rules and write a Markdown report of every place that breaks one. Checks uncommitted changes by default; never edits code.
argument-hint: "[staged | branch | all | <path>...] (default: all uncommitted changes)"
disable-model-invocation: true
---

# Clean code check

Check code against the rules in `.claude/rules/harness/clean-code/` and write a report of what breaks them.

Report only: changes no file except the report. No git state changes.

## The one rule: never assume

Every finding traces to a specific rule in `.claude/rules/harness/clean-code/`. Check no other rules. If it is unclear whether code breaks a rule, do not flag it.

## Step 1: Settings

1. Read the `clean-code` path from `.claude/config/paths.yaml`. If the file or key is missing, use `clean-code-report.md` at the project root. An existing report at that path is replaced.
2. Read `max_parallel_tasks` from `.claude/config/settings.yaml`. If missing, use 4.
3. Read every file in `.claude/rules/harness/clean-code/`.

## Step 2: Find the code to check

Take the scope from `$ARGUMENTS`:

| `$ARGUMENTS`      | Checks                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| empty             | All uncommitted changes: staged, unstaged and untracked files.                                                        |
| `staged`          | Only staged changes.                                                                                                  |
| `branch`          | Every change on the current branch since it diverged from the default branch, committed or not, plus untracked files. |
| one or more paths | Only those files and folders, in full.                                                                                |
| `all`             | The whole codebase, in full.                                                                                          |

- Find the default branch with read-only git, e.g. the remote's `HEAD`. Never assume a branch name; if it cannot be determined, ask the user.
- For `all` and folder paths, list files with `git ls-files --cached --others --exclude-standard`. Outside a git repository, list every file, skipping `.git` and everything `.gitignore` excludes.
- Outside a git repository, only paths and `all` work. For any other scope, say so and stop.
- Check only code files. Skip deleted files, lockfiles, generated or vendored files, and binaries.
- For the change scopes (empty, `staged`, `branch`), check only the changed lines. Read the surrounding code for context, but do not flag code the changes did not touch. An untracked file counts as entirely changed.

If there is nothing to check, say so and stop.

## Step 3: Check

Read each file and judge it against every rule. For each finding, record:

- the file and line, as the line number in the file on disk;
- the rule file and the principle it breaks, by its name in that file;
- what is wrong, in one line;
- a suggested fix.

For `all` on a large codebase, split the files by top-level folder across subagents, at most `max_parallel_tasks` at once. Each returns its findings. Subagents only read.

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

- The summary has one row per file in `.claude/rules/harness/clean-code/`, named by its file name without `.md`, including those with no findings.
- One `###` section per file with findings, in path order; findings in line order.
- `<path>` is relative to the project root. `<link>` is the same file relative to the report's folder, so the link opens from a Markdown preview.
- No severity levels.
- With no findings, replace the Findings section with a line saying the checked code breaks none of the rules.

## Step 5: Report

Print only one line with the files checked and the findings per rule file, then the report's path.
