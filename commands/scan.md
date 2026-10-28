---
description: Scan a project for its own commands, for the conventions and clean-code practices it follows, for its test setup (how tests map to source files, and its coverage threshold) and for how it is run locally (steps in order, ports, readiness checks, env vars, teardown), and write them to the project's config and rules.
disable-model-invocation: true
metadata:
  model-tier: Budget
---

# Scan: Commands, conventions, test setup and run steps

This command only conducts. It does none of the scanning itself, does not edit the skills' output files, and does not second-guess their results.

## Step 1: Scan

1. Invoke the `scan-commands`, `scan-conventions` and `scan-test-setup` skills in parallel (see Subagents in `.claude/rules/harness/config.md`), all with no arguments. Wait for all three to finish.
2. Then invoke the `scan-run-steps` skill with no folder, telling it the project's commands were just scanned; it reads the commands `scan-commands` recorded, if any.

## Step 2: Report

Print each of the four skills' own report: what it wrote and where. If one failed, say which and why.
