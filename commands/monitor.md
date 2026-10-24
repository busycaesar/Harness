---
description: Start the local Claude Code monitor dashboard in the background and print the URL to open — a read-only view of the live sessions and subagents for this project
disable-model-invocation: true
metadata:
  model-tier: Budget
---

# Monitor (local session dashboard)

Launch the monitor server and hand the user its URL. The server does all the work; this command only starts it, confirms it answers and reports.

**Never read, quote or summarise transcript contents.** This command touches the server's HTTP responses only — never a session's `.jsonl` file, and never the text of a conversation. If asked to describe what a session is doing, point at the dashboard instead.

## Step 1: Find the server

Use the first of these that exists:

```bash
ls .claude/monitor/server.js
ls ~/.claude/monitor/server.js
```

If neither exists, say the monitor is not installed and stop.

## Step 2: Start it in the background

Start on port 4747:

```bash
node <path from Step 1> --port 4747
```

If it exits with `EADDRINUSE`, retry on 4748, then 4749, and so on until one listens. The port it is listening on is in the line it prints: `Claude Code monitor on http://127.0.0.1:<port>`.

## Step 3: Confirm it answers

```bash
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:<port>/
```

Anything other than `200` means it did not come up — report that and stop. Do not request `/api/state` or `/events` to "check the data"; the page is the only check needed.

## Step 4: Report

Tell the user, in a few lines:

- the URL to open: `http://127.0.0.1:<port>`;
- that it live-updates on its own, so the page stays open;
- to stop it, press `Ctrl+C` in the background shell, or run `kill <pid>` with the pid from Step 2.

Add once, plainly: the dashboard is read-only, binds to localhost only, and shows only the metadata Claude Code itself records — session and subagent status, token counts, turn latency and the name of the latest tool call.
