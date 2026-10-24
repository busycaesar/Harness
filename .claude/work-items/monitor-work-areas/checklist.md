# Checklist: Monitor — task-based boxes

Requirements: `.claude/work-items/monitor-work-areas/spec.md`

## Requirements

- [ ] C1 — R1.AC1 — Two live sessions render as two separate bordered regions.
  - Proof: test — with a snapshot fixture holding two live sessions, assert the rendered page contains exactly two session border elements, one per session id. Pass: count is 2.
  - Evidence: —

- [ ] C2 — R1.AC2 — A box belonging to session A renders inside session A's border and inside no other session's border.
  - Proof: test — with a two-session fixture where session A has a known box and session B has a different one, assert each box element is a descendant of its own session's border element and of no other. Pass: every box's ancestor border matches its session id.
  - Evidence: —

- [ ] C3 — R1.AC3 — A session's border carries that session's inferred `goal` as its label.
  - Proof: test — render a session fixture whose snapshot record has a known `goal` string; assert the border's label text equals that `goal`. Pass: exact match.
  - Evidence: —

- [ ] C4 — R2.AC1 — A session given three prompts that caused work renders three main boxes inside its border.
  - Proof: test — with a transcript/snapshot fixture containing three work-causing prompts for one session, assert exactly three main boxes render inside that session's border. Pass: count is 3.
  - Evidence: —

- [ ] C5 — R2.AC1 — Main boxes render in the order their tasks started, oldest first.
  - Proof: test — using the same three-task fixture with distinct task start times, assert the document order of the three main boxes matches ascending start time. Pass: order is oldest → newest.
  - Evidence: —

- [ ] C6 — R2.AC2 — A new prompt to a session that already has main boxes appends a new main box on the next snapshot refresh.
  - Proof: test — render snapshot N (two tasks), then snapshot N+1 (same two plus a third); assert the third main box is present and is last in document order within that border. Pass: three boxes, new one last.
  - Evidence: —

- [ ] C7 — R2.AC2 — The main boxes that already existed are unchanged after that refresh.
  - Proof: test — compare the rendered text and completion-cross state of the pre-existing main boxes between snapshot N and N+1. Pass: identical for every pre-existing box.
  - Evidence: —

- [ ] C8 — R2.AC3 — A prompt that spawned no agents and used no tools creates no main box.
  - Proof: test — fixture with a session whose only prompt has no agents and no tool use; assert zero main boxes render inside its border. Pass: count is 0.
  - Evidence: —

- [ ] C9 — R3.AC1 — Both helpers spawned by the session for one task render as boxes visibly connected to that task's main box.
  - Proof: test — fixture with one task and two session-spawned helpers; assert each helper box is rendered with a connector to that task's main box. Pass: two helper boxes, each linked to that main box.
  - Evidence: —

- [ ] C10 — R3.AC2 — A helper spawned by another helper connects to its own parent helper's box, not to the main box.
  - Proof: test — fixture with depth-3 nesting (main → helper A → helper B); assert helper B's box connects to helper A's box and not to the main box. Pass: B's parent link is A.
  - Evidence: —

- [ ] C11 — R3.AC3 — A task with no helpers renders its main box alone with no connector.
  - Proof: test — fixture with one task and zero agents beyond the main box; assert no connector element is rendered for that main box. Pass: connector count is 0.
  - Evidence: —

- [ ] C12 — R4.AC1 — Every box shows the text of the work it is doing.
  - Proof: test — for each box in a mixed fixture (main self-driven, main delegated, helper), assert its rendered text is non-empty and equals the expected work text for that box. Pass: all boxes carry their work text.
  - Evidence: —

- [ ] C13 — R4.AC1 — No box shows model, branch, token counts, elapsed time, agent type, status chip, or session name.
  - Proof: test — fixture where the snapshot values for model, branch, tokens, elapsed time, agentType, state/status and session name are distinctive strings; assert none of those strings and no element for those fields appears inside any box. Pass: zero occurrences inside box elements.
  - Evidence: —

- [ ] C14 — R4.AC2 — A main box for a task the session performs itself shows a short inferred title for that task.
  - Proof: test — fixture for a self-driven task with a known inferred title; assert the main box text equals that inferred title and does not equal or contain the raw prompt text. Pass: title matches, prompt text absent.
  - Evidence: —

- [ ] C15 — R4.AC3 — A main box for a task delegated whole to one agent shows that agent's `description`.
  - Proof: test — fixture where one task is a single delegated agent with a known `description`; assert the main box text equals that `description`. Pass: exact match.
  - Evidence: —

