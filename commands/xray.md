---
description: Scan a project for its own commands, for the conventions and clean-code practices it follows, and for its test profile (how tests map to source files, and its coverage threshold), and write them to the project's config and rules.
disable-model-invocation: true
metadata:
  model-tier: Budget
---

# X-ray: Commands, conventions and test profile

This command only conducts. It does none of the scanning itself, does not edit the skills' output files, and does not second-guess their results.

## Step 1: Scan

Invoke the `scan-commands`, `conventions` and `test-profile` skills in parallel, all with no arguments. Wait for all three to finish.

## Step 2: Report

Print each skill's own report: what it wrote and where. If one failed, say which and why.
