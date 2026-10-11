---
version: 1
---

# Skill rubric

Scores one harness skill (its `SKILL.md` and supporting files) on 7 dimensions, each 0–4. Total = sum ÷ 28 × 100, rounded to one decimal.

Score only what is written in the skill. Do not reward intentions, and do not imagine instructions that are not there. For every dimension, quote the line or lines that justify the score; when a score is held back, quote or name what is missing.

## 1. Clarity

Can a model follow every step without interpreting?

- **0**: Mostly vague goals ("handle errors properly"); no concrete steps.
- **1**: Some concrete steps, but key ones are vague or open to several readings.
- **2**: Steps are concrete, but several terms, conditions or decision points are undefined.
- **3**: Steps and decisions are concrete; at most one or two minor ambiguities.
- **4**: Every step, condition and term is precise; two models would carry it out the same way.

## 2. Completeness

Does it cover its whole job, including edge and failure paths?

- **0**: Covers only the happy path, and only partly.
- **1**: Happy path complete; no edge cases, failures or resumption.
- **2**: Some edge cases or failures handled; obvious ones missing (empty input, existing output, interrupted run).
- **3**: Edge cases, failures and existing state handled; at most one minor gap.
- **4**: Every realistic input, state and failure has a defined behaviour, including when to stop.

## 3. Guardrails

Does it stop the shortcuts models typically take for this job (assuming, scope creep, faking success, skipping steps)?

- **0**: No guardrails.
- **1**: Generic warnings ("be careful") with no concrete rules.
- **2**: Concrete rules for some of the shortcuts relevant to this job; the main one is missing.
- **3**: Concrete rules for the main shortcuts, each stated as a hard rule.
- **4**: Concrete rules for every relevant shortcut, plus a self-check that catches violations before finishing.

## 4. Output contract

Is it exact about what it produces, where, and in what shape?

- **0**: Output undefined.
- **1**: Output named but not located or shaped.
- **2**: Location and rough shape given; structure or report left loose.
- **3**: Exact location, structure (template or format) and final report defined.
- **4**: As 3, plus the conditions under which no output is written and what is reported instead.

## 5. Trigger quality

Does the `description` frontmatter tell a model exactly when to use the skill, and when not?

- **0**: Missing or meaningless description.
- **1**: Says what the skill is, not when to use it.
- **2**: Says when to use it, but would also fire on, or miss, common neighbouring requests.
- **3**: Accurate "when to use" with the inputs it accepts; rarely misfires.
- **4**: Accurate and distinct: states inputs, outcome and boundaries, so it neither overlaps nor misses.

## 6. Fit with conventions

Does it follow `.claude/rules/skill-conventions.md`?

- **0**: Breaks several conventions.
- **1**: Breaks one convention outright.
- **2**: No outright break, but several soft deviations (hints at other skills, hardcoded defaults without a config fallback, format drift).
- **3**: At most one soft deviation.
- **4**: Fully consistent with every convention.

## 7. Economy

Is every line earning its place?

- **0**: Mostly padding, repetition or motivational text.
- **1**: Substantial repetition or filler; the core is hard to find.
- **2**: Noticeable repetition or over-explanation in places.
- **3**: Tight; at most a few lines could go.
- **4**: Nothing could be removed without losing behaviour.

## Judge output

Return exactly this JSON, nothing else:

```json
{
  "skill": "<name>",
  "rubric": "1",
  "dimensions": {
    "clarity": { "score": 0, "evidence": "<quote or missing item>" },
    "completeness": { "score": 0, "evidence": "..." },
    "guardrails": { "score": 0, "evidence": "..." },
    "output": { "score": 0, "evidence": "..." },
    "trigger": { "score": 0, "evidence": "..." },
    "conventions": { "score": 0, "evidence": "..." },
    "economy": { "score": 0, "evidence": "..." }
  },
  "total": 0.0
}
```