- [ ] C16 — R4.AC4 — A helper box shows that agent's `description`.
  - Proof: test — fixture with helpers carrying known `description` values; assert each helper box's text equals its agent's `description`. Pass: exact match for every helper.
  - Evidence: —

- [ ] C17 — R5.AC1 — A box for an agent whose work has finished is still present on the page.
  - Proof: test — fixture with one finished agent; assert its box element is present in the render. Pass: box found.
  - Evidence: —

- [ ] C18 — R5.AC1 — A finished agent's box shows a cross at its top-left corner.
  - Proof: behaviour — load the page against a fixture with one finished agent; assert the cross element exists within that box and its computed position places it at the box's top-left corner. Pass: cross present and positioned top-left.
  - Evidence: —

- [ ] C19 — R5.AC2 — A box for an agent still working shows no cross.
  - Proof: test — fixture with one in-progress agent; assert no cross element is rendered inside its box. Pass: cross count is 0.
  - Evidence: —

- [ ] C20 — R5.AC3 — The main box of a task whose every agent has finished, in a session that has moved on to a later task, is still present.
  - Proof: test — fixture with task 1 fully finished and task 2 active in the same session; assert task 1's main box is present. Pass: box found.
  - Evidence: —

- [ ] C21 — R5.AC3 — That earlier task's main box shows a cross.
  - Proof: test — same fixture; assert task 1's main box carries the cross marker. Pass: cross present.
  - Evidence: —

- [ ] C22 — R5.AC4 — Clicking the cross on a finished box does nothing.
  - Proof: behaviour — load the page with a finished box, click its cross, then compare the page DOM before and after. Pass: DOM unchanged, no box removed or toggled, no console error, no network request issued by the click.
  - Evidence: —

- [ ] C23 — R6.AC1 — A session with forty finished helper boxes renders all forty.
  - Proof: test — fixture with one session holding forty finished helpers; assert forty helper boxes render inside that session's border. Pass: count is 40.
  - Evidence: —

- [ ] C24 — R6.AC2 — When a session ends, its border and all its boxes are removed on the next refresh.
  - Proof: test — render snapshot N containing the session with boxes, then snapshot N+1 where that session is absent (not live); assert its border and every one of its boxes are gone from the render. Pass: zero elements for that session id.
  - Evidence: —

- [ ] C25 — Constraint "Zero runtime dependencies" — The monitor runs on Node built-ins only, with no runtime dependency added.
  - Proof: command — inspect `monitor/`'s package manifest and imports: `grep -rn "require(\|from '" monitor --include=*.js` and the manifest's `dependencies`. Pass: `dependencies` is empty or absent and every import resolves to a Node built-in or a file inside `monitor/`.
  - Evidence: —

- [ ] C26 — Constraint "one self-contained `monitor/public/index.html`" — The page is a single self-contained HTML file with no external asset requests.
  - Proof: command — `grep -nE "src=\"http|href=\"http|<script src=|<link .*stylesheet|fetch\(\"http" monitor/public/index.html`. Pass: no match to an external host; CSS and JS are inline in that one file.
  - Evidence: —

- [ ] C27 — Constraint "Nothing on the page is `position: sticky` or `fixed`" — No rule on the page sets those positions.
  - Proof: command — `grep -nE "position:\s*(sticky|fixed)" monitor/public/index.html`. Pass: no matches.
  - Evidence: —

- [ ] C28 — Constraint "the body never scrolls sideways" — The body holds `scrollWidth === clientWidth` at 375px, 768px and 1280px.
  - Proof: behaviour — load the page with a populated snapshot at each of the three viewport widths and read `document.body.scrollWidth` and `document.body.clientWidth`. Pass: equal at all three widths.
  - Evidence: —

- [ ] C29 — Constraint "The existing 74 tests must continue to pass" — The existing suite still passes.
  - Proof: command — `node --test monitor/test/`. Pass: exit status 0, at least 74 tests pass, 0 fail.
  - Evidence: —

- [ ] C30 — Constraint "Only the agent `description`, an inferred task title and the session `goal` may be rendered as text" — No prompt text, message content or file contents reach the page.
  - Proof: test — fixture whose transcripts carry distinctive prompt text, message content and file-content strings; assert the serialised snapshot sent to the page and the rendered page contain none of those strings, and that box and border text is drawn only from `description`, the inferred task title, and `goal`. Pass: zero occurrences of the distinctive strings.
  - Evidence: —
