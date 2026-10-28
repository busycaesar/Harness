---
name: scan-test-setup
description: Use when a project's test setup should be found and recorded — how to find the tests related to a changed source file, and the coverage threshold it requires (what it measures and where it is set). Scans the project's test tooling, test files, config and CI, and writes one YAML file with each finding and the file it came from, or that none was found. Reads only: it runs no tests and does not write tests, commands or docs.
metadata:
  model-tier: Mid
---

# Test setup

Scan the project and write, per app or package, how to find the tests related to a changed file and the coverage threshold, into one YAML file.

Reads and records only: runs nothing except the listing in Step 2 and asks the user nothing. Changes no file except the test setup file.

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`, with the evidence as the only source: every entry traces to the file and line or key it came from. A gap is recorded as `none found`.

## Step 1: Settings

1. Read the `test-setup` path (see `.claude/rules/harness/config.md`).
2. If that file exists, set aside its manual entries (see `.claude/rules/harness/recorded-files.md`).

## Step 2: List the files

List the project's files (see `.claude/rules/harness/project-files.md`).

## Step 3: Find the apps

One section per app or package: the project's sections (see `.claude/rules/harness/project-sections.md`), plus the project root when it has tests of its own.

## Step 4: Find the related-tests method

For each section, record one method, the first that has evidence:

1. **`command`**: the test tooling the section uses selects the tests related to given source files (from imports or coverage data). Record the command with `{files}` for the changed files, its `cwd`, and as `source` a script or CI step that uses it, else the manifest or config that shows that tooling.
2. **`naming`**: the existing test files map to source files by name and location. Record each mapping as a source and a test path pattern, using the placeholders the template defines, with how many test files follow it, and as `source` up to 3 test files that follow it. Note each mapping that gives the same test file for several source files (e.g. its test pattern drops `{dir}`).

With neither, record `none found`.

## Step 5: Find the coverage threshold

For each section, look in the test and coverage tooling's config, the manifests, and the CI workflows (a step that fails the build below a coverage value, or a coverage service's config). Record the value with its unit, what it measures and over what, and the file and line or key. With none, record `none found`.

When two sources disagree on the threshold, record neither and report both.

## Step 6: Write the file

1. Write the file from [test-setup-template.yaml](test-setup-template.yaml), even when every entry is `none found`, putting back the manual entries set aside in Step 1, as `.claude/rules/harness/recorded-files.md` says.
2. Re-read it as that rule says.

## Step 7: Report

- The file's path.
- Per section: its path, the related-tests method and the threshold, each with its source, or `none found`.
- Each mapping that gives one test file for several source files, with an example.
- Each disagreement between sources, with both sources.
- Each manual entry kept.
