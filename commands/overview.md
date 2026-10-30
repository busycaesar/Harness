---
description: Work out how a project actually processes its work, from the kinds of input it accepts through every processing step to what it finally produces, and draw it as an interactive pipeline overview: one self-contained HTML file. Use to understand what a system does, as opposed to which file imports which.
argument-hint: "[folder to read, default: the whole project]"
disable-model-invocation: true
metadata:
  model-tier: Mid
---

# Pipeline overview

Work out what this project does to the work it is given: what kinds of input it accepts, every step that transforms them, which step feeds which, and what comes out the other end. Hand those findings to the `draw-architecture-map` skill, which draws them.

This command owns the analysis. It makes no decision about how the map looks.

Writes nothing in the project except the map file at the configured path. Its data file goes to a temporary location outside the project and is deleted once the map is drawn. No git state changes.

## What this map is, and is not

A **step** is something that happens to the work: an image is decoded, an embedding is computed, a transcript is produced. A step is named for what it does, in the project's own words, not for the file that does it.

This is not a file map. One step may span several files, and one file may hold several steps. A module that only configures, logs or validates is not a step. If a reader could not point at the output of a node and say what it is, it is not a step.

## The one rule: only what the code proves

Every step and every arrow comes from code in this project. Declared architecture is not evidence: a README diagram or an architecture doc says what someone intended, and this map says what the code does. Where the code settles nothing, leave it off and say so in the report.

## Step 1: Settings

1. Read the `overview` path from `.claude/config/paths.yaml`. If the file or key is missing, use `pipeline-map.html` at the project root. An existing map at that path is replaced.
2. Read `max_parallel_tasks` from `.claude/config/settings.yaml`. If missing, use 4.
3. If `$ARGUMENTS` names a folder, read only that folder. Otherwise read the whole project.

## Step 2: Find the kinds of input

Start at the outside. What can be handed to this project, and in what forms? Look at what entry points accept, what request or message shapes are parsed, what file extensions are branched on, what the type of the first argument is where work begins.

Each distinct kind of input is a step of its own, and is an entry point on the map. Two inputs are distinct when they take different paths through the code, not when they merely have different names.

## Step 3: Find the steps

Follow each input through the code, recording each place the work changes form or gains meaning. A step is worth drawing when it has a name a reader would recognise and an output a reader could describe.

Look for the places work actually changes:

- A decode, parse or load that turns bytes into something structured.
- A model invocation, inference call or scoring pass.
- A transform that derives something new: an embedding, a transcript, a crop, a cluster.
- A merge that combines several earlier results into one.
- A write, publish or return that sends the result onwards.

Where a long function performs several of these in sequence, that is several steps, not one. Where several files cooperate on one named operation, that is one step.

Stop when the work leaves the project. Name the final step for what is produced, not for the act of producing it.

For a large project, split the search across subagents by top-level folder, at most `max_parallel_tasks` at once. Each returns the steps it found with their file and line, and what each step consumes. Subagents only read.

## Step 4: Find what feeds what

An arrow means one step consumes what another produces. Prove it from the code: a call whose argument is the earlier step's return, a field read from a shared result object, a queue or file one writes and the other reads.

Two steps that merely run in sequence are not connected. Shared ordering is not data flow.

A step that several others consume, such as an embedding computed once and used by many scorers, is drawn once and consumed many times. Never duplicate it per consumer.

## Step 5: Group the steps

Give every step a group: a short noun for the part of the system it belongs to, in the project's own vocabulary. Groups are how the map stays readable, so prefer a handful of meaningful groups over many thin ones.

A group holds steps that belong to one concern. If a group would hold one step and that step is not genuinely alone in its concern, fold it into a neighbour.

## Step 6: Order the stages

Stages are the columns of the map, left to right, in the order the work flows. Derive them from the pipeline itself: intake, then whatever transformations the project performs in order, then output.

Name stages for what happens in them, not for layers of a stack. Every stage must hold at least one step; a stage that holds nothing is not a stage.

Assign every group to the stage its steps belong to. A group whose steps straddle two stages is two groups.

## Step 7: Draw it

Write the data file to a temporary location outside the project, in the shape the `draw-architecture-map` skill documents, mapping this analysis onto it:

| This analysis | The data file |
|---|---|
| A step | An entry in `files`, named `<group>/<step>` |
| One step consuming another | A pair in `imports`, as `[consuming step, consumed step]` |
| A kind of input | An entry in `entries` |
| The stages, in flow order | `tiers` |
| Each group's stage | `tierOf`, keyed by group name |

Set `orientation` to `vertical`, so the stages draw as bands stacked top to bottom and the flow reads left to right within each one. Stages are steps of a pipeline, not layers of a stack.

Then invoke the `draw-architecture-map` skill with the data file and the map path from Step 1, and delete the data file once the map is written.

Do not write or patch the HTML. If the skill reports an error, fix the data and invoke it again; if it reports warnings, carry them into the report.

## Step 8: Report

In a few lines:

- The map path, and how many steps, arrows and stages it holds.
- Every warning the skill reported.
- **What the code did not settle:** a step whose consumer is unclear, an input whose path could not be followed to an output, a branch that was taken on configuration the repository does not fix. Name each one and what is missing.
- Anything found that looks wrong rather than merely unknown: a step nothing consumes, an input that reaches no output, two steps that consume each other.
