# Monitor: task-based boxes

Status: final

## Source requirements

For each session we just have a border on the screen. The boxes represent the independent areas of work regardless if the session is working on it or even if one of the subagent is working on that particular topic. This box would be under that border if it belongs to that section. For now, just the box should only have the task that that agent is doing, including the subagent. Each subagent box should be connected with the main agent box. Now here is the example to help you understand it better.

Session 1:
We ask session 1 to update xyz in the code and use /dev to do it.
It spins up the /dev command in a subagent. Because this subagent is doing the whole task, we call this the mai agent. This main agent will further spin up subagent for lets say when it comes to implementation. For eg, it spins up 2 more subagents. Now these two subagents will be connected with the main agent.
We also ask this session to scan the repo for clean coding practices from harness rule.
The session is doing the active work. In that case, the session is the main agent. It still spins up the subagent to do individual tasks. These subagents are connected with the main agent.

Session 2:
We ask it to update the readme file. It spins up a few subagents to do things.

With the above example, the monitor UI should have

2 borders
In 1 border, 2 agent boxes, both connected with their subagent boxes.
In 2 border, 1 agent box, connected with their subagents.

Each box only shows the task that its performing.

Even if the whole task is done, keep the box there. Add a cross at the top left corner if the boxes of the tasks which are done.

### Clarification given during specification

"Now the box is based on the task. Task A: Whoever does that task, actively working on it, is the main box on the monitor. This box says the work its doing. If this spins up a subagent which helps it complete Task A, that box has the information on what its working on. This box is connected with the main box. Even when the task is complete, the main agent box is still there on the screen. If I give it Task B, then a new main agent box will be added. The old box for Task A is still there. So now, we are tracking task rather than real time session information."

## Goal

Turn the monitor from a live view of sessions into a record of tasks: each session is a bordered region that accumulates one main box per task given to it, with the helper agents for that task connected beneath it, and nothing ever disappearing once it has appeared.

## Requirements

### R1 — A session is a bordered region

Each live session renders as a bordered region. Every box belonging to that session renders inside its border.

Acceptance criteria:

- R1.AC1 — Given two live sessions, when the page renders, then two separate bordered regions appear.
- R1.AC2 — Given a box belonging to session A, when the page renders, then it appears inside session A's border and no other.
- R1.AC3 — Given a session, when the page renders, then its border carries the session's inferred goal as a quiet label. (Source: D5)
- R1.AC4 — Given two or more live sessions, when the page renders, then their borders are stacked vertically, one per row, each spanning the page width. (Source: D8)

### R2 — One main box per task

A task is the unit of work started by one user prompt to a session. Each task renders as one main box inside its session's border. Boxes appear in the order their tasks started, oldest first.

Acceptance criteria:

- R2.AC1 — Given a session that has been given three prompts that caused work, when the page renders, then three main boxes appear inside its border, ordered oldest first.
- R2.AC2 — Given a new prompt to a session that already has main boxes, when the snapshot refreshes, then a new main box is appended and the existing boxes remain unchanged.
- R2.AC3 — Given a prompt that caused no work (no agents spawned and no tool use), when the page renders, then no main box is created for it. (Source: D7)

### R3 — Helper boxes connect to their main box

An agent spawned while a task is active is a helper for that task. Each helper renders as a box connected to the box of the agent that spawned it: the main box when the session spawned it directly, or its parent helper's box when an agent spawned it.

Acceptance criteria:

- R3.AC1 — Given a task whose session spawned two helpers, when the page renders, then both helper boxes are visibly connected to that task's main box.
- R3.AC2 — Given a helper that itself spawned a helper, when the page renders, then the deeper box connects to its own parent box, not to the main box. (Source: D2)
- R3.AC3 — Given a task with no helpers, when the page renders, then its main box renders alone with no orphaned connector.

### R4 — Boxes show only the work

Every box shows only the text of the work it is doing, plus the completion cross from R5. No other field appears.

Acceptance criteria:

- R4.AC1 — Given any box, when the page renders, then it shows work text and none of: model, branch, token counts, elapsed time, agent type, status chip, session name.
- R4.AC2 — Given a main box for a task the session is doing itself, when the page renders, then its text is a short inferred title for that task. (Source: D6)
- R4.AC3 — Given a main box for a task delegated whole to one agent, when the page renders, then its text is that agent's description. (Source: D6)
- R4.AC4 — Given a helper box, when the page renders, then its text is that agent's description.
- R4.AC5 — Given any box, when the page renders, then it is a fixed-width rectangle whose text wraps onto several lines, neither a full-width single-line bar nor a square. (Source: D9)

### R5 — Finished main boxes stay, marked with a dismissable cross

A main box whose task has finished stays on screen and shows a cross at its top-left corner. Clicking the cross removes that box from view.

Acceptance criteria:

- R5.AC1 — Given a task whose work has finished, when the page renders, then its main box is still present and shows a cross at its top-left corner.
- R5.AC2 — Given a task still in progress, when the page renders, then its main box shows no cross.
- R5.AC3 — Given a task whose every agent has finished and whose session has moved on to a later task, when the page renders, then that task's main box is still present and shows a cross.
- R5.AC4 — Given a finished main box, when the user clicks its cross, then that box is removed from the page. (Source: D3)
- R5.AC5 — Given a box removed by its cross, when the next snapshot arrives, then it does not reappear. (Source: D3)

