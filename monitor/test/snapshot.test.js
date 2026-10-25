const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createSnapshotBuilder } = require('../lib/snapshot');
const { createGoalResolver } = require('../lib/session-goal');
const {
  makeTempDirectory,
  removeDirectory,
  assistantLine,
  promptLine,
  toolResultLine,
  toolUseBlock,
  usageOf,
  writeTranscript,
  appendToTranscript,
  writeSessionFile,
  sessionRecord,
  sessionDirectoryFor,
  writeSubagent,
  setSpawnTime,
  aiTitleLine,
  turnDurationLine,
  taskNotificationLine,
  setModifiedTime,
} = require('./helpers');

const NOW = 1_000_000_000;
const SECRET_PHRASE = 'distinctive-secret-phrase';
const FAKE_CLI = path.join(__dirname, 'fake-cli');
const FIRST_PROMPT_AT = '2026-01-01T00:00:10.000Z';
const SECOND_PROMPT_AT = '2026-01-01T00:10:00.000Z';
const FIRST_TASK_STARTED_AT = Date.parse(FIRST_PROMPT_AT);
const SECOND_TASK_STARTED_AT = Date.parse(SECOND_PROMPT_AT);

function withClaudeDir(run) {
  const claudeDir = makeTempDirectory();
  try {
    run(claudeDir);
  } finally {
    removeDirectory(claudeDir);
  }
}

async function withClaudeDirUntilQuiet(run) {
  const claudeDir = makeTempDirectory();
  try {
    await run(claudeDir);
  } finally {
    removeDirectory(claudeDir);
  }
}

function buildWith(claudeDir, isAlive = () => true, nowMs = () => NOW) {
  return createSnapshotBuilder({ claudeDir, isAlive, nowMs })();
}

test('builds a session with tokens, summary and current turn start', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord({ status: 'busy' });
    writeSessionFile(claudeDir, record);
    writeTranscript(path.join(sessionDirectoryFor(claudeDir, record), `${record.sessionId}.jsonl`), [
      { ...promptLine('2026-01-01T00:00:05.000Z', SECRET_PHRASE), gitBranch: 'feature/x', effort: 'high' },
      assistantLine({
        id: 'm1',
        usage: usageOf(10, 20, 30, 40),
        model: 'claude-test',
        blocks: [{ type: 'text', text: SECRET_PHRASE }, toolUseBlock('Edit', { file_path: '/p/q/app.js', new_string: SECRET_PHRASE })],
      }),
      { type: 'system', subtype: 'turn_duration', durationMs: 900, pendingBackgroundAgentCount: 3 },
    ]);
    const snapshot = buildWith(claudeDir);
    const [session] = snapshot.sessions;
    assert.equal(snapshot.generatedAt, NOW);
    assert.deepEqual(session.tokens, { input: 10, output: 20, cacheRead: 30, cacheCreation: 40 });
    assert.equal(session.summary, 'Editing app.js');
    assert.equal(session.model, 'claude-test');
    assert.equal(session.gitBranch, 'feature/x');
    assert.equal(session.effort, 'high');
    assert.equal(session.lastTurnDurationMs, 900);
    assert.equal(session.pendingBackgroundAgents, 3);
    assert.equal(session.currentTurnStartedAt, Date.parse('2026-01-01T00:00:05.000Z'));
    assert.equal(session.project, 'demo-project');
    assert.ok(!JSON.stringify(snapshot).includes(SECRET_PHRASE));
  });
});

test('idle session reports Idle and no current turn', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord({ status: 'idle' });
    writeSessionFile(claudeDir, record);
    writeTranscript(path.join(sessionDirectoryFor(claudeDir, record), `${record.sessionId}.jsonl`), [
      promptLine('2026-01-01T00:00:05.000Z'),
    ]);
    const [session] = buildWith(claudeDir).sessions;
    assert.equal(session.summary, 'Idle');
    assert.equal(session.currentTurnStartedAt, null);
  });
});

test('session without a transcript has zero tokens and Starting summary', () => {
  withClaudeDir((claudeDir) => {
    writeSessionFile(claudeDir, sessionRecord());
    const [session] = buildWith(claudeDir).sessions;
    assert.deepEqual(session.tokens, { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });
    assert.equal(session.summary, 'Starting');
    assert.equal(session.model, null);
    assert.equal(session.pendingBackgroundAgents, null);
  });
});

test('a waiting session reports the waiting status and what it waits for', () => {
  withClaudeDir((claudeDir) => {
    writeSessionFile(claudeDir, sessionRecord({ status: 'waiting', waitingFor: 'permission prompt' }));
    const [session] = buildWith(claudeDir).sessions;
    assert.equal(session.status, 'waiting');
    assert.equal(session.waitingFor, 'permission prompt');
    assert.equal(session.summary, 'Waiting for input');
  });
});

test('a shell session is reported as busy with no waitingFor', () => {
  withClaudeDir((claudeDir) => {
    writeSessionFile(claudeDir, sessionRecord({ status: 'shell' }));
    const [session] = buildWith(claudeDir).sessions;
    assert.equal(session.status, 'busy');
    assert.equal(session.waitingFor, null);
  });
});

