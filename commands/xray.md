---
description: Scan a project for its own commands and for the conventions and clean-code practices it follows, and write them to the project's config and rules.
disable-model-invocation: true
metadata:
  model-tier: Budget
---

# X-ray: Commands and conventions

This command only conducts. It does none of the scanning itself, does not edit the skills' output files, and does not second-guess their results.

## Step 1: Scan

Invoke the `scan-commands` skill and the `conventions` skill in parallel, both with no arguments. Wait for both to finish.

## Step 2: Report

Print each skill's own report: what it wrote and where. If one failed, say which and why.
