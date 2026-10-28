# Test plan: {Title}

Requirements: {path to the requirements file, or "inline" when they were given as text}
Public units: {path to the code plan or units list, "inline", or —}
Mode: {full | coverage gap: the under-tested requirements or units given}

## Source requirements

{Only when the requirements were given inline: paste them verbatim. Omit this section when they come from a file.}

## Test setup

- Kinds: {unit | integration | both} ({source: `conventions/tests.md`, or up to 3 existing test files})
- Coverage threshold: {value, what it measures, over what, and its source; or "none recorded"} — planned for by {the cases that meet it}

## Existing tests

- `{test name}` (`path/to/test-file`) — keep
- `{test name}` (`path/to/test-file`) — keep — covers {requirement ID}
- `{test name}` (`path/to/test-file`) — change: {the result it must assert now} — {requirement ID}
- `{test name}` (`path/to/test-file`) — delete — {requirement ID}: "{quoted line that makes it obsolete}"

## Cases

### R1 — {one-line summary}

- TC1 — R1.AC1 — {unit | integration} — `path/to/test-file` ({existing | create}: whether the file exists before this plan is carried out)
  - Through: `{name}({params}) -> {result}` (`path/to/unit-file`)
  - Given / when: {the state and the action}
  - Then: {the observable result it asserts}

## Not tested

- {requirement ID} — {why no automated test can prove it}
