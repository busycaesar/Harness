---
name: deep-verify
description: Rigorous, multi-agent, evidence-backed verification of specific claims about code. Use when the user wants something in a codebase verified, confirmed or double-checked and a wrong answer would be costly; not for simple lookups or open-ended exploration with no specific claim to test.
---

# Deep Verify

Verify claims about code with the rigor of a code audit. The goal is a **correct** answer with **evidence**, not a fast or agreeable one. Several independent agents investigate in parallel, each trying to *disprove* its claim, and a final skeptical pass challenges the results before anything is reported.

## Core principles

1. **Falsify, don't confirm.** Every investigator's job is to find the case where the claim is false. A claim survives only if a real attempt to break it fails.
2. **Evidence or it didn't happen.** Every conclusion needs a `file:line` reference, a command and its actual output, or a test result. "Looks like" and "should" are not evidence.
3. **Runtime path, not just text.** Finding code that *appears* to do X is not the same as X happening. Check that the code is reachable, not overridden, not behind a flag, not shadowed, not dead, and that the dependency versions actually installed behave as assumed.
4. **Run things when you can.** Prefer executing a test, script, or minimal repro over reasoning about behavior. Static reading alone caps confidence at "likely".
5. **Say "unverified" freely.** An honest "could not verify, because X" beats a confident guess. Never fill gaps with plausible-sounding inference.
6. **Don't lead the witness.** Give investigators the claim and the scope, not your hypothesis about the answer.

## Workflow

### Step 1: Restate and decompose the claims

Before spawning anything:

- Restate what the user wants verified in precise terms. If a claim is ambiguous in a way that changes the answer (e.g. "thread-safe" under what usage? "handles errors" which errors?), pick the most reasonable interpretation, state it explicitly, and flag it in the final report. Only stop to ask the user if the ambiguity makes the whole task meaningless.
- Split compound statements into **atomic, falsifiable claims**. "The cache is invalidated correctly on update and delete" is two claims. "Auth is enforced on all admin routes" is one claim that needs an enumeration of routes first.
- For each claim, write down:
  - **Claim:** one sentence, testable as true/false.
  - **Falsifier:** what observation would prove it false.
  - **Scope:** directories, modules, entry points, versions, environments in play.
  - **Evidence plan:** what to read, what to run.

Show this list to the user briefly (a compact table is fine), then proceed. Do not wait for approval unless the user asked you to.

### Step 2: Spawn parallel investigators

Read `max_parallel_tasks` from `.claude/config/settings.yaml`. If missing, use 4.

Launch **one subagent per claim** (or per tightly coupled cluster of claims), at most `max_parallel_tasks` at once, with each in an isolated context so they cannot anchor on each other's conclusions. If a claim is broad (e.g. "all routes"), add a prior enumeration step or split by module so coverage is checkable.

If subagents are unavailable in this environment, run the investigations sequentially yourself, and at the start of each one deliberately discard assumptions from the previous. Note in the final report that independence was reduced.

Each investigator gets this brief (fill in the brackets):

```
You are verifying ONE specific claim about the code in [repo/path]. Your job is to
try to DISPROVE it. Report what is true, not what is expected.

CLAIM: [atomic claim]
SCOPE: [paths, modules, entry points, versions]
FALSIFIER: [what would show the claim is false]

Method:
1. Locate every relevant code path. Enumerate exhaustively rather than sampling
   (grep/glob for all call sites, implementations, overrides, config, feature flags).
2. Trace the real runtime path from entry point to effect. Check: reachability,
   overrides/shadowing, conditionals and flags, error and edge paths, concurrency,
   defaults, and the installed (not assumed) dependency versions.
3. Actively look for counterexamples: inputs, states, orderings, or configurations
   where the claim breaks.
4. Where possible, EXECUTE something (existing test, a minimal repro script, a
   command) and record the real output. Do not modify tracked source files; put any
   scratch scripts in a temp directory and clean up.
5. Check for existing tests: do they actually cover the claim, or merely appear to?

Do not speculate beyond what you observed. If you cannot determine something, say
so and say what blocked you.

Return EXACTLY this format:
VERDICT: CONFIRMED | REFUTED | PARTIALLY TRUE | UNVERIFIABLE
CONFIDENCE: high | medium | low  (high requires executed evidence or exhaustive
            static trace)
EVIDENCE: bullet list of file:line refs and/or commands with real output
COUNTEREXAMPLES / GAPS: cases where it fails, paths you could not cover
WHAT I RAN: commands or tests executed, or "nothing executed (static only)"
CAVEATS: assumptions, environment dependencies, things that could change the answer
```

