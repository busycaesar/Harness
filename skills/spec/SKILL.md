---
name: spec
description: Turn technical requirements into a complete, unambiguous specification file. Use when the user hands over requirements, a feature request, or a ticket to build — before any planning or code. Researches the codebase for facts, asks the user about every remaining ambiguity, and repeats until none is left.
argument-hint: <requirements text or path to a requirements file>
---

# Spec: Requirements → Unambiguous Specification

Turn the requirements in `$ARGUMENTS` (or the requirements the user just gave) into a specification file that leaves nothing to guess. The spec says **what** must be built, never **how**: no tasks, no file-by-file changes, no code.

## The one rule: never assume

Every statement in the spec must trace back to exactly one of:

1. **Source requirements**: what the user wrote.
2. **Codebase facts**: something that exists in the code, cited with `path:line`.
3. **Decisions**: an answer the user gave to a question you asked.

If a statement cannot be traced to one of these, it does not go in the spec's requirements. It becomes an open question that you ask the user. Do not fill gaps with "reasonable defaults", "common practice", or "probably". If the user explicitly delegates a choice ("you decide"), record your choice and reasoning as a Decision and tell them what you chose.

## Step 1: Set up the spec file

1. Read the `work-items` path from the harness config (`.claude/config/paths.yaml`). If the file or key is missing, use `.claude/work-items/`.
2. Choose a short kebab-case slug from the requirements' title or subject. If the user gave a ticket key, prefix it: `ABC-123-archive-jobs`. The spec file is `<work-items>/<slug>/spec.md`.
3. If that file already exists, ask the user whether to update it or create a new one. Do not overwrite.
4. Create the file from [spec-template.md](spec-template.md) with `Status: draft`. Paste the requirements **verbatim** into "Source requirements". That section is never edited afterwards.

## Step 2: Research the codebase

Before asking anything, learn what the code already settles. Search for the features, entities, screens, endpoints, data models and terms the requirements mention.

- The codebase answers **what is**: existing data models, APIs, conventions, libraries, how similar features already work.
- The user answers **what should be**: intended behaviour, priorities, trade-offs, anything new.

Record each relevant finding under "Codebase facts" as `F#` with a `path:line` reference. Use a fact to resolve an ambiguity only when the code shows one clear, established answer. If the code shows conflicting patterns, or nothing relevant exists, it is a question for the user.

## Step 3: Draft the requirements

Break the source requirements into atomic, numbered requirements (`R1`, `R2`, …). Each one describes a single behaviour and gets acceptance criteria (`R1.AC1`, …) in Given / When / Then form with an **observable** result.

Write only what is traceable. Wherever you cannot complete a requirement or a criterion without guessing, leave it out and add an open question instead.

## Step 4: Hunt for ambiguity

Go through every requirement against this list. Each gap becomes an entry under "Open questions" (`Q#`, with the requirements it affects). This section is a working list while the spec is a draft; it must be empty before the spec can be final.

- **Actors and permissions**: who can do this? Who must not?
- **Inputs**: formats, validation rules, required vs optional, limits.
- **Outputs**: what exactly is shown, returned, stored or sent?
- **States**: empty, loading, partial, error, success.
- **Edge cases**: duplicates, concurrency, very large or zero values, missing data, retries.
- **Failure behaviour**: what happens when a dependency, network call or validation fails?
- **Existing behaviour**: what changes for current users and data? Is migration or backward compatibility needed?
- **Data lifecycle**: creation, update, deletion, retention.
- **Non-functional needs**: performance, security, accessibility, logging, only where the requirements touch them.
- **Vague words**: "fast", "simple", "user-friendly", "etc.", "support", "handle", "appropriate", "some", "should" (required or optional?).
- **Undefined terms**: domain words or names that are not defined in the requirements or the codebase.
- **Conflicts**: requirements that contradict each other or contradict a codebase fact.
- **Scope edges**: anything that might or might not be included.

## Step 5: Ask, update, repeat

1. Ask the open questions in batches, grouped by topic, most blocking first.
   - When a question has a few discrete answers, use the `AskUserQuestion` tool (up to 4 questions per call), and offer the concrete options you found.
   - Otherwise ask in plain text as a numbered list.
   - Say briefly why each question matters. Offering options is fine; silently picking one is not.
2. For each answer, add a Decision (`D#`: question, answer, affected requirements), update the affected requirements and criteria, and remove the question from "Open questions".
3. Re-run Step 4 on everything that changed. Answers often reveal new gaps.
4. Repeat until "Open questions" is empty. Never finish with unanswered questions; if the user skips one, ask it again.

Save the spec file after each round so progress survives an interrupted session. If a session resumes on a `draft` spec, continue from its "Open questions".

## Step 6: Finalise

Before marking the spec final, confirm all of these hold:

- [ ] "Open questions" is empty: every question was answered and recorded as a Decision.
- [ ] Every requirement has at least one acceptance criterion, and every criterion has an observable result.
- [ ] Every statement traces to the source requirements, a codebase fact or a decision.
- [ ] No vague words remain.
- [ ] "Out of scope" lists everything discussed and excluded.

Then show the user a short summary (the requirement list with one line each, plus the key decisions) and ask them to approve it. Only after they approve, delete the empty "Open questions" section and set `Status: final`. A final spec never contains open questions.

If the requirements change after the spec is final, set it back to `Status: draft` and run Steps 4–6 again on the changes.

## Output

Report the spec file path and its status. Only the spec file is produced; no code.
