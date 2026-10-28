---
name: write-spec
description: Turn requirements — a feature request, ticket body, prompt or requirements file — into a complete, unambiguous specification of what to build, or update an existing spec when its requirements change. Researches the codebase for facts, asks the user about every remaining ambiguity until none is left, and gets the user's approval of the final spec. Use when what to build is not yet settled; not for deciding how to build it, and not for making the change. Produces a spec document only; never writes code.
argument-hint: "<requirements text or path to a requirements file> [work item folder]"
metadata:
  model-tier: Frontier
---

# Spec: Requirements → Unambiguous Specification

Turn the requirements in `$ARGUMENTS`, apart from any work item folder (or the requirements the user just gave), in any form, into a specification file that leaves nothing to guess. The spec says **what** must be built, never **how**: no tasks, no file-by-file changes, no code, no technology choices other than constraints traced below. If no requirements are given, ask for them and stop until they are.

## The one rule: never assume

Follow the never-assume rule in `.claude/rules/harness/never-assume.md`. Every statement in the spec must trace back to exactly one of:

1. **Source requirements**: what the user wrote.
2. **Codebase facts**: something that exists in the code, cited with `path:line`.
3. **Decisions**: an answer the user gave to a question you asked.

If a statement cannot be traced to one of these, it does not go in the spec's requirements. It becomes an open question that you ask the user.

## Step 1: Set up the spec file

1. Read the `work-items` path (see `.claude/rules/harness/config.md`).
2. The folder is the work item folder given in `$ARGUMENTS`. Without one, if the requirements describe several independent features, ask the user whether to write one spec or one per feature; then create a work item folder per spec as `.claude/rules/harness/work-items.md` says. The spec file is `spec.md` in the folder.
3. If that file already exists, ask the user whether to update it or, when no folder was given, create a new one in a new work item folder. Do not overwrite.
4. Create the file from [spec-template.md](spec-template.md) with `Status: draft`. Paste the requirements **verbatim** into "Source requirements". That section is never edited afterwards.

## Step 2: Research the codebase

Before asking anything, learn what the code already settles. Search the codebase and the project's `.claude/rules/` for the features, entities, screens, endpoints, data models and terms the requirements mention.

- The codebase answers **what is**: existing data models, APIs, conventions, libraries, how similar features already work.
- The user answers **what should be**: intended behaviour, priorities, trade-offs, anything new.

Record each relevant finding under "Codebase facts" as `F#` with a `path:line` reference. Use a fact to resolve an ambiguity only when the code shows one clear, established answer. If the code shows conflicting patterns, or nothing relevant exists, it is a question for the user.

## Step 3: Draft the requirements

Break the source requirements into atomic, numbered requirements (`R1`, `R2`, …). Each one describes a single behaviour and gets acceptance criteria (`R1.AC1`, …) in Given / When / Then form with an **observable** result. Number the constraints `K1`, `K2`, … the same way.

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
2. If an answer is itself vague or fits none of the options, ask a follow-up before recording it. For each clear answer, add a Decision (`D#`: question, answer, affected requirements), rewrite the affected requirements and criteria so no statement it overrides remains, and remove the question from "Open questions".
3. Re-run Step 4 on everything that changed. Answers often reveal new gaps.
4. Repeat until "Open questions" is empty. Never finish with unanswered questions; if the user skips one, ask it again.

Save the spec file after each round so progress survives an interrupted session. If the user ends the session early, leave the spec as `draft`. If a session resumes on a `draft` spec, continue from its "Open questions".

## Step 6: Finalise

Before marking the spec final, confirm all of these hold:

- [ ] "Open questions" is empty: every question was answered and recorded as a Decision.
- [ ] Every requirement has at least one acceptance criterion, and every criterion has an observable result.
- [ ] Every statement traces to the source requirements, a codebase fact or a decision.
- [ ] No vague words remain, and each term is used with one meaning throughout.
- [ ] No **how**: no tasks, files, code or technology choices beyond the traced constraints.
- [ ] "Out of scope" lists everything discussed and excluded.

Then show the user a short summary (the requirement list with one line each, plus the key decisions) and ask them to approve it. Treat any requested change as new requirements: apply it, re-run Steps 4–6 on it and ask again. Only after they approve, delete the empty "Open questions" section and set `Status: final`. A final spec never contains open questions.

If the requirements change after the spec is final, set it back to `Status: draft` and run Steps 4–6 again on the changes.

## Output

Report the spec file path and its status. If it is still `draft`, also list its open questions. Only the spec file is produced; no code. When stopped for missing requirements, no file is written; say what is needed.
