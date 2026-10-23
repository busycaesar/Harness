const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createSnapshotBuilder } = require('../lib/snapshot');
const {
  makeTempDirectory,
  removeDirectory,
  assistantLine,
  promptLine,
  toolUseBlock,
  usageOf,
  writeTranscript,
  writeSessionFile,
  sessionRecord,
  sessionDirectoryFor,
  writeSubagent,
} = require('./helpers');

const NOW = 1_000_000_000;
const SECRET_PHRASE = 'distinctive-secret-phrase';

function withClaudeDir(run) {
  const claudeDir = makeTempDirectory();
  try {
    run(claudeDir);
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

test('subagent is finished on end_turn, or after 60s without file changes, else active', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord();
    writeSessionFile(claudeDir, record);
    const usage = usageOf(1, 1);
    writeSubagent(claudeDir, record, 'ended', { agentType: 'general-purpose', description: 'done one', spawnDepth: 1 }, [
      assistantLine({ id: 'e1', usage, stopReason: 'end_turn' }),
    ]);
    writeSubagent(claudeDir, record, 'working', { agentType: 'Explore', description: 'busy one', spawnDepth: 2 }, [
      assistantLine({ id: 'w1', usage: usageOf(5, 6, 7, 8), blocks: [toolUseBlock('Grep')] }),
    ]);
    writeSubagent(claudeDir, record, 'spawning', { agentType: 'Plan', description: 'no transcript yet', spawnDepth: 1 });

    const fresh = buildWith(claudeDir, () => true, () => Date.now()).sessions[0].agents;
    const byId = Object.fromEntries(fresh.map((agent) => [agent.agentId, agent]));
    assert.equal(byId.ended.state, 'finished');
    assert.equal(byId.working.state, 'active');
    assert.equal(byId.working.summary, 'Searching code');
    assert.deepEqual(byId.working.tokens, { input: 5, output: 6, cacheRead: 7, cacheCreation: 8 });
    assert.equal(byId.working.spawnDepth, 2);
    assert.equal(byId.spawning.state, 'active');
    assert.equal(byId.spawning.lastActivityAt, null);

    const later = buildWith(claudeDir, () => true, () => Date.now() + 61000).sessions[0].agents;
    assert.ok(later.filter((agent) => agent.agentId !== 'spawning').every((agent) => agent.state === 'finished'));
  });
});

test('ignores subagent files that are not agent meta files or have corrupt meta', () => {
  withClaudeDir((claudeDir) => {
    const record = sessionRecord();
    writeSessionFile(claudeDir, record);
    writeSubagent(claudeDir, record, 'good', { agentType: 'x', description: 'ok', spawnDepth: 1 }, [
      assistantLine({ id: 'g1', usage: usageOf(1, 1) }),
    ]);
    const directory = path.join(sessionDirectoryFor(claudeDir, record), record.sessionId, 'subagents');
    fs.writeFileSync(path.join(directory, 'agent-bad.meta.json'), '{oops');
    fs.writeFileSync(path.join(directory, 'agent-skill.forked-skill.marker.json'), '{}');
    const agents = buildWith(claudeDir).sessions[0].agents;
    assert.deepEqual(agents.map((agent) => agent.agentId), ['good']);
  });
});