test('drops sessions with dead pids and counts live sessions per project', () => {
  withClaudeDir((claudeDir) => {
    writeSessionFile(claudeDir, sessionRecord({ pid: 1, sessionId: 's1' }));
    writeSessionFile(claudeDir, sessionRecord({ pid: 2, sessionId: 's2' }));
    writeSessionFile(claudeDir, sessionRecord({ pid: 3, sessionId: 's3' }));
    const snapshot = buildWith(claudeDir, (pid) => pid !== 3);
    assert.deepEqual(snapshot.sessions.map((session) => session.sessionId).sort(), ['s1', 's2']);
    assert.deepEqual(snapshot.projects.map(({ name, liveSessions }) => [name, liveSessions]), [['demo-project', 2]]);
  });
});

test('sorts waiting sessions first, then busy, then newest status change', () => {
  withClaudeDir((claudeDir) => {
    writeSessionFile(claudeDir, sessionRecord({ pid: 1, sessionId: 'idle-new', status: 'idle', statusUpdatedAt: 900 }));
    writeSessionFile(claudeDir, sessionRecord({ pid: 2, sessionId: 'busy-old', status: 'busy', statusUpdatedAt: 100 }));
    writeSessionFile(claudeDir, sessionRecord({ pid: 3, sessionId: 'busy-new', status: 'busy', statusUpdatedAt: 500 }));
    writeSessionFile(claudeDir, sessionRecord({ pid: 4, sessionId: 'waiting-old', status: 'waiting', statusUpdatedAt: 50 }));
    const order = buildWith(claudeDir).sessions.map((session) => session.sessionId);
    assert.deepEqual(order, ['waiting-old', 'busy-new', 'busy-old', 'idle-new']);
  });
});

test('groups sessions of one repository under its root and records their workspaces', () => {
  withClaudeDir((claudeDir) => {
    const repo = path.join(claudeDir, 'repos', 'genesis-on-prem');
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    const loose = path.join(claudeDir, 'repos', 'scratch-folder');
    fs.mkdirSync(loose, { recursive: true });
    writeSessionFile(claudeDir, sessionRecord({ pid: 1, sessionId: 'classification', cwd: path.join(repo, 'link-classification') }));
    writeSessionFile(claudeDir, sessionRecord({ pid: 2, sessionId: 'ui', cwd: path.join(repo, 'link-ui') }));
    writeSessionFile(claudeDir, sessionRecord({ pid: 3, sessionId: 'root', cwd: repo }));
    writeSessionFile(claudeDir, sessionRecord({ pid: 4, sessionId: 'loose', cwd: loose }));

    const snapshot = buildWith(claudeDir);
    const workspaceById = Object.fromEntries(snapshot.sessions.map((session) => [session.sessionId, session.workspace]));
    assert.deepEqual(workspaceById, { classification: 'link-classification', ui: 'link-ui', root: null, loose: null });
    assert.ok(snapshot.sessions.every((session) => session.project === (session.sessionId === 'loose' ? 'scratch-folder' : 'genesis-on-prem')));
    assert.deepEqual(snapshot.projects, [
      { cwd: repo, name: 'genesis-on-prem', liveSessions: 3, workspaces: ['link-classification', 'link-ui'] },
      { cwd: loose, name: 'scratch-folder', liveSessions: 1, workspaces: [] },
    ]);
  });
});

test('subagent carries its type, depth, tokens and summary', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord();
    writeSessionFile(claudeDir, record);
    writeSubagent(claudeDir, record, 'working', { agentType: 'Explore', description: 'busy one', toolUseId: 'toolu-working', spawnDepth: 2 }, [
      assistantLine({ id: 'w1', usage: usageOf(5, 6, 7, 8), blocks: [toolUseBlock('Grep')] }),
    ]);
    writeSubagent(claudeDir, record, 'spawning', { agentType: 'Plan', description: 'no transcript yet', toolUseId: 'toolu-spawning', spawnDepth: 1 });

    const byId = Object.fromEntries(buildWith(claudeDir).sessions[0].agents.map((agent) => [agent.agentId, agent]));
    assert.equal(byId.working.state, 'active');
    assert.equal(byId.working.summary, 'Searching code');
    assert.deepEqual(byId.working.tokens, { input: 5, output: 6, cacheRead: 7, cacheCreation: 8 });
    assert.equal(byId.working.spawnDepth, 2);
    assert.equal(byId.spawning.state, 'active');
    assert.equal(byId.spawning.lastActivityAt, null);
    assert.equal(byId.spawning.summary, 'Starting');
  });
});

function agentStatesOf(session) {
  return Object.fromEntries(session.agents.map((agent) => [agent.agentId, agent.state]));
}

function openTurn(id, timestamp) {
  return assistantLine({ id, usage: usageOf(1, 1), timestamp, blocks: [toolUseBlock('Bash')] });
}

function closedTurn(id, timestamp, stopReason = 'end_turn') {
  return assistantLine({ id, usage: usageOf(1, 1), timestamp, stopReason });
}

test('a subagent is finished once its last turn reaches a terminal stop reason', () => {
  withClaudeDir((claudeDir) => {
    const session = sessionWithAgents(claudeDir, null, (record) => {
      writeSubagent(claudeDir, record, 'reported', agentMeta('reported back'), [closedTurn('e1', '2026-01-01T00:05:00.000Z')]);
      writeSubagent(claudeDir, record, 'cut-off', agentMeta('hit a stop sequence'), [
        closedTurn('s1', '2026-01-01T00:05:00.000Z', 'stop_sequence'),
      ]);
    });
    assert.deepEqual(agentStatesOf(session), { 'cut-off': 'finished', reported: 'finished' });
  });
});

