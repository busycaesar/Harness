---
name: skill-improve
description: Improve this repo's harness skills end to end — score them, find similar skills and adopt what they do better, score again, keep only changes that raised the score, and write a report.
argument-hint: [skill names…]
disable-model-invocation: true
---

# Skill improve: bench → find → adopt → bench → report

Run one improvement pass over the harness skills in this repo's `skills/` folder, for the skills named in `$ARGUMENTS`, or all of them if none are named.

## Rules

- One rubric version for the whole run, noted in Step 1. If the `Version:` line of `.claude/rubric.md` changes during the run, stop.
- Never edit the rubric (`.claude/rubric.md`), `.claude/rules/skill-conventions.md` or `.claude/config/skill-improve.yaml`.
- A skill change is kept only if it raised the skill's score. Otherwise the skill is restored exactly as it was.

## Step 1: Plan the run

1. Note the rubric version from the `Version:` line of `.claude/rubric.md`.
2. Read `.claude/config/skill-improve.yaml`: `max_sources_total`, `min_sources_per_skill`, `max_sources_per_skill`.
3. Skills: the names in `$ARGUMENTS`, or every folder in `skills/` with a `SKILL.md`. If a named skill does not exist, stop and say which.
4. Max skills per run = `max_sources_total ÷ min_sources_per_skill`, rounded down. If there are more skills than that, tell the user the maximum is reached and ask them to run again with a list of at most that many skills. Stop.
5. Sources per skill = `max_sources_total ÷ number of skills`, rounded down, then raised to `min_sources_per_skill` or lowered to `max_sources_per_skill` if outside that range.
6. Create the run folder `.claude/benchmarks/<YYYY-MM-DD-HHMM>/`.
7. Copy each skill's folder to `<run folder>/originals/<skill>/`, so it can be restored exactly.

Tell the user the skills, the sources per skill and the run folder before continuing.

## Step 2: Score before

Invoke `skill-bench` with `<run folder>/before.json` and the skill names.

## Step 3: Find similar skills

Invoke `skill-find` with the run folder, the sources per skill and the skill names. It saves similar skills to `<run folder>/sources/`.

## Step 4: Adopt improvements

Invoke `skill-adopt` with the run folder and the skill names. It improves our skills and writes `<run folder>/findings/`.

## Step 5: Score after

Invoke `skill-bench` with `<run folder>/after.json` and the skill names. Score every skill in the run, changed or not, so both snapshots cover the same skills.

## Step 6: Keep or revert

For each skill:

- If its total in `after.json` is higher than in `before.json`, **keep** the change.
- Otherwise, **revert**: replace the skill's folder in `skills/` with its copy from `<run folder>/originals/<skill>/`, removing any files `skill-adopt` added.

Write `<run folder>/decisions.json`: `{ "<skill>": "kept" | "reverted" }`.

## Step 7: Report

Invoke `skill-report` with the run folder. Then tell the user the report path, the average before and final scores, and which skills were kept or reverted.
