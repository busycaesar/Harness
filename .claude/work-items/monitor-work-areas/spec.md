# Monitor: independent areas of work

Status: draft

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

## Goal

Restructure the monitor UI so each session is a bordered region containing one box per independent area of work, with each area's subagent boxes connected to the box driving that area, and finished work staying visible rather than disappearing.

## Requirements

### R1 — A session is a bordered region

Each live session renders as a bordered region on the page. Boxes belonging to that session render inside its border.

Acceptance criteria:

- R1.AC1 — Given two live sessions, when the page renders, then two separate bordered regions appear.
- R1.AC2 — Given a box belonging to session A, when the page renders, then that box appears inside session A's border and not inside any other session's border.

### R2 — Boxes show only the task

Every box shows only the task its agent is performing, and no other field.

Acceptance criteria:

- R2.AC1 — Given any box, when the page renders, then the box displays the task text and none of: model, branch, token counts, elapsed time, agent type, status chip.

### R3 — Subagent boxes connect to their main agent box

Within an area of work, each subagent box is visually connected to the box of the agent that spawned it.

Acceptance criteria:

- R3.AC1 — Given a main agent box with two subagent boxes, when the page renders, then a visible connector joins each subagent box to that main agent box.
- R3.AC2 — Given a main agent box with no subagents, when the page renders, then the box renders alone with no orphaned connector.

### R4 — Finished work stays visible, marked with a cross

A box for completed work remains on screen and carries a cross at its top-left corner.

Acceptance criteria:

- R4.AC1 — Given an agent whose work has finished, when the page renders, then its box is still present and shows a cross at the top-left corner.
- R4.AC2 — Given an agent still working, when the page renders, then its box shows no cross.

## Out of scope

- Changing the server's polling, transport or storage model.
- Dollar cost, history beyond the live snapshot, and alerting.

## Constraints

- Zero runtime dependencies; a single self-contained `monitor/public/index.html` and Node built-ins only. (Source: Codebase fact F1)
- Nothing on the page is `position: sticky` or `fixed`; the body must never scroll sideways at 375px, 768px or 1280px. (Source: Source requirements, earlier decisions in this project)
- The existing 74 tests must continue to pass. (Source: Codebase fact F7)

## Codebase facts

- F1 — The monitor is a zero-dependency Node server serving one self-contained page over SSE. (`monitor/server.js:1`)
- F2 — Each subagent's metadata file records `agentType`, `description`, `toolUseId` and `spawnDepth`; the reader exposes `agentType` and `spawnDepth`. (`monitor/lib/subagents.js:40`, `monitor/lib/subagents.js:42`)
- F3 — The parent of an agent is derivable: a child agent's `toolUseId` appears inside its parent's transcript. Verified by locating child `a32cd01373aa2bed4` (`toolUseId toolu_01CyWvnibcWgt9znoFcmDZm1`) inside `agent-ab10ada4292044579.jsonl`. (`~/.claude/projects/<project>/<session>/subagents/`)
- F4 — Real sessions nest three levels deep, not two: session `f59d05dd` currently holds 19 agents at depth 1, 9 at depth 2 and 11 at depth 3.
- F5 — The snapshot exposes a flat `agents[]` per session carrying `agentType`, `description`, `spawnDepth`, `state`, `summary`, `tokens`, `lastActivityAt`; it does not carry a parent reference. (`monitor/lib/snapshot.js:25`)
- F6 — The session record carries an inferred `goal` plus `goalSource`, resolved from its agents' descriptions. (`monitor/lib/snapshot.js:37`)
- F7 — The suite runs via `node --test monitor/test/` and currently reports 74 passing.
- F8 — A session's own current activity is exposed as `summary`, derived from its latest tool call. (`monitor/lib/snapshot.js:51`)

## Decisions

_None yet._

## Open questions

- Q1 — When is the SESSION itself the main agent box, versus each depth-1 agent being its own main agent box? Both of the source requirement's cases ("/dev" and "scan the repo") are depth-1 agents spawned by the session, and nothing in the data distinguishes them. Affects: R1, R3.
- Q2 — Real data nests three levels deep (F4). How should depth-3 agents render? Affects: R3.
- Q3 — Is the cross a static marker or a control the user can click? If clickable, what does it do? Affects: R4.
- Q4 — Finished boxes accumulate; one real session already holds 39 finished agents (F4). Is there any retention limit? Affects: R4.
- Q5 — Does the session border itself carry any label, such as the inferred goal (F6)? With R2 removing all other fields, a session would otherwise be unidentifiable. Affects: R1, R2.
- Q6 — What task text does a box show when the SESSION is the main agent — its inferred goal (F6), or its live summary (F8)? Affects: R2.