test('a subagent that handed back its report is finished, and active again once it is continued', () => {
  withClaudeDir((claudeDir) => {
    const handback = assistantLine({
      id: 'h1',
      usage: usageOf(1, 1),
      timestamp: '2026-01-01T00:05:00.000Z',
      blocks: [toolUseBlock('SubagentHandback', { message: 'report' })],
    });
    const session = sessionWithAgents(claudeDir, null, (record) => {
      writeSubagent(claudeDir, record, 'handed-back', agentMeta('reported through the handback'), [
        handback,
        toolResultLine('2026-01-01T00:05:01.000Z'),
      ]);
      writeSubagent(claudeDir, record, 'continued', agentMeta('sent a follow-up'), [
        handback,
        toolResultLine('2026-01-01T00:05:01.000Z'),
        promptLine('2026-01-01T00:06:00.000Z', 'one more thing please'),
      ]);
    });
    assert.deepEqual(agentStatesOf(session), { continued: 'active', 'handed-back': 'finished' });
  });
});

test('a subagent mid tool call stays active however long its transcript has sat untouched', () => {
  withClaudeDir((claudeDir) => {
    const session = sessionWithAgents(claudeDir, null, (record) => {
      const metaFile = writeSubagent(claudeDir, record, 'slow', agentMeta('one very long command'), [
        openTurn('w1', '2026-01-01T00:05:00.000Z'),
      ]);
      setModifiedTime(path.join(path.dirname(metaFile), 'agent-slow.jsonl'), Date.now() - 3600000);
    });
    assert.deepEqual(agentStatesOf(session), { slow: 'active' });
  });
});

test('a subagent resumed after it reported back is active again', () => {
  withClaudeDir((claudeDir) => {
    const session = sessionWithAgents(claudeDir, null, (record) => {
      writeSubagent(claudeDir, record, 'resumed', agentMeta('asked for one more thing'), [
        closedTurn('r1', '2026-01-01T00:05:00.000Z'),
        promptLine('2026-01-01T00:06:00.000Z', 'one more thing please'),
      ]);
      writeSubagent(claudeDir, record, 'woken', agentMeta('woken by its own child'), [
        closedTurn('k1', '2026-01-01T00:05:00.000Z'),
        taskNotificationLine('2026-01-01T00:06:00.000Z', 'child-of-woken', 'completed'),
        openTurn('k2', '2026-01-01T00:06:30.000Z'),
      ]);
    });
    assert.deepEqual(agentStatesOf(session), { resumed: 'active', woken: 'active' });
  });
});

test('completion notifications in the session transcript do not finish an agent that is still working', () => {
  withClaudeDir((claudeDir) => {
    const sessionTranscript = [
      taskNotificationLine('2026-01-01T00:06:00.000Z', 'chatty', 'completed'),
      taskNotificationLine('2026-01-01T00:07:00.000Z', 'chatty', 'completed'),
      taskNotificationLine('2026-01-01T00:08:00.000Z', 'chatty', 'failed'),
    ];
    const session = sessionWithAgents(claudeDir, sessionTranscript, (record) => {
      writeSubagent(claudeDir, record, 'chatty', agentMeta('stops and is resumed often'), [
        closedTurn('c1', '2026-01-01T00:06:00.000Z'),
        promptLine('2026-01-01T00:08:30.000Z', 'carry on'),
        openTurn('c2', '2026-01-01T00:09:00.000Z'),
      ]);
    });
    assert.deepEqual(agentStatesOf(session), { chatty: 'active' });
  });
});

test('a nested subagent is judged by its own transcript, since nothing notifies for it', () => {
  withClaudeDir((claudeDir) => {
    const sessionTranscript = [taskNotificationLine('2026-01-01T00:06:00.000Z', 'parent', 'completed')];
    const session = sessionWithAgents(claudeDir, sessionTranscript, (record) => {
      writeSubagent(claudeDir, record, 'parent', agentMeta('the agent that was notified'), [
        closedTurn('p1', '2026-01-01T00:05:50.000Z'),
      ]);
      writeSubagent(claudeDir, record, 'nested-open', { agentType: 'Explore', description: 'child still working', toolUseId: 'toolu-nested-open', spawnDepth: 2 }, [
        openTurn('n1', '2026-01-01T00:09:00.000Z'),
      ]);
      writeSubagent(claudeDir, record, 'nested-done', { agentType: 'Explore', description: 'child that reported', toolUseId: 'toolu-nested-done', spawnDepth: 2 }, [
        closedTurn('n2', '2026-01-01T00:04:00.000Z'),
      ]);
    });
    assert.deepEqual(agentStatesOf(session), { 'nested-done': 'finished', 'nested-open': 'active', parent: 'finished' });
  });
});

test('an agent left mid tool call is finished once the session ends a turn with none pending', () => {
  withClaudeDir((claudeDir) => {
    const sessionTranscript = [
      turnDurationLine('2026-01-01T00:06:00.000Z', { pendingBackgroundAgentCount: 2 }),
      turnDurationLine('2026-01-01T00:10:00.000Z'),
    ];
    const session = sessionWithAgents(claudeDir, sessionTranscript, (record) => {
      writeSubagent(claudeDir, record, 'abandoned', agentMeta('interrupted mid tool call'), [
        openTurn('a1', '2026-01-01T00:05:00.000Z'),
      ]);
      writeSubagent(claudeDir, record, 'started-since', agentMeta('spawned after that turn'), [
        openTurn('a2', '2026-01-01T00:11:00.000Z'),
      ]);
    });
    assert.deepEqual(agentStatesOf(session), { abandoned: 'finished', 'started-since': 'active' });
  });
});

