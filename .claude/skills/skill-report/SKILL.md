---
name: skill-report
description: Write a Markdown report comparing before and after rubric scores of this repo's harness skills — how much each improved, in which dimensions, and which changes were kept or reverted.
argument-hint: <run folder>
---

# Skill report: before vs after

Write `<run folder>/report.md` from the files in the run folder given in `$ARGUMENTS`.

## Step 1: Read the run

From the run folder, read:

- `before.json` and `after.json`: score snapshots (required);
- `decisions.json`: per skill, `kept` or `reverted` (required);
- `findings/<skill>.md`: what was adopted and rejected, with sources (optional per skill).

If a required file is missing, stop and say which. If the two snapshots have different `rubric` values (the `version` in the rubric's frontmatter), stop: their scores cannot be compared.

## Step 2: Compute

For each skill:

- **Candidate score**: its total in `after.json`.
- **Final score**: the candidate score if kept, the before score if reverted.
- **Change**: final minus before, overall and per dimension.

Overall: the average of before scores and the average of final scores across the skills in the run.

## Step 3: Write the report

```markdown
# Skill improvement report — <run folder name>

Rubric: <version> · Judge runs: <n> · Skills: <count>

## Summary

Average score: <before> → <final> (<+/- change>)

| Skill | Before | Candidate | Final | Change | Decision |
| ----- | ------ | --------- | ----- | ------ | -------- |

## By dimension

| Skill | Clarity | Completeness | Guardrails | Output | Trigger | Conventions | Economy |
| ----- | ------- | ------------ | ---------- | ------ | ------- | ----------- | ------- |
(each cell: before → final, e.g. "2 → 3")

## Per skill

### <skill> — <before> → <final> (<decision>)

- **Improved areas**: dimensions that went up, each with the adopted change that caused it.
- **Declined areas**: dimensions that went down, if any.
- **Adopted changes**: from findings, with source links.
- **Rejected ideas**: from findings, with the reason.
- If reverted: one line on why (candidate score not higher than before).
```

Use only numbers from the snapshots. Do not re-score anything.

## Step 4: Report

Report the report path and the summary line.
