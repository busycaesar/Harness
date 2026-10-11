---
name: skill-bench
description: Score this repo's harness skills (in skills/) against the locked skill rubric and save the scores as a JSON snapshot. Use to measure skill quality before and after changes.
argument-hint: <output JSON path> [skill names…]
---

# Skill bench: score harness skills

Score the harness skills in this repo's `skills/` folder with the rubric and write the results to the output path in `$ARGUMENTS`.

## Rules

- Never edit the rubric (`.claude/rubric.md`), `.claude/rules/skill-conventions.md`, or any skill. This skill only reads and scores.
- Judges see only the rubric, the conventions and the skill being scored: never earlier scores, research findings, or what changed.

## Step 1: Inputs

1. The first argument is the output path for the JSON snapshot. If none is given, use `.claude/benchmarks/<YYYY-MM-DD-HHMM>/scores.json`.
2. The remaining arguments are skill names. If none are given, score every folder in `skills/` that has a `SKILL.md`. If a named skill does not exist, stop and say which.
3. Read the rubric from `.claude/rubric.md` and note its version from its `Version:` line.
4. Read `judge_runs` from `.claude/config/skill-improve.yaml` (default: 1).

## Step 2: Judge each skill

For each skill, launch `judge_runs` judge subagents with the `Agent` tool, all in one message so they run in parallel. Give each judge:

- the full rubric file;
- the full `.claude/rules/skill-conventions.md`;
- every file in the skill's folder (its `SKILL.md` and supporting files), in full;
- this instruction: "Score this skill against the rubric. Quote evidence for every dimension. Return only the JSON in the rubric's 'Judge output' format."

Judges for different skills may run in the same message.

## Step 3: Combine

For each skill:

1. Parse each judge's JSON. If one is malformed, re-run that judge once; if it fails again, use the remaining runs.
2. Per dimension, take the **median** score across judges, and keep the evidence from a judge whose score equals the median.
3. Total = sum of the median scores ÷ 28 × 100, rounded to one decimal.

## Step 4: Save and report

Write the snapshot:

```json
{
  "rubric": "<version from the rubric's Version: line, e.g. 1>",
  "rubric_path": ".claude/rubric.md",
  "judge_runs": 1,
  "scored_at": "<ISO timestamp>",
  "skills": {
    "<name>": {
      "total": 0.0,
      "dimensions": { "<dimension>": { "score": 0, "evidence": "..." } }
    }
  }
}
```

Report the snapshot path and a table of each skill's total.