test('a session that has never reported a pending count cannot finish an open agent', () => {
  withClaudeDir((claudeDir) => {
    const sessionTranscript = [turnDurationLine('2026-01-01T00:10:00.000Z')];
    const session = sessionWithAgents(claudeDir, sessionTranscript, (record) => {
      writeSubagent(claudeDir, record, 'unknown', agentMeta('no count to go by'), [openTurn('u1', '2026-01-01T00:05:00.000Z')]);
    });
    assert.deepEqual(agentStatesOf(session), { unknown: 'active' });
  });
});

function agentMeta(description, toolUseId = `toolu-${description}`) {
  return { agentType: 'general-purpose', description, toolUseId, spawnDepth: 1 };
}

function finishedTranscript(id) {
  return [assistantLine({ id, usage: usageOf(1, 1), stopReason: 'end_turn' })];
}

function activeTranscript(id, timestamp) {
  return [assistantLine({ id, usage: usageOf(1, 1), timestamp, blocks: [toolUseBlock('Grep')] })];
}

function sessionWithAgents(claudeDir, transcriptRecords, spawnAgents) {
  const record = sessionRecord();
  writeSessionFile(claudeDir, record);
  if (transcriptRecords) {
    writeTranscript(path.join(sessionDirectoryFor(claudeDir, record), `${record.sessionId}.jsonl`), transcriptRecords);
  }
  spawnAgents(record);
  return buildWith(claudeDir).sessions[0];
}

test('task title is the description of the most recently active subagent', () => {
  withClaudeDir((claudeDir) => {
    const sessionLines = [
      aiTitleLine('Opening topic'),
      assistantLine({ id: 's1', usage: usageOf(1, 1), blocks: [toolUseBlock('Bash', { command: 'ls' })] }),
    ];
    const session = sessionWithAgents(claudeDir, sessionLines, (record) => {
      setSpawnTime(
        writeSubagent(claudeDir, record, 'older-active', agentMeta('Remove drag, restore static layout'),
          activeTranscript('a1', '2026-01-01T00:10:00.000Z')),
        NOW - 30000,
      );
      setSpawnTime(
        writeSubagent(claudeDir, record, 'quieter-active', agentMeta('Survey the session registry files'),
          activeTranscript('a2', '2026-01-01T00:02:00.000Z')),
        NOW - 20000,
      );
      setSpawnTime(
        writeSubagent(claudeDir, record, 'newest-finished', agentMeta('Already done'), finishedTranscript('f1')),
        NOW - 1000,
      );
    });
    assert.equal(session.taskTitle, 'Remove drag, restore static layout');
    assert.equal(session.taskTitleSource, 'active-agent');
    assert.equal(session.name, 'demo');
    assert.equal(session.summary, 'Running Bash');
  });
});

test('task title falls back to the most recently spawned subagent when none is active', () => {
  withClaudeDir((claudeDir) => {
    const session = sessionWithAgents(claudeDir, [aiTitleLine('Opening topic')], (record) => {
      setSpawnTime(
        writeSubagent(claudeDir, record, 'first', agentMeta('Earlier task'), finishedTranscript('f1')),
        NOW - 30000,
      );
      setSpawnTime(
        writeSubagent(claudeDir, record, 'last', agentMeta('DVIDS NARA LoC PD imagery'), finishedTranscript('f2')),
        NOW - 1000,
      );
    });
    assert.equal(session.taskTitle, 'DVIDS NARA LoC PD imagery');
    assert.equal(session.taskTitleSource, 'recent-agent');
  });
});

test('task title falls back to the latest ai-title when the session never spawned an agent', () => {
  withClaudeDir((claudeDir) => {
    const session = sessionWithAgents(
      claudeDir,
      [aiTitleLine('Harness under .claude'), promptLine('2026-01-01T00:00:05.000Z'), aiTitleLine('Sourcing image datasets')],
      () => {},
    );
    assert.equal(session.taskTitle, 'Sourcing image datasets');
    assert.equal(session.taskTitleSource, 'ai-title');
  });
});

test('task title is null when there is no subagent and no ai-title', () => {
  withClaudeDir((claudeDir) => {
    const session = sessionWithAgents(claudeDir, [promptLine('2026-01-01T00:00:05.000Z')], () => {});
    assert.equal(session.taskTitle, null);
    assert.equal(session.taskTitleSource, null);
  });
});

test('an inferred goal is reported with its source and the task title is kept beside it', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord();
    writeSessionFile(claudeDir, record);
    writeSubagent(claudeDir, record, 'one', agentMeta('Wire the goal into the snapshot'), activeTranscript('a1', '2026-01-01T00:10:00.000Z'));
    const askedFor = [];
    const build = createSnapshotBuilder({
      claudeDir,
      isAlive: () => true,
      nowMs: () => NOW,
      resolveGoal: (sessionId, agents) => {
        askedFor.push([sessionId, agents.length]);
        return 'Make the heading hold still';
      },
    });
    const [session] = build().sessions;
    assert.deepEqual(askedFor, [['session-a', 1]]);
    assert.equal(session.goal, 'Make the heading hold still');
    assert.equal(session.goalSource, 'inferred');
    assert.equal(session.taskTitle, 'Wire the goal into the snapshot');
    assert.equal(session.taskTitleSource, 'active-agent');
  });
});

test('without an inferred goal the goal source mirrors the task title fallback', () => {
  withClaudeDir((claudeDir) => {
    const session = sessionWithAgents(claudeDir, [aiTitleLine('Opening topic')], () => {});
    assert.equal(session.goal, null);
    assert.equal(session.goalSource, 'ai-title');
  });
});

