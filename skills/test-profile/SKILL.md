---
name: test-profile
description: Use when a project's test profile should be found and recorded — how to find the tests related to a changed source file, and the coverage threshold it requires (what it measures and where it is set). Scans the project's test tooling, test files, config and CI, and writes one YAML file with each finding and the file it came from, or that none was found. Reads only: it runs no tests and does not write tests, commands or docs.
metadata:
  model-tier: Mid
---

# Test profile

Scan the project and write, per app or package, how to find the tests related to a changed file and the coverage threshold, into one YAML file.

Reads and records only: runs nothing except the listing in Step 2 and asks the user nothing. Changes no file except the profile file. No git state changes.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`, with the evidence as the only source: every entry traces to the file and line or key it came from. A gap is not asked about: it is recorded as `none found`.

## Step 1: Settings

1. Read the `test-profile` path from `.claude/config/paths.yaml`. If the file or key is missing, use `.claude/config/test-profile.yaml`.
2. If that file exists, read it and set aside every entry with `source: manual`. If it cannot be parsed as YAML, stop without writing and report the parse error, so no manual entry is lost.

## Step 2: List the files

- In a git repository, list them with `git ls-files --cached --others --exclude-standard`, then drop any that no longer exist on disk.
- Otherwise, list every file, skipping `.git` and everything `.gitignore` excludes.

## Step 3: Find the apps

- One section per app or package that has its own manifest or task file, plus the project root when it has tests of its own.
- Take the members from the workspace definition when there is one (a workspaces field in the root manifest or a workspace file). Otherwise each folder with its own manifest is a section.
- A project with a single app has one section, with path `.`.

## Step 4: Find the related-tests method

For each section, record one method, the first that has evidence:

1. **`command`**: the test tooling the section uses selects the tests related to given source files (from imports or coverage data). Record the command with `{files}` for the changed files, its `cwd`, and as `source` a script or CI step that uses it, else the manifest or config that shows that tooling.
2. **`naming`**: the existing test files map to source files by name and location. Record each mapping as a source and a test path pattern, with how many test files follow it, and as `source` up to 3 test files that follow it.

With neither, record `none found`.

## Step 5: Find the coverage threshold

For each section, look in the test and coverage tooling's config, the manifests, and the CI workflows (a step that fails the build below a coverage value, or a coverage service's config). Record the value with its unit, what it measures and over what, and the file and line or key. With none, record `none found`.

When two sources disagree on the threshold, record neither and report both.

## Step 6: Write the file

1. Write the file from [test-profile-template.yaml](test-profile-template.yaml), keeping its header comments, even when every entry is `none found`. Comments go on the line above, never at the end of a line.
2. Put back every `manual` entry set aside in Step 1 under the same section and key, keeping its section even if the scan found none. A manual entry replaces the discovered one.
3. An existing file is otherwise replaced.
4. Re-read the written file. Each discovered entry's `source` exists and shows that evidence; each manual entry set aside is present unchanged. Drop or restore any entry that fails.

## Step 7: Report

- The file's path.
- Per section: its path, the related-tests method and the threshold, each with its source, or `none found`.
- Each disagreement between sources, with both sources.
- Each manual entry kept.