### Step 3: Collect and sanity-check the reports

For each report, before accepting it:

- Does the evidence actually support the verdict? Open the cited lines yourself for any high-stakes or surprising conclusion.
- Is the verdict "CONFIRMED" resting only on static reading? Downgrade confidence or run the check.
- Did the investigator enumerate or sample? A confirmation based on sampling is only a partial confirmation.
- Do reports contradict each other or the user's premise? Resolve it rather than averaging it.

### Step 4: Adversarial review pass

For every CONFIRMED or PARTIALLY TRUE verdict that matters to the user's decision, spawn a fresh **skeptic agent** (independent of the original investigator). Give it the claim and the investigator's evidence, and instruct:

```
Another agent concluded this claim is [verdict] based on the evidence below. Assume
it is wrong or incomplete. Find the flaw: a missed code path, an unreachable
branch, an untested edge case, a version or config difference, a race, a
misread of the code. Re-check the cited evidence independently. Report either a
concrete counterexample, or "no flaw found" along with what you checked.
```

If a skeptic finds a real flaw, update the verdict (and re-investigate if needed). Skip this pass only for trivial claims, and say you skipped it.

### Step 5: Synthesize

Produce the final report in this structure:

1. **Bottom line:** one or two sentences answering the user's actual question directly.
2. **Verdict table:** one row per claim with verdict, confidence, and the single strongest piece of evidence.
3. **Findings:** per claim, a short explanation with `file:line` references and any executed output. Lead with refuted and partial claims; they matter most.
4. **Counterexamples and risks:** concrete cases where behavior diverges from the claim.
5. **What was not verified:** gaps, assumptions, interpretations you chose, environments not tested, and why.
6. **Method:** how many agents, what was executed vs. read statically, whether the skeptic pass ran.

Keep it tight. Do not pad confirmations with narrative; do not bury a refutation.

## Verdict definitions

- **CONFIRMED:** Holds on all examined paths, a genuine attempt to falsify failed, and (for high confidence) it was demonstrated by execution or exhaustive trace.
- **REFUTED:** A concrete counterexample or contradicting evidence exists.
- **PARTIALLY TRUE:** True under some conditions, inputs, or paths and false under others. Always state the boundary precisely.
- **UNVERIFIABLE:** Could not be determined with available code, tools, or access. State exactly what would be needed.

## Common traps to check for

- Code exists but is never called, or is called only in tests.
- A subclass, decorator, middleware, monkey-patch, or config override changes the behavior.
- Behavior differs between dev, test, and prod config, or by feature flag or env var.
- A test passes but asserts nothing meaningful, mocks the very thing under test, or is skipped.
- Docs, comments, or function names claim behavior the code does not implement.
- Error, timeout, retry, empty-input, null, and concurrent-access paths differ from the happy path.
- Installed dependency version differs from the one the code was written against.
- Generated, vendored, or duplicated code means the grep hit isn't the one that runs.
- Off-by-one, ordering, time zone, encoding, and integer overflow edge cases.

## Behavior rules

- Do not edit the user's source code during verification unless explicitly asked. Scratch repro files go in a temp dir.
- No git state changes: no staging, committing, stashing, branching, resetting or checking out. Read-only git commands are fine.
- Do not run destructive commands, touch production resources, or use real credentials. If verification would require that, report UNVERIFIABLE and explain, or ask.
- Never report a claim as confirmed because the user (or a comment, or a doc) said it was true.
- If the user's premise is wrong, say so plainly and show the evidence.
- Match effort to stakes: a single trivial claim may need one agent and no skeptic; a security or correctness claim deserves the full process.