test('ignores subagent files that are not agent meta files or have corrupt meta', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord();
    writeSessionFile(claudeDir, record);
    writeSubagent(claudeDir, record, 'good', { agentType: 'x', description: 'ok', toolUseId: 'toolu-good', spawnDepth: 1 }, [
      assistantLine({ id: 'g1', usage: usageOf(1, 1) }),
    ]);
    const directory = path.join(sessionDirectoryFor(claudeDir, record), record.sessionId, 'subagents');
    fs.writeFileSync(path.join(directory, 'agent-bad.meta.json'), '{oops');
    fs.writeFileSync(path.join(directory, 'agent-skill.forked-skill.marker.json'), '{}');
    const agents = buildWith(claudeDir).sessions[0].agents;
    assert.deepEqual(agents.map((agent) => agent.agentId), ['good']);
  });
});

function spawningTurn(id, timestamp, spawnedToolUseIds) {
  const blocks = spawnedToolUseIds.map((toolUseId) => ({ type: 'tool_use', id: toolUseId, name: 'Agent', input: {} }));
  return assistantLine({ id, usage: usageOf(1, 1), timestamp, blocks });
}

function spawnAgentAt(claudeDir, record, agentId, spawnedAt, transcriptRecords) {
  const meta = agentMeta(`work of ${agentId}`, `toolu-${agentId}`);
  setSpawnTime(writeSubagent(claudeDir, record, agentId, meta, transcriptRecords), spawnedAt);
}

function writeSessionPromptedAt(claudeDir, promptTimestamps, spawnAgents, status = 'busy') {
  const record = sessionRecord({ status });
  writeSessionFile(claudeDir, record);
  writeTranscript(
    path.join(sessionDirectoryFor(claudeDir, record), `${record.sessionId}.jsonl`),
    promptTimestamps.map((timestamp) => promptLine(timestamp)),
  );
  spawnAgents(record);
}

function tasksOf(claudeDir) {
  return buildWith(claudeDir).sessions[0].tasks;
}

test('tasks reproduce the worked example: a delegated agent owns one task, session helpers drive the other', () => {
  withClaudeDir((claudeDir) => {
    writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT, SECOND_PROMPT_AT], (record) => {
      spawnAgentAt(claudeDir, record, 'dev', FIRST_TASK_STARTED_AT + 1000, [
        spawningTurn('d1', '2026-01-01T00:00:12.000Z', ['toolu-implementer', 'toolu-tester']),
      ]);
      spawnAgentAt(claudeDir, record, 'implementer', FIRST_TASK_STARTED_AT + 2000, activeTranscript('i1', '2026-01-01T00:00:20.000Z'));
      spawnAgentAt(claudeDir, record, 'tester', FIRST_TASK_STARTED_AT + 3000, activeTranscript('t1', '2026-01-01T00:00:30.000Z'));
      spawnAgentAt(claudeDir, record, 'clean-code-scan', SECOND_TASK_STARTED_AT + 1000, activeTranscript('c1', '2026-01-01T00:10:20.000Z'));
      spawnAgentAt(claudeDir, record, 'rule-scan', SECOND_TASK_STARTED_AT + 2000, activeTranscript('r1', '2026-01-01T00:10:30.000Z'));
    });

    assert.deepEqual(tasksOf(claudeDir), [
      {
        taskId: `task-${FIRST_TASK_STARTED_AT}`,
        startedAt: FIRST_TASK_STARTED_AT,
        title: 'work of dev',
        titleSource: 'agent',
        main: { kind: 'agent', agentId: 'dev', state: 'active' },
        agents: [
          { agentId: 'implementer', parentAgentId: null, description: 'work of implementer', state: 'active', depth: 1 },
          { agentId: 'tester', parentAgentId: null, description: 'work of tester', state: 'active', depth: 1 },
        ],
      },
      {
        taskId: `task-${SECOND_TASK_STARTED_AT}`,
        startedAt: SECOND_TASK_STARTED_AT,
        title: 'work of clean-code-scan',
        titleSource: 'first-agent',
        main: { kind: 'session', agentId: null, state: 'active' },
        agents: [
          { agentId: 'clean-code-scan', parentAgentId: null, description: 'work of clean-code-scan', state: 'active', depth: 1 },
          { agentId: 'rule-scan', parentAgentId: null, description: 'work of rule-scan', state: 'active', depth: 1 },
        ],
      },
    ]);
  });
});

test('a task delegated to one agent is titled from its description and nests helpers at their distance from it', () => {
  withClaudeDir((claudeDir) => {
    writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT], (record) => {
      spawnAgentAt(claudeDir, record, 'planner', FIRST_TASK_STARTED_AT + 1000, [
        spawningTurn('p1', '2026-01-01T00:00:12.000Z', ['toolu-builder']),
      ]);
      spawnAgentAt(claudeDir, record, 'builder', FIRST_TASK_STARTED_AT + 2000, [
        spawningTurn('b1', '2026-01-01T00:00:14.000Z', ['toolu-reviewer']),
      ]);
      spawnAgentAt(claudeDir, record, 'reviewer', FIRST_TASK_STARTED_AT + 3000, activeTranscript('r1', '2026-01-01T00:00:20.000Z'));
    });

    const [task] = tasksOf(claudeDir);
    assert.equal(task.title, 'work of planner');
    assert.equal(task.titleSource, 'agent');
    assert.deepEqual(task.main, { kind: 'agent', agentId: 'planner', state: 'active' });
    assert.deepEqual(task.agents.map(({ agentId, parentAgentId, depth }) => ({ agentId, parentAgentId, depth })), [
      { agentId: 'builder', parentAgentId: null, depth: 1 },
      { agentId: 'reviewer', parentAgentId: 'builder', depth: 2 },
    ]);
  });
});