### R6 — Finished helpers vanish, main boxes persist

A helper box is removed as soon as its own agent finishes. A main box persists for as long as its session is live, whether or not its task has finished.

Acceptance criteria:

- R6.AC1 — Given a helper whose agent has finished, when the page renders, then that helper's box is absent. (Source: D4)
- R6.AC2 — Given a finished task, when the page renders, then only its main box appears, with no helper boxes beneath it. (Source: D4)
- R6.AC3 — Given a session that ends, when the page refreshes, then its border and all its boxes are removed, because the snapshot carries only live sessions. (Source: F9)

## Out of scope

- Persisting tasks across a session ending, or across a monitor restart.
- Changing the server's polling interval, transport or storage model.
- Token counts, latency, dollar cost and alerting on boxes.
- Re-introducing charts removed earlier in this project.

## Constraints

- Zero runtime dependencies: Node built-ins only, and one self-contained `monitor/public/index.html`. (Source: F1)
- Nothing on the page is `position: sticky` or `fixed`; the body never scrolls sideways at 375px, 768px or 1280px. (Source: F10)
- The existing 74 tests must continue to pass. (Source: F7)
- Only the agent `description`, an inferred task title and the session `goal` may be rendered as text; no prompt text, message content or file contents reach the page. (Source: F11)

## Codebase facts

- F1 — The monitor is a zero-dependency Node server serving one self-contained page over SSE. (`monitor/server.js:1`)
- F2 — Each subagent's metadata file records `agentType`, `description`, `toolUseId` and `spawnDepth`. (`monitor/lib/subagents.js:40`, `monitor/lib/subagents.js:42`)
- F3 — An agent's parent is derivable: the child's `toolUseId` appears inside its parent's transcript. Verified by locating child `a32cd01373aa2bed4` (`toolUseId toolu_01CyWvnibcWgt9znoFcmDZm1`) inside `agent-ab10ada4292044579.jsonl`.
- F4 — Real sessions nest three levels deep: session `f59d05dd` holds 19 agents at depth 1, 9 at depth 2 and 11 at depth 3.
- F5 — The snapshot exposes a flat `agents[]` per session with `agentType`, `description`, `spawnDepth`, `state`, `summary`, `tokens`, `lastActivityAt`, and no parent reference. (`monitor/lib/snapshot.js:25`)
- F6 — The session record carries an inferred `goal` and `goalSource`, produced by shelling out to the `claude` CLI and cached on disk. (`monitor/lib/snapshot.js:37`, `monitor/lib/session-goal.js`)
- F7 — The suite runs via `node --test monitor/test/` and currently reports 74 passing.
- F8 — Prompt boundaries are recorded in a session transcript: lines of type `last-prompt` carry `lastPrompt`, and user lines carry a `promptId`.
- F9 — The snapshot contains only sessions whose process is alive; dead sessions are filtered out. (`monitor/lib/live-sessions.js`)
- F10 — The page has no `position: sticky` or `fixed` rule and holds `scrollWidth === clientWidth` at 375px, 768px and 1280px, verified in earlier work.
- F11 — The snapshot deliberately carries no message text, prompt text or file contents; only short bounded labels.

## Decisions

- D1 — Q: What groups boxes — session, agent, or task? → A: The task. A task is the work started by one user prompt; whoever actively works on it owns the main box, and agents spawned to help are connected to it. Boxes accumulate per task and never disappear. Affects: R2, R3, R5, R6.
- D2 — Q: Real data nests three levels deep; how should a depth-3 box render? → A: Delegated to me. Nest it under its real parent, because flattening would misstate who spawned what and the parent link is derivable (F3). Affects: R3.
- D3 — Q: Is the cross static or interactive? → A: Superseded by the user on review: the cross is clickable and removes its box. The page keeps the dismissed set in memory so a dismissed box does not return on the next snapshot. Affects: R5.
- D4 — Q: Should finished boxes ever drop off? → A: Superseded by the user on review: a helper box vanishes as soon as its own agent finishes, so a finished task shows only its main box. Main boxes still persist for the life of the session. Affects: R6.
- D8 — Q: How are session borders arranged? → A: User on review: stacked vertically, one per row, each spanning the page width. Affects: R1.
- D9 — Q: What shape is a box? → A: User on review: a fixed-width rectangle whose text wraps onto several lines — not a square, and not a full-width single-line bar. Affects: R4.
- D5 — Q: Does the border carry any label? → A: Delegated to me. Yes, the session's inferred goal, quietly, because with every other field removed a border would otherwise be unidentifiable. Affects: R1.
- D6 — Q: What text does a main box show? → A: Delegated to me. The delegated agent's description when one agent owns the whole task; otherwise a short inferred title for the task, reusing the existing goal-inference mechanism (F6), because raw prompt text is conversational and unsuitable as a label. Affects: R4.
- D7 — Q: Does a prompt that causes no work create a box? → A: Delegated to me. No, because a conversational reply with no tool use is not a task and would fill the page with empty boxes. Affects: R2.