test('a task still builds when one agent names its parent and another carries no link at all', () => {
  withClaudeDir((claudeDir) => {
    writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT], (record) => {
      spawnAgentAt(claudeDir, record, 'dev', FIRST_TASK_STARTED_AT + 1000, [
        spawningTurn('d1', '2026-01-01T00:00:12.000Z', ['toolu-implementer']),
      ]);
      spawnAgentAt(claudeDir, record, 'implementer', FIRST_TASK_STARTED_AT + 2000, activeTranscript('i1', '2026-01-01T00:00:20.000Z'));
      setSpawnTime(
        writeSubagent(claudeDir, record, 'skill-launched',
          { agentType: 'general-purpose', description: 'launched by a skill', parentAgentId: 'dev', spawnDepth: 2 },
          activeTranscript('s1', '2026-01-01T00:00:30.000Z')),
        FIRST_TASK_STARTED_AT + 3000,
      );
      setSpawnTime(
        writeSubagent(claudeDir, record, 'linkless',
          { agentType: 'general-purpose', description: 'names no spawner', spawnDepth: 1 },
          activeTranscript('l1', '2026-01-01T00:00:40.000Z')),
        FIRST_TASK_STARTED_AT + 4000,
      );
    });

    const [task] = tasksOf(claudeDir);
    assert.deepEqual(task.main, { kind: 'session', agentId: null, state: 'active' });
    assert.deepEqual(task.agents.map(({ agentId, parentAgentId, depth }) => ({ agentId, parentAgentId, depth })), [
      { agentId: 'dev', parentAgentId: null, depth: 1 },
      { agentId: 'implementer', parentAgentId: 'dev', depth: 2 },
      { agentId: 'skill-launched', parentAgentId: 'dev', depth: 2 },
      { agentId: 'linkless', parentAgentId: null, depth: 1 },
    ]);
  });
});

test('a task the session drives itself is titled through the goal resolver', () => withClaudeDirUntilQuiet(async (claudeDir) => {
  writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT], (record) => {
    spawnAgentAt(claudeDir, record, 'clean-code-scan', FIRST_TASK_STARTED_AT + 1000, activeTranscript('c1', '2026-01-01T00:00:20.000Z'));
    spawnAgentAt(claudeDir, record, 'rule-scan', FIRST_TASK_STARTED_AT + 2000, activeTranscript('r1', '2026-01-01T00:00:30.000Z'));
  });
  const logLines = [];
  const resolver = createGoalResolver({
    cacheFile: path.join(claudeDir, 'titles.json'),
    cliPath: FAKE_CLI,
    log: (line) => logLines.push(line),
  });
  const build = createSnapshotBuilder({
    claudeDir,
    isAlive: () => true,
    nowMs: () => NOW,
    resolveTitle: resolver.resolveTitle,
  });

  const [pending] = build().sessions[0].tasks;
  assert.equal(pending.title, 'work of clean-code-scan');
  assert.equal(pending.titleSource, 'first-agent');

  await resolver.whenQuiet();
  const [titled] = build().sessions[0].tasks;
  assert.equal(titled.title, 'Build a task monitoring dashboard');
  assert.equal(titled.titleSource, 'inferred');
  assert.match(logLines[0], new RegExp(`goal for task-${FIRST_TASK_STARTED_AT} from 2 agents`));
}));

test('a task whose every agent has finished stays in the list, and only a past task is marked finished', () => {
  withClaudeDir((claudeDir) => {
    writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT, SECOND_PROMPT_AT], (record) => {
      spawnAgentAt(claudeDir, record, 'earlier', FIRST_TASK_STARTED_AT + 1000, finishedTranscript('f1'));
      spawnAgentAt(claudeDir, record, 'current', SECOND_TASK_STARTED_AT + 1000, finishedTranscript('f2'));
    });

    const tasks = tasksOf(claudeDir);
    assert.deepEqual(tasks.map((task) => [task.taskId, task.main.agentId, task.main.state]), [
      [`task-${FIRST_TASK_STARTED_AT}`, 'earlier', 'finished'],
      [`task-${SECOND_TASK_STARTED_AT}`, 'current', 'active'],
    ]);
    assert.deepEqual(tasks[0].agents, []);
  });
});

function writeTwoFinishedTasks(claudeDir, status) {
  writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT, SECOND_PROMPT_AT], (record) => {
    spawnAgentAt(claudeDir, record, 'earlier', FIRST_TASK_STARTED_AT + 1000, finishedTranscript('f1'));
    spawnAgentAt(claudeDir, record, 'latest', SECOND_TASK_STARTED_AT + 1000, finishedTranscript('f2'));
  }, status);
}

function taskStatesOf(claudeDir) {
  return tasksOf(claudeDir).map((task) => task.main.state);
}

test('an idle session finishes its most recent task once every agent in it has finished', () => {
  withClaudeDir((claudeDir) => {
    writeTwoFinishedTasks(claudeDir, 'idle');
    assert.deepEqual(taskStatesOf(claudeDir), ['finished', 'finished']);
  });
});

test('a busy session keeps working on its most recent task even once every agent in it has finished', () => {
  withClaudeDir((claudeDir) => {
    writeTwoFinishedTasks(claudeDir, 'busy');
    assert.deepEqual(taskStatesOf(claudeDir), ['finished', 'active']);
  });
});

test('a waiting session holds its most recent task active just as a busy one does', () => {
  withClaudeDir((claudeDir) => {
    writeTwoFinishedTasks(claudeDir, 'waiting');
    assert.deepEqual(taskStatesOf(claudeDir), ['finished', 'active']);
  });
});

test('an older task whose agents have all finished is finished under every session status', () => {
  for (const status of ['idle', 'busy', 'waiting']) {
    withClaudeDir((claudeDir) => {
      writeTwoFinishedTasks(claudeDir, status);
      assert.equal(taskStatesOf(claudeDir)[0], 'finished', `older task under a ${status} session`);
    });
  }
});

test('a most recent task still running an agent stays active even when the session reports idle', () => {
  withClaudeDir((claudeDir) => {
    writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT], (record) => {
      spawnAgentAt(claudeDir, record, 'still-working', FIRST_TASK_STARTED_AT + 1000, activeTranscript('s1', '2026-01-01T00:00:20.000Z'));
    }, 'idle');

    assert.deepEqual(taskStatesOf(claudeDir), ['active']);
  });
});

test('a prompt that spawned no agent becomes no task, yet the busy session working on it has left the earlier task', () => {
  withClaudeDir((claudeDir) => {
    writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT, SECOND_PROMPT_AT], (record) => {
      spawnAgentAt(claudeDir, record, 'only', FIRST_TASK_STARTED_AT + 1000, finishedTranscript('f1'));
    }, 'busy');

    const tasks = tasksOf(claudeDir);
    assert.deepEqual(tasks.map((task) => task.taskId), [`task-${FIRST_TASK_STARTED_AT}`]);
    assert.deepEqual(tasks[0].main, { kind: 'agent', agentId: 'only', state: 'finished' });
  });
});

function sessionTranscriptPath(claudeDir, record) {
  return path.join(sessionDirectoryFor(claudeDir, record), `${record.sessionId}.jsonl`);
}

function closedTurnAt(promptAt, id) {
  return [
    promptLine(promptAt),
    assistantLine({ id, usage: usageOf(1, 1), stopReason: 'end_turn', timestamp: promptAt }),
    turnDurationLine(promptAt),
  ];
}

test('a session reported busy whose own turn has closed, with every agent finished, is idle along with its task', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord({ status: 'busy' });
    writeSessionFile(claudeDir, record);
    writeTranscript(sessionTranscriptPath(claudeDir, record), closedTurnAt(FIRST_PROMPT_AT, 'm1'));
    spawnAgentAt(claudeDir, record, 'nested-parent', FIRST_TASK_STARTED_AT + 1000, finishedTranscript('f1'));

    const [session] = buildWith(claudeDir).sessions;
    assert.equal(session.status, 'idle');
    assert.equal(session.summary, 'Idle');
    assert.equal(session.currentTurnStartedAt, null);
    assert.deepEqual(session.tasks.map((task) => task.main.state), ['finished']);
  });
});

test('a session reported busy whose own turn has closed stays busy while one of its agents still works', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord({ status: 'busy' });
    writeSessionFile(claudeDir, record);
    writeTranscript(sessionTranscriptPath(claudeDir, record), closedTurnAt(FIRST_PROMPT_AT, 'm1'));
    spawnAgentAt(claudeDir, record, 'background', FIRST_TASK_STARTED_AT + 1000, activeTranscript('a1', FIRST_PROMPT_AT));

    const [session] = buildWith(claudeDir).sessions;
    assert.equal(session.status, 'busy');
    assert.deepEqual(session.tasks.map((task) => task.main.state), ['active']);
  });
});

test('a session kept busy by an earlier task\'s agent, its own turn closed, is not working on its latest task', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord({ status: 'busy' });
    writeSessionFile(claudeDir, record);
    writeTranscript(sessionTranscriptPath(claudeDir, record), [
      ...closedTurnAt(FIRST_PROMPT_AT, 'm1'),
      ...closedTurnAt(SECOND_PROMPT_AT, 'm2'),
    ]);
    spawnAgentAt(claudeDir, record, 'background', FIRST_TASK_STARTED_AT + 1000, activeTranscript('a1', FIRST_PROMPT_AT));
    spawnAgentAt(claudeDir, record, 'latest', SECOND_TASK_STARTED_AT + 1000, finishedTranscript('f1'));

    const [session] = buildWith(claudeDir).sessions;
    assert.equal(session.status, 'busy');
    assert.deepEqual(session.tasks.map((task) => task.main.state), ['active', 'finished']);
  });
});

test('the session status follows its own turn live: busy once prompted, idle once that turn closes', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord({ status: 'busy' });
    writeSessionFile(claudeDir, record);
    const transcriptFile = sessionTranscriptPath(claudeDir, record);
    writeTranscript(transcriptFile, closedTurnAt(FIRST_PROMPT_AT, 'm1'));
    spawnAgentAt(claudeDir, record, 'done', FIRST_TASK_STARTED_AT + 1000, finishedTranscript('f1'));
    const build = createSnapshotBuilder({ claudeDir, isAlive: () => true, nowMs: () => NOW });
    const statusOf = () => build().sessions[0].status;

    assert.equal(statusOf(), 'idle');
    appendToTranscript(transcriptFile, [promptLine(SECOND_PROMPT_AT)]);
    assert.equal(statusOf(), 'busy');
    appendToTranscript(transcriptFile, [assistantLine({ id: 'm2', usage: usageOf(1, 1), stopReason: 'end_turn', timestamp: SECOND_PROMPT_AT })]);
    assert.equal(statusOf(), 'idle');
  });
});

test('a task delegated to a single agent reports that agent as its box and no helpers beside it', () => {
  withClaudeDir((claudeDir) => {
    writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT], (record) => {
      spawnAgentAt(claudeDir, record, 'sole', FIRST_TASK_STARTED_AT + 1000, finishedTranscript('f1'));
    }, 'busy');

    const [task] = tasksOf(claudeDir);
    assert.deepEqual(task.main, { kind: 'agent', agentId: 'sole', state: 'active' });
    assert.deepEqual(task.agents, []);
    assert.equal(task.title, 'work of sole');
    assert.equal(task.titleSource, 'agent');
  });
});

function writeTaskWithOneInheritedHelper(claudeDir) {
  writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT, SECOND_PROMPT_AT], (record) => {
    spawnAgentAt(claudeDir, record, 'dev', FIRST_TASK_STARTED_AT + 1000, [
      spawningTurn('d1', '2026-01-01T00:00:12.000Z', ['toolu-late-helper']),
    ]);
    spawnAgentAt(claudeDir, record, 'late-helper', SECOND_TASK_STARTED_AT + 1000, activeTranscript('l1', '2026-01-01T00:10:20.000Z'));
  });
}

test('a session-driven task with one helper is titled from that helper while no title is inferred', () => {
  withClaudeDir((claudeDir) => {
    writeTaskWithOneInheritedHelper(claudeDir);
    const [, task] = tasksOf(claudeDir);
    assert.deepEqual(task.main, { kind: 'session', agentId: null, state: 'active' });
    assert.equal(task.title, 'work of late-helper');
    assert.equal(task.titleSource, 'sole-agent');
  });
});

test('an inferred title still wins over the helper descriptions it was inferred from', () => {
  withClaudeDir((claudeDir) => {
    writeTaskWithOneInheritedHelper(claudeDir);
    const build = createSnapshotBuilder({
      claudeDir,
      isAlive: () => true,
      nowMs: () => NOW,
      resolveTitle: () => 'Trim the leftover scaffolding',
    });
    const [, task] = build().sessions[0].tasks;
    assert.equal(task.title, 'Trim the leftover scaffolding');
    assert.equal(task.titleSource, 'inferred');
  });
});

test('a task asks the title resolver to infer from a single description', () => {
  withClaudeDir((claudeDir) => {
    writeTaskWithOneInheritedHelper(claudeDir);
    const requests = [];
    const build = createSnapshotBuilder({
      claudeDir,
      isAlive: () => true,
      nowMs: () => NOW,
      resolveTitle: (taskId, descriptions, options) => {
        requests.push({ taskId, descriptions, options });
        return null;
      },
    });
    build();
    assert.deepEqual(requests, [{
      taskId: `task-${SECOND_TASK_STARTED_AT}`,
      descriptions: ['work of late-helper'],
      options: { minimumDescriptions: 1 },
    }]);
  });
});

test('a task whose agents all lack a description carries no title at all', () => {
  withClaudeDir((claudeDir) => {
    writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT], (record) => {
      setSpawnTime(
        writeSubagent(claudeDir, record, 'blank-one', agentMeta('', 'toolu-blank-one'), activeTranscript('b1', '2026-01-01T00:00:20.000Z')),
        FIRST_TASK_STARTED_AT + 1000,
      );
      setSpawnTime(
        writeSubagent(claudeDir, record, 'blank-two', agentMeta('', 'toolu-blank-two'), activeTranscript('b2', '2026-01-01T00:00:30.000Z')),
        FIRST_TASK_STARTED_AT + 2000,
      );
    });

    const [task] = tasksOf(claudeDir);
    assert.deepEqual(task.main, { kind: 'session', agentId: null, state: 'active' });
    assert.equal(task.title, null);
    assert.equal(task.titleSource, null);
  });
});

test('the session keeps every field it carried before tasks were added', () => {
  withClaudeDir((claudeDir) => {
    writeSessionPromptedAt(claudeDir, [FIRST_PROMPT_AT], (record) => {
      spawnAgentAt(claudeDir, record, 'only', FIRST_TASK_STARTED_AT + 1000, activeTranscript('o1', '2026-01-01T00:00:20.000Z'));
    });

    const [session] = buildWith(claudeDir).sessions;
    assert.deepEqual(Object.keys(session), [
      'sessionId', 'pid', 'cwd', 'project', 'workspace', 'name', 'taskTitle', 'taskTitleSource', 'goal', 'goalSource',
      'status', 'waitingFor', 'statusUpdatedAt', 'startedAt', 'model', 'version', 'effort', 'gitBranch',
      'pendingBackgroundAgents', 'tokens', 'lastTurnDurationMs', 'currentTurnStartedAt', 'summary', 'agents', 'tasks',
    ]);
    assert.equal(session.taskTitle, 'work of only');
    assert.equal(session.taskTitleSource, 'active-agent');
    assert.equal(session.goal, null);
    assert.equal(session.summary, 'Starting');
    assert.equal(session.currentTurnStartedAt, FIRST_TASK_STARTED_AT);
    assert.deepEqual(session.agents.map((agent) => agent.agentId), ['only']);
    assert.equal(session.tasks.length, 1);
  });
});
